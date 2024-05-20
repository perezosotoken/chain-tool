const pgp = require("pg-promise")();
const path = require("path");

var types = pgp.pg.types;
types.setTypeParser(1114, (str) => str);
 
const db = pgp({
  host: "0.0.0.0",
  user: process.env.PGUSER || "postgres",
  port: 5433,
  database: process.env.PGDATABASE || "chain",
}); 

function sql(file) {
  const fullPath = path.join(__dirname, "../sql/" + file);
  return new pgp.QueryFile(fullPath, { minify: true });
}

export { db, sql, pgp };
