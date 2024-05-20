const R = require("ramda");
const lib = require("../lib/common");
const block = require("../libexec/block");

console.log("Syncing missing blocks...");

block.syncMissing().catch((err) => {
  console.error(err);
  console.error(err.stack);
});
