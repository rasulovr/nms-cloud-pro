import React, {useRef} from 'react';
import './centered.css';
import Offer from './PagedOffer.jsx';
import {useOfferPaging} from './paging.js';
export default function SecondOfferPreview(props) {
 const host=useRef(null);
 const products=props.products||[];
 useOfferPaging(host,products.length);
 const test={ru:'Тест №2',az:'Sınaq №2',en:'Test #2'}[props.language]||'Test #2';
 return <div ref={host} className="bc1-centered-preview"><Offer {...props} offers={[
  {id:'current-set',...props},
  {id:'test-copy',...props,products:products.map((p,i)=>i===0?{...p,name:`${test} · ${p.name}`}:p),onOpen:p=>props.onOpen(products.find(x=>x.id===p.id))}
 ]}/></div>;
}
