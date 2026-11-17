import test from 'node:test'
import assert from 'node:assert/strict'
import {readPinnedForecastBaseline} from './lib/pinned-forecast-baseline.mjs'
const baseline=readPinnedForecastBaseline()
test('existing pinned blob needs no network',()=>{let calls=0;assert.equal(readPinnedForecastBaseline(()=>{calls++;return baseline}),baseline);assert.equal(calls,1)})
test('missing shallow blob fetches only pinned commit after exact origin validation',()=>{const calls=[];const result=readPinnedForecastBaseline((bin,args,opts)=>{calls.push(args);assert.equal(opts.timeout,30000);if(calls.length===1)throw Error('missing');if(args[0]==='remote')return 'https://github.com/rasulovr/nms-cloud-pro.git\n';if(args[0]==='fetch'){assert.deepEqual(args,['fetch','--no-tags','--depth=1','origin','698b42390efa1d03b0cb170b08853f4dc842bec8']);assert.equal(opts.env.GIT_TERMINAL_PROMPT,'0');return ''}return baseline});assert.equal(result,baseline);assert.equal(calls.length,4)})
test('unknown origin prevents fetch',()=>{let calls=0;assert.throws(()=>readPinnedForecastBaseline(()=>{calls++;if(calls===1)throw Error('missing');return 'https://example.com/other.git'}),/unexpected origin/);assert.equal(calls,2)})
test('network/timeout failure stays fatal',()=>{let calls=0;assert.throws(()=>readPinnedForecastBaseline(()=>{calls++;if(calls===1)throw Error('missing');if(calls===2)return 'https://github.com/rasulovr/nms-cloud-pro.git';throw Error('timeout')}),/timeout/);assert.equal(calls,3)})
test('wrong bytes never accepted',()=>assert.throws(()=>readPinnedForecastBaseline(()=> 'wrong content'),/blob mismatch/))
