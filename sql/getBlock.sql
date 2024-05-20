SELECT id,number,hash,timestamp FROM vulcan2x.block 
WHERE number < (${block})
ORDER BY number DESC
LIMIT 1;
