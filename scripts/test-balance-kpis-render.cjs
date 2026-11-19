const {execFileSync}=require('node:child_process');const path=require('node:path');const root=path.resolve(__dirname,'..');execFileSync(path.join(root,'node_modules/.bin/esbuild'),['src/EqaimeBalanceKpis.jsx','--bundle','--platform=node','--format=cjs','--external:react','--loader:.css=empty','--outfile=.kpi-render.cjs'],{cwd:root,stdio:'pipe'});
const assert=require('node:assert/strict'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{default:Kpis,BalanceBadge,formatBalance}=require('../.kpi-render.cjs');
const g={supplierKey:'fictional',eligibleInvoiceAmount:'100.00',observedPaymentAmount:'70.00',observedDifference:'40.00',bankScopeAvailable:true,invoiceCount:2,paymentCount:1,reviewCount:0};
const html=renderToStaticMarkup(React.createElement(Kpis,{groups:[g],single:true}));
assert.equal((html.match(/class="balance-kpi(?: |")/g)||[]).length,3);assert(html.includes('-40,00'));assert(html.includes('70,00'));assert(html.includes('Долг по расчёту'));assert(html.includes('не подтверждённый долг'));
const unknown=renderToStaticMarkup(React.createElement(Kpis,{groups:[{...g,bankScopeAvailable:false,observedDifference:null}],single:true}));assert(unknown.includes('Не рассчитано'));assert(unknown.includes('Не рассчитано у 1'));
const over=renderToStaticMarkup(React.createElement(BalanceBadge,{group:{...g,observedDifference:'-30.00'}}));assert(over.includes('Переплата'));assert(over.includes('30,00'));
assert.equal(formatBalance('1010.9997'),'1 010,9997');assert.equal(formatBalance(null),'Не рассчитано');
console.log('KPI SSR: three cards, signed values, labels, unknown, raw precision PASS');

require('node:fs').unlinkSync(path.join(root,'.kpi-render.cjs'));
