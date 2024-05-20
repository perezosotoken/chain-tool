SELECT s.i AS number
FROM generate_series(${from},${to}) s(i)
WHERE NOT EXISTS (
  SELECT 1 FROM vulcan2x.block  WHERE number = s.i
)
ORDER BY number DESC
LIMIT(${limit});
