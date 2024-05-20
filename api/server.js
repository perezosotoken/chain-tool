const express = require("express");
const w = require("express-async-handler");

const app = express();
const cors = require("cors");

app.use(cors());
const { getEventsByName, getEventsFiltered } = require("./lib");

app.get(
  "/api/blockchainEvents/:eventName",
  w(async (req, res) => {
    const events = await getEventsByName(req.params.eventName);
    res.json(events);
  })
);

app.get(
  "/api/blockchainEventsFiltered",
  w(async (req, res) => {
    const { eventName, fromAddress, toAddress, mostRecent } = req.query;
    let limit;
    if (req.query.limit) {
      limit = parseInt(req.query.limit, 10);
    }
    const events = await getEventsFiltered({
      eventName,
      fromAddress,
      toAddress,
      limit,
      mostRecent,
    });
    res.json(events);
  })
);

app.listen(process.env.PORT || 9031);
