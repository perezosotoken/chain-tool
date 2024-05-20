require("dotenv").config();
const web3 = require("web3");

import { db, sql } from "./db";
// import { tronWeb, tronGrid } from "./tronWeb";

const utils = require("./utils");

const a = undefined;
const b = undefined;

module.exports = {
  sql: {
    insertBlock: sql("insertBlock.sql"),
    priorBlocks: sql("priorBlocks.sql"),
    missingBlocks: sql("missingBlocks.sql"),
    insertTx: sql("insertTx.sql"),
    insertEvent: sql("insertEvent.sql"),
  },
  db,
  a,
  b,
  utils,
  web3,
  // latestBlock: utils.getCurrentBlock(),
  genBlock: process.env.DEPLOY_BLOCK || 38580550 ,
};
