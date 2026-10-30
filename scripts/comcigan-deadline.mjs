/**
 * Bound each upstream operation; never include response data in timeout errors.
 * Late upstream completion cannot be mistaken for a valid result.
 */
export function withCollectorDeadline(operation, milliseconds=12000) {
  let timer;
  const timeout=new Promise((_,reject)=>{
    timer=setTimeout(()=>{
      const error=new Error('collector deadline exceeded');
      error.code='ETIMEDOUT';
      reject(error);
    },milliseconds);
  });
  return Promise.race([Promise.resolve().then(operation),timeout]).finally(()=>clearTimeout(timer));
}
