INSERT INTO vulcan2x.block (
  id,
  number,
  hash,
  timestamp
)
VALUES (
  ${id},  
  ${number},
  ${hash},  
  to_timestamp(${timestamp}/1000)
)
ON CONFLICT (hash)
DO NOTHING