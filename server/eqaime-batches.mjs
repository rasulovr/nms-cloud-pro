export async function readBatches(batches, fetchBatch, {signal,maxRows=10000,concurrency=3}={}){
  if(!Number.isInteger(concurrency)||concurrency<1||concurrency>3)throw Error('Invalid read concurrency')
  if(signal?.aborted)throw Error('Read aborted')
  const controller=new AbortController(),forwardAbort=()=>controller.abort()
  signal?.addEventListener('abort',forwardAbort,{once:true})
  const output=new Array(batches.length)
  let cursor=0,total=0,completed=0,failure=null
  const worker=async()=>{
    while(cursor<batches.length && !failure && !controller.signal.aborted){
      const index=cursor++
      try{
        const rows=await fetchBatch(batches[index],controller.signal)
        if(controller.signal.aborted)throw Error('Read aborted')
        if(!Array.isArray(rows))throw Error('Incomplete read')
        total+=rows.length
        if(total>maxRows)throw Error('Read row limit')
        output[index]=rows
        completed++
      }catch(error){if(!failure)failure=error;controller.abort()}
    }
  }
  try{
    await Promise.all(Array.from({length:Math.min(concurrency,batches.length)},worker))
    if(failure)throw failure
    if(controller.signal.aborted||completed!==batches.length)throw Error('Read aborted')
    return output.flat()
  }finally{signal?.removeEventListener('abort',forwardAbort);controller.abort()}
}
