import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
const commit='698b42390efa1d03b0cb170b08853f4dc842bec8'
const path='src/main.parts/part-03.jsxpart'
const expected='15cf656162938a6c57f76b47223afcbf60d3ee6d'
const origin='https://github.com/rasulovr/nms-cloud-pro.git'
export function readPinnedForecastBaseline(run=execFileSync){
  const options={encoding:'utf8',timeout:30000,maxBuffer:2*1024*1024,stdio:['ignore','pipe','pipe']}
  let content
  try{content=run('git',['show',`${commit}:${path}`],options)}catch{
    if(run('git',['remote','get-url','origin'],options).trim()!==origin)throw Error('Pinned baseline: unexpected origin')
    run('git',['fetch','--no-tags','--depth=1','origin',commit],{...options,env:{...process.env,GIT_TERMINAL_PROMPT:'0'}})
    content=run('git',['show',`${commit}:${path}`],options)
  }
  const bytes=Buffer.from(content,'utf8')
  const sha=createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')
  if(sha!==expected)throw Error('Pinned baseline: blob mismatch')
  return content
}
