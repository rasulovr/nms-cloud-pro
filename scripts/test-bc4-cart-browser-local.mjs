import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const port=49371, origin='http://127.0.0.1:'+port;
const server=spawn('node',['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser;
try {
 for(let n=0;n<40;n++){try{if((await fetch(origin)).ok)break}catch{}await new Promise(r=>setTimeout(r,150))}
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[], writes=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',req=>{
  if(!req.request().url().startsWith(origin)){
   if(req.request().resourceType()!=='image') writes.push(req.request().url());
   return req.abort();
  }
  return req.continue();
 });
 await page.goto(origin+'/qr-menu?branch=BC4&table=1&lang=ru');
 const bowl=page.locator('article').filter({has:page.getByRole('heading',{name:'Боул',exact:true})});
 const select=bowl.getByRole('combobox');
 await select.waitFor();
 assert.equal(await page.locator('.bc4only article').count(),180);
 assert.equal(await page.locator('.bc4only > section').count(),26);
 assert.equal(await bowl.getByRole('button').isDisabled(),true);
 const choices=await select.locator('option').evaluateAll(os=>os.slice(1).map(o=>({label:o.textContent, value:o.value})));
 assert.deepEqual(choices.map(o=>Number(o.label.match(/([0-9]+)[,.]([0-9]{2})/).slice(1).join(''))).sort((a,b)=>a-b),[1390,1990,2080,2180,2190]);
 for(const c of choices){await select.selectOption(c.value);await bowl.getByRole('button').click()}
 await page.locator('.bc4only footer button').click();
 assert.equal(await page.locator('.bc4-lines li').count(),5);
 assert.match(await page.locator('.bc4only section p').last().innerText(),/98[,.]30/);
 assert.equal(await page.getByText('Корзина для расчёта суммы. Заказ не отправляется. Сервисный сбор Clopos (10%) не включён.').count(),1);
 await page.getByRole('button',{name:'EN',exact:true}).click();
 assert.equal(await page.getByRole('heading',{name:'Cart',exact:true}).count(),1);
 await page.getByRole('button',{name:'AZ',exact:true}).click();
 assert.equal(await page.getByRole('heading',{name:'Səbət',exact:true}).count(),1);
 await page.getByRole('button',{name:'Artır'}).first().click();
 assert.match(await page.locator('.bc4only section p').last().innerText(),/118[,.]20/);
 assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);
 console.log('PASS localhost built BC4 guest cart UI, mobile viewport, all Bowl variants, three languages, no external non-image requests');
} finally {await browser?.close();server.kill();}
