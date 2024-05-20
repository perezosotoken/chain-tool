SELECT id,number,hash,timestamp FROM vulcan2x.block 
WHERE number < ${block}
ORDER BY n DESC
LIMIT ${limit};
