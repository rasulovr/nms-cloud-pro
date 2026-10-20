import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import path from 'node:path'
import {createRequire} from 'node:module'
import {build} from 'esbuild'
const require=createRequire(import.meta.url)
const root=path.resolve('.test-results/analytics');await fs.mkdir(root,{recursive:true})
const source=await fs.readFile('src/main.parts/part-04.jsxpart','utf8')
const actual=source.slice(source.indexOf('  const profitabilityRows ='),source.indexOf('  const ReportsProfitabilityView ='))
const entry=`import React,{useMemo,useState} from 'react';import {renderToStaticMarkup} from 'react-dom/server';import ProfitabilityBankReport from '../../src/ProfitabilityBankReport.jsx';export function Analytics({report}){const rmsProfitabilityReport=report;const parseNum=v=>Number(v)||0,fmt=v=>parseNum(v).toFixed(2),pct=v=>fmt(v)+'%';const[profitabilityMetric,setProfitabilityMetric]=useState('net');const[expandedProfitabilityBranches,setExpandedProfitabilityBranches]=useState(new Set());const[expandedProfitabilityExpenseGroups,setExpandedProfitabilityExpenseGroups]=useState(new Set());${actual}return ReportsProfitabilityAnalytics;}export function Composite({report,periodKey=report.periodKey}){return <ProfitabilityBankReport report={report} periodKey={periodKey} branches={[]} onPeriodChange={()=>{}}><Analytics report={report}/></ProfitabilityBankReport>}export const render=(report,key)=>renderToStaticMarkup(<Composite report={report} periodKey={key}/>);`
await fs.writeFile(path.join(root,'entry.jsx'),entry)
await build({entryPoints:[path.join(root,'entry.jsx')],outfile:path.join(root,'render.cjs'),bundle:true,platform:'node',format:'cjs',external:['react','react-dom/server'],plugins:[{name:'css',setup(b){b.onLoad({filter:/\.css(?:\?raw)?$/},()=>({contents:'',loader:'text'}))}}]})
const {render,Analytics}=require(path.join(root,'render.cjs'))
const row=(id,revenue,net)=>({id,name:id,revenue,net,totalExpenses:revenue-net,margin:net/revenue*100,expenseCategories:[]})
const report={periodKey:'range:2026-05:2026-05',period:{from:'2026-05-01',toExclusive:'2026-06-01'},periodLabel:'2026-05',rows:[row('BC4',100,20),row('BC5',200,30)],totals:{revenue:300,totalExpenses:250,net:50,branches:2}}
const before=structuredClone(report),html=render(report)
for(const text of ['Сравнение филиалов','Детальная рентабельность филиалов','BC4','BC5','100.00','200.00','300.00','Начало: год'])assert.ok(html.includes(text),text)
assert.ok(html.indexOf('bank-controls')<html.indexOf('aria-label="Аналитика RMS'))
assert.ok(!render({...report,loading:true}).includes('Детальная рентабельность филиалов'))
assert.ok(!render({...report,error:'Synthetic error'}).includes('Детальная рентабельность филиалов'))
assert.ok(!render(report,'range:2026-06:2026-06').includes('Детальная рентабельность филиалов'))
assert.deepEqual(report,before)
const one=render({...report,rows:[report.rows[0]],totals:{revenue:100,net:20,branches:1}})
assert.ok(one.includes('BC4'));assert.ok(!one.includes('<b>BC5</b>'))
if(process.env.REACT_TEST_MODULE){
 const React=require('react'),R=require(process.env.REACT_TEST_MODULE);let tree;await R.act(async()=>{tree=R.create(React.createElement(Analytics,{report}))})
 const order=()=>tree.root.findAllByProps({className:'reports-v417-bar-row'}).map(x=>x.findByType('b').children.join(''))
 assert.deepEqual(order(),['BC5','BC4']);await R.act(async()=>tree.root.findAllByType('button').find(x=>x.children.join('')==='Выручка').props.onClick());assert.deepEqual(order(),['BC5','BC4'])
 await R.act(async()=>tree.root.findAllByType('button').find(x=>x.children.join('')==='Маржа').props.onClick());assert.deepEqual(order(),['BC4','BC5'])
 await R.act(async()=>tree.root.findAllByType('button').find(x=>x.children.join('')==='Состав').props.onClick());assert.ok(tree.root.findAllByProps({className:'reports-v417-detail'}).length)
 await R.act(async()=>tree.update(React.createElement(Analytics,{report:{...report,rows:[report.rows[0]]}})));assert.deepEqual(order(),['BC4']);tree.unmount()
}
console.log('PASS real analytics JSX: branch values, comparison metrics, detail expansion, filtered rows, controls order, loading/error/stale guard, immutable inputs; bank export isolated by separate component.')
