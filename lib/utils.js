import BigNumber from "bignumber.js";
import { tronWeb } from "./tronWeb";
import { getDefaultProvider, ethers } from "ethers";

const w3utils = require("web3-utils");
const provider = getDefaultProvider('https://bsc-dataseed1.ninicoin.io');

const stringToBytes32 = (key) => w3utils.rightPad(w3utils.asciiToHex(key), 64);

const loadContract = async (address) => await ethers.getContractAt("IERC20", address);  

//const getEvents = async (a, e, n) =>
//  await tronGrid.contract.getEvents(a, { event_name: e, block_number: n });

const lastBlockNumber = () => provider.getBlockNumber();

const getCurrentBlock = async () => {
  const blockNumber = lastBlockNumber();
  const block = await provider.getBlock(blockNumber);
  // console.log("block", block);
  
  return  block;
}

const wad = (uint) => new BigNumber(uint).dividedBy(`1e18`).toNumber();

const ray = (uint) => new BigNumber(uint).dividedBy(`1e27`).toNumber();

const formatDate = (date) => {
  var d = new Date(date),
    month = "" + (d.getMonth() + 1),
    day = "" + d.getDate(),
    year = d.getFullYear();

  if (month.length < 2) month = "0" + month;
  if (day.length < 2) day = "0" + day;

  return [year, month, day].join("-");
};

const capitalize = (s) => {
  if (typeof s !== "string") return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

module.exports = {
  w3utils,
  opts: {
    fee_limit: 1000000000,
    shouldPollResponse: true,
    callValue: 0,
    from: "0x0",
  },
  latestBlock: getCurrentBlock(),
  stringToBytes32,
  loadContract,
  //getEvents,
  getCurrentBlock,
  wad,
  ray,
  capitalize,
  formatDate,
};
