const TronWeb = require("tronweb");
const TronGrid = require("trongrid");

// const apiURL =
//   process.env.TRON_NETWORK === "shasta"
//     ? "https://api.shasta.trongrid.io"
//     : "https://tron.domain.io";

const HttpProvider = TronWeb.providers.HttpProvider;
// const fullNode = new HttpProvider(apiURL);
// const solidityNode = new HttpProvider(apiURL);

const tronWeb = undefined;
// new TronWeb(
//   fullNode,
//   solidityNode,
//   apiURL,
//   process.env.PRIVATE_KEY
// );
const tronGrid = undefined; //new TronGrid(tronWeb);

export { tronWeb, tronGrid };
