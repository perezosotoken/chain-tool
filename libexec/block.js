const R = require("ramda");
const common = require("../lib/common");
const {ethers, getDefaultProvider} = require("ethers");
const chalk = require("chalk");
const BN = require('bignumber.js');

// const { tronWeb } = require("../lib/tronWeb");

const retry = require("promise-retry");
const concurrency = 15;

const { db } = common;
const provider = getDefaultProvider(process.env.PROVIDER_URL);
// const provider = getDefaultProvider('https://bsc-dataseed1.ninicoin.io');

const flatten = (acc, subarr) => acc.concat(subarr);

const getAllEventsFromABI = (abi) => {
  return abi
      .filter(item => item.type === "event")
      .map(event => {
          const signature = `${event.name}(${event.inputs.map(input => input.type).join(',')})`;
          const abiSignature = `event ${event.name}(${event.inputs.map(input => `${input.type}${input.indexed ? " indexed" : ""} ${input.name}`).join(', ')})`;
          const signatureHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(signature)).substr(2); 
          
          return { ...event, signature, signatureHash, abiSignature };
      });
};

const artifact = require("../abi/StakingRewards.json");
const allEvents = getAllEventsFromABI(artifact.abi);

//  getAllEvents(network).filter((event) => {
//   return event.name !== "RatesUpdated";
// });

const allContractAddresses = ["0x1FbDB5c46F6a33eC22a7AF990518Ed4610864b2c"];// getAllContractAddresses(network);

const insertBlock = async (_block) => {
  const id = _block.number;
  const number = id;
  const hash = _block.hash;
  const timestamp = _block.timestamp  *1000;
  const block = { id, number, hash, timestamp };
  await common.db.none(common.sql.insertBlock, block);
};

const insertTx = async (tx) => {
  
  const toAddress = tx.to || "0x";
  const txID = tx.hash;
  const block = tx.blockNumber;
  const fromAddress = tx.from;
  const value = tx.value.toNumber();

  const data = tx.data;
  const txData = { txID, toAddress, fromAddress, block, value, data, txType: "" };

  await common.db.none(common.sql.insertTx, { tx: txData });
  return tx;
};

const insertEvent = async (event) => {
  console.log(event)
  await common.db.none(common.sql.insertEvent, { o: event });
};

export const sync = async (n) => {
  let txs;
  let block;
  let txWithLogs;
  const filteredTopics = allEvents.map((event) => `0x` + event.signatureHash);

  // console.log(filteredTopics)
  try {
    // block = await common.tronWeb.trx.getBlock(n);
    block = await provider.getBlock(n);
    
    console.log(`block ${n} has ${block.transactions.length} transactions`);
  
    txs =  await Promise.all(block.transactions.map(async (tx)=> {
	    return await provider.getTransaction(tx);
	  }));
    } catch (err) {
    if (typeof err === "string") {
      err = new Error(err);
    }

    console.error(err);
    console.log(chalk.red(`failed getting txs for block ${n}, retrying!`));
    return sync(n);
  }

  // filter txs so that we only look at those that trigger synthetix smart contracts
  txs = txs.filter((tx) => {
    let txAddress
    if (tx != null) {
      
      txAddress = tx.to;
    //  console.log(`${allContractAddresses[0]} == ${tx.to}`)
    } else {
      return false;
    }
    // console.log(`Address found in txs ${allContractAddresses.includes(txAddress) ? chalk.green('true') : chalk.red('false')}`)
    return allContractAddresses.includes(txAddress);
  });

	if (txs.length) {

		console.log(`${chalk.green("Found")} Perezoso smart contract calls!`);
	}

  if (txs.length) {
    console.log(
      `found ${txs.length} transactions with filtered topics, block ${chalk.gray(`#${n}`)}`
    );
  }

  await insertBlock(block);
  await Promise.all(
    txs.map(async (tx) => {

	    const txReceipt = await provider.getTransactionReceipt(tx.hash);

      await insertTx(tx);
      //console.log(`tronTx ${tronTx} tx ${tx}`);
      // address that created the transaction
      const address = tx.from;

      const events = txReceipt.logs.map((log) => {
        
        const event = {};

        //console.log(log)
        event.block_id = log.blockNumber;
        event.data_hex = log.data;
        event.log_index = log.logIndex;
        event.address = log.address;
        event.notIndex = false;

        // TODO!
        event.to_address = address;
        event.topics = log.topics.join(",");

         
        event.tx_hash = tx.hash;
        event.tx_id = event.tx_hash; // tronTx.transactionHash || log.transactionHash || "0x";
        
        const abi = allEvents.find((source) =>  {
          console.log(`Searching for ${source.signatureHash} in ${log.topics}`);

          return event.topics.includes(`0x${source.signatureHash}`)
        });
 
        event.data_hex = log.data;

        if (typeof abi === "undefined") {
          event.notIndex = true;
          return event;
        }

        // web3 has a bug when decoding logs with indexed params... so we use ethers JS
        try {
          const iface = new ethers.utils.Interface([abi.abiSignature]);
          const eventDescription = iface.parseLog({
                data: log.data,
                topics: log.topics,
                logIndex: log.logIndex,
              });
          event.data = {...eventDescription.args};
           
		/*
          const iface = new ethers.utils.Interface([abi.abiSignature]);
          const eventDescription = iface.parseLog({
            data: `${log.data}`,
            topics: log.topics.map((t) => `${t}`),
            logIndex: log.logIndex,
          });
  
          //console.log({eventDescription})
          event.data = eventDescription.args;
		*/
          event.event_name = abi.name;

        } catch (err) {
          console.log(err)
          event.notIndex = true;
          return event;        
        }

        //console.log(event)
        return event;
      });
      console.log(events);

      await Promise.all(events.map(async (event) => {
        if (!event.notIndex) {
          //console.log(event)
          await insertEvent(event)
        } 
      }));
    
      })
  );
};
const getTransactionInfo = async (txID) => {
  const getTxInfo = async () => {
    const txInfo = await provider.getTransactionReceipt(txID); //common.tronWeb.trx.getTransactionInfo(txID);
    /**
     * If we query a very recently mined transaction ID from the Tron node, it
     * sometimes returns an empty object.
     *
     */

    if (!Object.keys(txInfo).length) {
      throw new Error("getTxInfoEmptyObject");
    }
    //console.dir(txInfo, { depth: null })
    return txInfo;
  };


  return retry(
    async (retry, number) => {
      try {
        return await getTxInfo();
      } catch (err) {
        //console.log(err);
        if (err.message == "getTxInfoEmptyObject") {
          return retry();
        }
        throw err;
      }
    },
    { retries: 10000 }
  );
};

const getTransactions = async (block, filteredTopics) => {
  
  const transactions = block.transactions || [];
 // console.log(transactions)
  const allTxs = await Promise.all(
    transactions.map((tx) => getTransactionInfo(tx))
  );
   
  let r = false
  const txs = allTxs
    // sometimes getTransactionInfo returns empty objects (on reverted transactions?)
    .filter((tx) => !!Object.keys(tx).length)
    .map((tx) => {
       
      return { log: [], ...tx };
    })
    .map((tx) => ({
      ...tx,
      log: tx.logs.filter((event) => {
        if (!filteredTopics) return true;
        if (typeof event.topics !== 'undefined') {
          r = event.topics.some((topic) => {
            //console.log(`topic is ${topic} included : ${filteredTopics.includes(topic)}`)
            return filteredTopics.includes(topic) 
          })

        }
        return r;
      }),
    }))
    .filter((tx) => {
      if (!filteredTopics) return true;
      return tx.log.length;
    });
    //console.log({txs})
  return txs;
};

const getLastSeenBlockNumber = async () => {
  console.log(`Executing getLastSeenBlockNumber`)

  const rows = await db.query(
    `
      select
        number
      from vulcan2x.block
      order by number DESC
      limit 1
    `
  );

  console.log("rows", rows);

  if (!rows.length) {
    console.log("genBlock", common.genBlock);
    return parseInt(common.genBlock, 10);
  }
  const [lastSeenBlock] = rows;
  return lastSeenBlock.number;
};

// highest block number of tron node
const getHighestBlockNumber = async () => {
  //const res = await tronWeb.trx.getCurrentBlock();
  //return res.block_header.raw_data.number;
  const res = await provider.getBlockNumber();
  console.log(provider)
  return res;
};

// [start, end[
function* makeRangeIterator(start, end, step = 1) {
  let iterationCount = 0;
  for (let i = start; i < end; i += step) {
    iterationCount++;
    yield i;
  }
  return iterationCount;
}

/**
 * const arr = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
 * console.log(...chunks(arr, 3));
 * =>
 * [ [ 'a', 'b', 'c' ], [ 'd', 'e', 'f' ], [ 'g', 'h', 'i' ], [ 'j' ] ]
 */
function* chunks(it, size) {
  let chunk = [];
  for (let n of it) {
    chunk.push(n);
    if (chunk.length === size) {
      yield chunk;
      chunk = [];
    }
  }
  if (chunk.length) yield chunk;
}

export const syncMissing = async (from) => {
  const lastSeenBlockNumber = from || (await getLastSeenBlockNumber());
  console.log(`lastSeenBlockNumber: ${lastSeenBlockNumber}`)

  const highestBlockNumber = await getHighestBlockNumber();

  const missingBlockNumbers = makeRangeIterator(
    lastSeenBlockNumber + 1,
    highestBlockNumber + 1
  );

  const missingBlockNumbersChunks = chunks(missingBlockNumbers, concurrency);

  console.log({
    lastSeenBlockNumber,
    highestBlockNumber,
    missingBlockNumbers,
    missingBlockNumbersChunks,
  });

  for (let chunk of missingBlockNumbersChunks) {
    if (chunk.length > 1) {
      console.log(`Syncing chunk ${chunk[0]}-${chunk[chunk.length - 1]}`);
    } else {
      console.log(`Syncing single block ${chunk[0]}`);
    }
    const promises = chunk.map(async (blockNumber) => {
      try {
        await sync(blockNumber);
      } catch (err) {
        console.error(`Error syncing block ${blockNumber}`);
        console.error(err);
        throw err;
      }
    });
    await Promise.all(promises);
  }

  // Done syncing! Wait a second, and sync again in case there is a new block
  setTimeout(() => {
    syncMissing();
  }, 1500);
};
