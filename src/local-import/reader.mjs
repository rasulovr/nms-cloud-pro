import {DOMParser} from '@xmldom/xmldom';
const FILE_LIMIT = 20 * 1024 * 1024;
const PART_LIMIT = 24 * 1024 * 1024;
const XML_BUDGET = 48 * 1024 * 1024;
const MAX_ROWS = 25001;
const MAX_COLS = 256;
const MAX_RECT = 500000;
const fmt = new TextDecoder('utf-8', { fatal:true });
const require = (test, message) => { if (!test) throw new Error(message); };
const bad = 'Формат файла не поддерживается или файл повреждён.';
const compact = x => String(x ?? '').replace(/[\s\u00A0\u202F]+/g, ' ').trim();
function zipEntries(buf) {
  require(buf.byteLength<=FILE_LIMIT&&buf.byteLength>=22,bad);
  const a=new Uint8Array(buf), v=new DataView(buf);
  const w=(i)=>v.getUint16(i,true), u=(i)=>v.getUint32(i,true);
  let ep=-1;
  for(let i=a.length-22;i>=Math.max(0,a.length-65557);i--){
    if(u(i)===0x06054b50 && i+22+w(i+20)===a.length){ep=i;break;}
  }
  require(ep>=0&&w(ep+4)===0&&w(ep+6)===0&&w(ep+8)===w(ep+10),bad);
  const n=w(ep+10), end=u(ep+16)+u(ep+12), at=u(ep+16);
  require(n>0&&n<=3000&&at<end&&end===ep,bad);
  const m=new Map();
  let i=at;
  for(let j=0;j<n;j++){
    require(i+46<=end&&u(i)===0x02014b50,bad);
    const flags=w(i+8), method=w(i+10), cmp=u(i+20), size=u(i+24), nam=w(i+28), extra=w(i+30), comment=w(i+32), off=u(i+42);
    require(i+46+nam+extra+comment<=end&&nam>0&&!w(i+34)&&off+30<=at,bad);
    const name=fmt.decode(a.subarray(i+46,i+46+nam));
    require(!m.has(name)&&!name.includes('\\')&&!name.includes('\0')&&!name.startsWith('/')&&!name.split('/').includes('..'),bad);
    m.set(name,{flags,method,cmp,size,off,crc:u(i+16)});
    i+=46+nam+extra+comment;
  }
  require(i===end,bad);
  let budget=XML_BUDGET;
  return {
    names:[...m.keys()],
    async get(name,optional=false){
      const q=m.get(name);
      if(!q&&optional)return null;
      require(q&&[0,8].includes(q.method)&&!(q.flags&1)&&q.size<=PART_LIMIT&&q.size<=budget,bad);
      const off=q.off;
      require(u(off)===0x04034b50&&w(off+8)===q.method&&w(off+6)===q.flags,bad);
      const nam=w(off+26), start=off+30+nam+w(off+28);
      require(start+q.cmp<=at&&fmt.decode(a.subarray(off+30,off+30+nam))===name,bad);
      budget-=q.size;
      let x;
      if(q.method===0){require(q.cmp===q.size,bad);x=a.subarray(start,start+q.cmp);}
      else {
        require(typeof DecompressionStream==='function','Этот браузер не умеет открывать XLSX. Используйте современный Chrome или Edge.');
        let stream;
        try{stream=new Blob([a.subarray(start,start+q.cmp)]).stream().pipeThrough(new DecompressionStream('deflate-raw'));}
        catch{throw new Error('Этот браузер не умеет открывать XLSX. Используйте современный Chrome или Edge.');}
        const reader=stream.getReader();
        x=new Uint8Array(q.size); let length=0;
        try {
          while(true){
            const r=await reader.read();if(r.done)break;
            if(length+r.value.length>x.length){await reader.cancel();throw new Error(bad);}
            x.set(r.value,length);length+=r.value.length;
          }
          require(length===q.size,bad);
        } finally {reader.releaseLock();}
      }
      require(crc32(x)===q.crc,bad);
      return fmt.decode(x);
    }
  };
}
const crcTable=Uint32Array.from({length:256},(_,i)=>{for(let j=0;j<8;j++)i=i&1?0xEDB88320^(i>>>1):i>>>1;return i;});
function crc32(a){let v=0xFFFFFFFF;for(const c of a)v=crcTable[(v^c)&255]^(v>>>8);return(v^0xFFFFFFFF)>>>0;}
const sNs='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const rNs='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const pNs='http://schemas.openxmlformats.org/package/2006/relationships';
function xml(src,root,ns){
  require(src&&!/<!DOCTYPE|<!ENTITY/i.test(src),bad);
  const d=new DOMParser({onError:()=>{throw new Error(bad)}}).parseFromString(src,'application/xml');
  const el=d.documentElement;
  require(el?.localName===root&&el.namespaceURI===ns&&!d.getElementsByTagName('parsererror').length,bad);
  return el;
}
const descendants=(el,n)=>Array.from(el.getElementsByTagNameNS(sNs,n));
const children=(el,n)=>Array.from(el.childNodes||[]).filter(x=>x.nodeType===1).filter(x=>x.localName===n&&x.namespaceURI===sNs);
const stringItems=el=>descendants(el,'t').filter(x=>x.parentNode?.localName!=='rPh').map(x=>x.textContent).join('');
function column(ref){const m=/^([A-Z]{1,3})[1-9]\d*$/.exec(ref);if(!m)return -1;let n=0;for(const c of m[1])n=n*26+c.charCodeAt(0)-64;return n-1;}
function rowsFrom(root,shared, dateStyles, epoch){
  const data=children(root,'sheetData');
  require(data.length===1,bad);
  const source=children(data[0],'row');
  require(source.length<=MAX_ROWS,'Слишком много строк для пилота (максимум 25 000 чеков).');
  let rect=0, prev=0;
  const result=[];
  for(const row of source){
    const indexText=row.getAttribute('r');
    const index=indexText===null?prev+1:Number(indexText);
    require(Number.isSafeInteger(index)&&index>prev&&index<=MAX_ROWS,bad);
    while(result.length<index-1)result.push([]);
    const vals=[], seen=new Set();
    for(const cell of children(row,'c')){
      const ref=cell.getAttribute('r')||'';
      const col=column(ref);
      require(col>=0&&col<MAX_COLS&&!seen.has(col)&&Number(ref.replace(/^[A-Z]+/,''))===index,bad);
      seen.add(col);require(children(cell,'f').length===0,'Файл содержит формулы. Нужна исходная выгрузка со значениями.');
      const type=cell.getAttribute('t')||'', raw=children(cell,'v')[0]?.textContent??'';
      let value='';
      if(type==='s'){require(/^\d+$/.test(raw)&&Number(raw)<shared.length,bad);value=shared[Number(raw)];}
      else if(type==='inlineStr')value=stringItems(cell);
      else if(type==='e')value='';
      else if(type==='b')value=raw==='1'?'TRUE':'FALSE';
      else if(type==='d'||type==='str'||type==='n'||type===''){
        value=raw;
        const style=cell.getAttribute('s')||'0';
        if(type!=='d'&&type!=='str'&&dateStyles.has(style)&&/^\d+(\.\d+)?$/.test(raw)){
          const serial=Number(raw);
          if(serial>0&&serial<2950000){
            const days=epoch==='1904'?serial:serial+(serial<60?1:0);
            const d=new Date((epoch==='1904'?Date.UTC(1904,0,1):Date.UTC(1899,11,30))+Math.round(days*86400000));
            if(Number.isFinite(d.valueOf())) value=d.toISOString().slice(0,19).replace('T',' ');
          }
        }
      }
      require(value.length<=10000,'Слишком длинное значение в таблице.');
      vals[col]=value;
    }
    rect+=vals.length;
    require(rect<=MAX_RECT,'Слишком много ячеек для пилота.');
    result.push(Array.from({length:vals.length},(_,i)=>vals[i]??''));
    prev=index;
  }
  return result;
}
function dateStyleIds(source){
  if(!source)return new Set();
  const st=xml(source,'styleSheet',sNs);
  const custom=new Map(descendants(st,'numFmt').map(x=>[x.getAttribute('numFmtId'),x.getAttribute('formatCode')||'']));
  const builtin=new Set([14,15,16,17,18,19,20,21,22,27,28,29,30,31,32,33,34,35,36,45,46,47,50,51,52,53,54,55,56,57,58]);
  const out=new Set();
  children(children(st,'cellXfs')[0]??{children:[]},'xf').forEach((x,i)=>{
    const id=x.getAttribute('numFmtId')||'0';
    const code=(custom.get(id)||'').replace(/"[^"]*"|\\.|_.|\[[^\]]*\]/g,'');
    if(builtin.has(Number(id))||/[ydhs]/i.test(code))out.add(String(i));
  });
  return out;
}
export async function readWorkbook(buffer) {
  const z=zipEntries(buffer);
  require(!z.names.some(n=>/vbaProject\.bin$|^xl\/externalLinks\//i.test(n)),'Файлы с макросами и внешними ссылками не поддерживаются.');
  const [wbText, relText, sharedText, styles]=await Promise.all([z.get('xl/workbook.xml'),z.get('xl/_rels/workbook.xml.rels'),z.get('xl/sharedStrings.xml',true),z.get('xl/styles.xml',true)]);
  const wb=xml(wbText,'workbook',sNs), rel=xml(relText,'Relationships',pNs);
  const shared=sharedText?descendants(xml(sharedText,'sst',sNs),'si').map(stringItems):[];
  require(shared.length<=MAX_RECT,bad);
  const rels=new Map();
  for(const e of Array.from(rel.childNodes).filter(x=>x.nodeType===1)){
    if(e.namespaceURI!==pNs||e.localName!=='Relationship')continue;
    require((e.getAttribute('TargetMode')||'').toLowerCase()!=='external','Файлы с внешними ссылками в описании книги не поддерживаются.');
    if(e.getAttribute('Type')!==rNs+'/worksheet')continue;
    const id=e.getAttribute('Id'), t=e.getAttribute('Target')||'';
    require(id&&!rels.has(id)&&/^(?:\/xl\/)?worksheets\/[A-Za-z0-9_.-]+\.xml$/.test(t),bad);
    rels.set(id,t.startsWith('/')?t.slice(1):'xl/'+t);
  }
  const sheets=descendants(wb,'sheet').filter(x=>!['hidden','veryHidden'].includes(x.getAttribute('state')));
  require(sheets.length>0&&sheets.length<=20,'Слишком много видимых листов или их нет.');
  const epoch=['1','true'].includes(descendants(wb,'workbookPr')[0]?.getAttribute('date1904'))?'1904':'1900';
  const dateStyles=dateStyleIds(styles);
  const visible=[];
  let budget=MAX_RECT;
  for(const sheet of sheets){
    const id=sheet.getAttributeNS(rNs,'id');
    if(!rels.has(id))continue;
    const rows=rowsFrom(xml(await z.get(rels.get(id)),'worksheet',sNs),shared,dateStyles,epoch);
    budget-=rows.reduce((a,r)=>a+r.length,0);
    require(budget>=0,'Слишком много ячеек в книге.');
    visible.push({rows,name:compact(sheet.getAttribute('name')).slice(0,90)});
  }
  return {sheets:visible};
}
