import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createRequire} from 'node:module'
import {build} from 'esbuild'
const require=createRequire(import.meta.url),React=require('react'),{renderToStaticMarkup}=require('react-dom/server')
const built=await build({entryPoints:['src/ProfitabilityReferenceReport.jsx'],bundle:true,platform:'node',format:'cjs',write:false,external:['react','react-dom/server'],plugins:[{name:'css-fixture',setup(b){b.onLoad({filter:/\.css(?:\?raw)?$/},()=>({contents:'export default ""',loader:'js'}))}}]})
const module={exports:{}};new Function('require','module','exports',built.outputFiles[0].text)(require,module,module.exports)
const {ProfitabilityReferenceDocument}=module.exports
const row=(month,legacy)=>({month,revenue:100,expenses:60,net:40,revenueRecords:1,categories:{salary:60},profitAvailable:true,expensesAvailable:true,calculationMode:legacy?'legacy-preliminary':'reviewed-components',coverageIssues:legacy?[{reason:'legacy-period-allocation',severity:'preliminary',detail:'Russian legacy detail'}]:[]})
const historical=row('2026-09',false),legacy=row('2026-10',true)
const section={id:'branch',name:'Test branch',reconciled:true,period:{revenue:200,expenses:120,net:null,profitAvailable:false,expensesAvailable:false},monthly:[historical,legacy],categories:[]}
// Aggregate rows have issues but no calculationMode, so test that path too.
const aggregate=structuredClone(section.monthly);delete aggregate[1].calculationMode
const model={branches:[section],total:section.period,monthly:aggregate,reconciled:true,mixedBasis:true}
const frozen=JSON.stringify(model)
for(const lang of ['ru','az']){
 const html=renderToStaticMarkup(React.createElement(ProfitabilityReferenceDocument,{model,periodLabel:'test period',lang}))
 const label=lang==='ru'?'Предварительно':'İlkin'
 assert.equal((html.match(/class="reference-preliminary-badge"/g)||[]).length,8)
 assert.equal((html.match(/class="reference-chart-status"/g)||[]).length,2)
 assert.equal((html.match(/class="reference-preliminary-inline"/g)||[]).length,2)
 assert.match(html,new RegExp(label));assert.match(html,/10\.26\*/);assert.doesNotMatch(html,/09\.26\*/)
 assert.match(html,/40,00%/);assert.match(html,/2026-09<\/th>/)
 assert.doesNotMatch(html,/Russian legacy detail/)
 if(lang==='az')assert.doesNotMatch(html,/Предварительно|Эти месяцы/)
}
assert.equal(JSON.stringify(model),frozen,'Rendering must not mutate financial model')
const source=fs.readFileSync('src/ProfitabilityReferenceReport.jsx','utf8')
assert.match(source,/renderToStaticMarkup\(<ProfitabilityReferenceDocument/,'Print must use same status-aware document')
const verifiedPeriod={revenue:100,expenses:60,net:40,profitAvailable:true,expensesAvailable:true};const onlyHistorical={...model,total:verifiedPeriod,branches:[{...section,period:verifiedPeriod,monthly:[historical]}],monthly:[historical],mixedBasis:false}
assert.doesNotMatch(renderToStaticMarkup(React.createElement(ProfitabilityReferenceDocument,{model:onlyHistorical})),/reference-preliminary-badge|reference-chart-status/)
console.log('PASS preliminary UI: RU/AZ rows, chart markers, aggregate explanations, historical values, print renderer and nonmutation')
