import { readFileSync } from 'node:fs'
import { transformSync } from 'esbuild'
import vm from 'node:vm'
import assert from 'node:assert/strict'
const source = readFileSync('src/main.parts/part-03.jsxpart','utf8')
const code = transformSync(source.slice(source.indexOf('function DailyRevenueLineChart('),source.indexOf('function MonthlySalesLineChart(')),{loader:'jsx',format:'cjs'}).code
let states=[], cursor=0, effects=[], refs=[], refCursor=0, id=0
const React={useId:()=>`chart${id}`, createElement:(type,props,...children)=> typeof type==='function'?type({...props,children}):({type,props:props||{},children:children.flat(Infinity)}),Fragment:'fragment'}
let resizeCallback,disconnected=false
const context={React,parseNum:n=>Number(n)||0,fmt:n=>(Number(n)||0).toFixed(2),useState:initial=>{const i=cursor++; if(!(i in states))states[i]=initial;return [states[i],value=>states[i]=value]},useRef:initial=>refs[refCursor++]|| (refs[refCursor-1]={current:initial}),useEffect:fn=>effects.push(fn),ResizeObserver:class{constructor(fn){resizeCallback=fn}observe(){}disconnect(){disconnected=true}}}
vm.createContext(context);vm.runInContext(code+'\nthis.Chart=DailyRevenueLineChart',context)
const rows=Array.from({length:31},(_,i)=>({date:`2026-10-${String(i+1).padStart(2,'0')}`,day:String(i+1),amount:1000+i*100.25}))
function render(props={}){cursor=0;refCursor=0;effects=[];return context.Chart({rows,...props})}
function all(node,predicate){if(!node||typeof node!=='object')return [];return [...(predicate(node)?[node]:[]),...(node.children||[]).flatMap(n=>all(n,predicate))]}
const find=(tree,className)=>all(tree,n=>n.props.className===className)[0]
const text=n=>typeof n==='object'?(n?.children||[]).map(text).join(''):String(n??'')
let tree=render();assert.equal(find(tree,'finance-line-chart-svg').props.viewBox,'0 0 320 260');assert.match(text(find(tree,'revenue-chart-selection')),/31 октября4007.50 AZN/)
assert.equal(all(tree,n=>n.type==='tbody')[0].children.length,31)
assert.ok(all(tree,n=>n.props.className==='finance-line-chart-x-label').length<=6)
find(tree,'finance-line-chart-svg').props.onPointerDown({clientX:44,currentTarget:{getBoundingClientRect:()=>({left:0,width:320})}})
tree=render();assert.match(text(find(tree,'revenue-chart-selection')),/1 октября1000.00 AZN/)
all(tree,n=>n.type==='input')[0].props.onChange({target:{value:'15'}})
tree=render();assert.match(text(find(tree,'revenue-chart-selection')),/16 октября2503.75 AZN/)
let measuredWidth=280;refs[0].current={getBoundingClientRect:()=>({width:measuredWidth})};const cleanup=effects[0]();tree=render();assert.equal(find(tree,'finance-line-chart-svg').props.viewBox,'0 0 280 260')
measuredWidth=900;resizeCallback();tree=render();assert.equal(find(tree,'finance-line-chart-svg').props.viewBox,'0 0 900 260');cleanup();assert.equal(disconnected,true)
const area=find(tree,'finance-line-chart-area');assert.equal(area.props.style['--revenue-chart-fill'],'url(#chart0-financeDailyRevenueGradient)')
id=1;tree=render();assert.equal(find(tree,'finance-line-chart-area').props.style['--revenue-chart-fill'],'url(#chart1-financeDailyRevenueGradient)')
tree=render({rows:[{date:'2026-11-01',day:'1',amount:42.99}]});assert.match(text(find(tree,'revenue-chart-selection')),/1 ноября42.99 AZN/);assert.equal(all(tree,n=>n.type==='input').length,0)
tree=render({rows:[]});assert.equal(all(tree,n=>n.type==='svg').length,0);assert.ok(find(tree,'revenue-chart-plot-frame'))
tree=render({rows:[{day:'2026-10',amount:5000},{day:'2026-11',amount:7000}],mode:'monthly'});assert.match(text(find(tree,'revenue-chart-selection')),/11\/267000.00 AZN/);assert.equal(all(tree,n=>n.props.className==='finance-line-chart-average').length,0)
console.log('PASS mobile revenue chart: responsive width, readable axis density, pointer/slider, precise table, changing period, empty/single rows, monthly mode and unique gradient ids')
