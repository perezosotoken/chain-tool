const fs = require('fs');
const common = require("../lib/common");
const { providers, Contract, BigNumber, utils } = require('ethers'); 
const { formatNumber, commify } = require("../utils"); 
const { isAddress, parseEther, formatEther } = utils;

const { db } = common;

const artifact = require("../StakingRewards.json");

const contractAddress = '0x1fbdb5c46f6a33ec22a7af990518ed4610864b2c';
const provider = new providers.JsonRpcProvider(process.env.PROVIDER_URL);

let globalTotalEarned = BigNumber.from(0); 

async function fetchRawData() {
  const query = `SELECT data FROM extracted.logs;`;
  try {
    let results = await db.any(query);
    return results;
  } catch (error) {
    console.error('Error fetching data:', error);
    return [];
  }
}

function aggregateData(rawData) {
  const stakesByAddress = {};
  rawData.forEach(row => {
    try {
      const data = JSON.parse(row.data);
      const address = data.user;
      if (!address) {
        console.error('Missing user address for row:', row);
        return;
      }
      if (!stakesByAddress[address]) {
        stakesByAddress[address] = { address, stakes: [], rewardPaid: BigInt(0) };
      }
      if (data.amount && data.amount.hex && data.lockPeriod && data.lockPeriod.hex) {
        const amount = BigInt(data.amount.hex);
        const lockTime = parseInt(data.lockPeriod.hex, 16);
        let stakeEntry = stakesByAddress[address].stakes.find(stake => stake.lockTime === lockTime);
        if (!stakeEntry) {
          stakeEntry = { totalStaked: BigInt(0), lockTime };
          stakesByAddress[address].stakes.push(stakeEntry);
        }
        stakeEntry.totalStaked += amount;
      } else if (data.reward && data.reward.hex) {
        const reward = BigInt(data.reward.hex);
        stakesByAddress[address].rewardPaid += reward;
      }
    } catch (err) {
      console.error('Error parsing data for row:', row, err);
    }
  });
  return Object.values(stakesByAddress).map(item => ({
    address: item.address,
    stakes: item.stakes.map(stake => ({
      totalStaked: stake.totalStaked.toString(),
      lockTime: stake.lockTime
    })),
    rewardPaid: item.rewardPaid.toString()
  }));
}

async function fetchRewards(aggregatedData) {
  const contract = new Contract(contractAddress, artifact.abi, provider);

  async function processBatch(batch) {
    const promises = batch.map(async entry => {
      let entryTotalEarned = BigNumber.from(0); // Initialize total earned for the entry
      for (let index = 0; index < entry.stakes.length; index++) {
        const stake = entry.stakes[index];
        try {
          console.log(`Fetching earned on stake for ${entry.address} at index ${index}`);
          const earned = await contract.earnedOnStake(entry.address, index);
          stake.totalEarnedPerStake = earned.toString();
          globalTotalEarned = globalTotalEarned.add(earned); // Global accumulator
          entryTotalEarned = entryTotalEarned.add(earned); // Entry-specific accumulator
          console.log(`Total earned per stake for ${entry.address} at index ${index}: ${formatNumber(Number(formatEther(earned)))} PRZS`);
        } catch (error) {
          console.error(`Failed to fetch earned on stake for ${entry.address} at index ${index}:`, error);
          stake.totalEarnedPerStake = '0';
        }
      }
      entry.totalEarned = entryTotalEarned.toString(); // Assign accumulated total earned to entry
    });

    await Promise.all(promises);
  }

  const batchSize = 25;
  for (let i = 0; i < aggregatedData.length; i += batchSize) {
    const batch = aggregatedData.slice(i, i + batchSize);
    await processBatch(batch);
  }
} 

function calculateSummaryStats(aggregatedData) {
  const summaryStats = {
    totalStakedPerLockTime: {},
    totalRewardsDistributed: BigNumber.from(0),
    totalEarnedAcrossAllStakes: BigNumber.from(0),
    totalStakedAcrossAllStakes: BigNumber.from(0),
    totalEarnedPerStake: {},
    totalEarnedPerLockTime: {}  // Added for tracking earned amounts per lock time
  };

  aggregatedData.forEach(entry => {
    entry.stakes.forEach(stake => {
      const days = Math.round(stake.lockTime / 86400).toString();  // Convert lockTime in seconds to days
      // Initialize keys if they do not exist
      if (!summaryStats.totalStakedPerLockTime[days]) {
        summaryStats.totalStakedPerLockTime[days] = BigNumber.from(0);
        summaryStats.totalEarnedPerLockTime[days] = BigNumber.from(0);  // Initialize for earned amounts
      }
      // Accumulate total staked and earned amounts for each lock time
      summaryStats.totalStakedPerLockTime[days] = summaryStats.totalStakedPerLockTime[days].add(BigNumber.from(stake.totalStaked));
      summaryStats.totalEarnedPerLockTime[days] = summaryStats.totalEarnedPerLockTime[days].add(BigNumber.from(stake.totalEarnedPerStake));

      summaryStats.totalStakedAcrossAllStakes = summaryStats.totalStakedAcrossAllStakes.add(BigNumber.from(stake.totalStaked));
      summaryStats.totalEarnedAcrossAllStakes = summaryStats.totalEarnedAcrossAllStakes.add(BigNumber.from(stake.totalEarnedPerStake));
    });
    summaryStats.totalRewardsDistributed = summaryStats.totalRewardsDistributed.add(BigNumber.from(entry.rewardPaid));
  });

  // Prepare fields for output
  Object.keys(summaryStats.totalStakedPerLockTime).forEach(lockTime => {
    summaryStats.totalStakedPerLockTime[lockTime] = summaryStats.totalStakedPerLockTime[lockTime].toString();
    summaryStats.totalEarnedPerLockTime[lockTime] = summaryStats.totalEarnedPerLockTime[lockTime].toString();  // Convert earned amounts to string
  });
  
  summaryStats.totalRewardsDistributed = summaryStats.totalRewardsDistributed.toString();
  summaryStats.totalEarnedAcrossAllStakes = summaryStats.totalEarnedAcrossAllStakes.toString();
  summaryStats.totalStakedAcrossAllStakes = summaryStats.totalStakedAcrossAllStakes.toString();

  return summaryStats;
}


function countUniqueAddresses(aggregatedData) {
  const uniqueAddresses = new Set();

  aggregatedData.forEach(item => {
    uniqueAddresses.add(item.address);
  });

  return uniqueAddresses.size;  // Returns the count of unique addresses
}


async function formatAndSaveData() {
  const rawData = await fetchRawData();
  const aggregatedData = aggregateData(rawData);
  
  await fetchRewards(aggregatedData);

  const uniqueAddressCount = countUniqueAddresses(aggregatedData);
  const summaryStats = calculateSummaryStats(aggregatedData);

  console.log(`Total unique addresses: ${uniqueAddressCount}`);
  console.log('Total staked per lock time:');

  Object.keys(summaryStats.totalStakedPerLockTime).forEach(lockTime => {
    console.log(`${lockTime} days: ${formatNumber(Number(formatEther(summaryStats.totalStakedPerLockTime[lockTime])))} PRZS`);
  });
  
  console.log(`Total staked across all stakes: ${formatNumber(Number(formatEther(summaryStats.totalStakedAcrossAllStakes)))} PRZS`);
  console.log(`Total earned across all stakes: ${formatNumber(Number(formatEther(globalTotalEarned)))} PRZS`);
  console.log(`Total rewards distributed: ${formatNumber(Number(formatEther(summaryStats.totalRewardsDistributed)))} PRZS`);
  
  fs.writeFile('summaryStats.json', JSON.stringify(summaryStats, null, 2), (err) => {
    if (err) {
      console.log(err);
    } else {
      console.log('Summary stats saved!');
    }
  });
  fs.writeFile('output.json', JSON.stringify(aggregatedData, null, 2), (err) => {
    if (err) {
      console.log(err);
    } else {
      console.log('Detailed data saved!');
    }
  });
}


formatAndSaveData();
