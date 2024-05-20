INSERT INTO vulcan2x.transaction (
  hash,
  to_address,
  from_address,
  block_id,
  value,
  tx_type,
  data
)
VALUES (
  ${tx.txID},
  ${tx.toAddress},
  ${tx.fromAddress},
  ${tx.block},
  ${tx.value},
  ${tx.txType},
  ${tx.data}
)
ON CONFLICT (hash)
DO NOTHING