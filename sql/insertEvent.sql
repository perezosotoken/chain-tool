INSERT INTO extracted.logs (
  block_id,
  log_index,
  address,
  to_address,
  data_hex,
  data,
  topics,
  tx_id,
  event_name
)
VALUES (
  ${o.block_id},
  ${o.log_index},
  ${o.address},
  ${o.to_address},
  ${o.data_hex},
  ${o.data},
  ${o.topics},
  (select id from vulcan2x.transaction where hash=${o.tx_hash}),
  ${o.event_name}
)
