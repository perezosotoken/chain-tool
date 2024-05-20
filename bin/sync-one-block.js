const R = require("ramda");
const lib = require("../lib/common");
const block = require("../libexec/block");

// const n = 2884849
// const n = 9796748;
// const n = 3426531;
// const n = 3431739;
const n = 3435159;
console.log(`Syncing block ${n}...`);

block.sync(n).catch((err) => {
  console.error(err);
  console.error(err.stack);
});
