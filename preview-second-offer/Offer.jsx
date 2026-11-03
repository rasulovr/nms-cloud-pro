import React from 'react';
import Offer from '../src/BC1SpecialOffer.jsx';
export default function SecondOfferPreview(props) {
 const test={ru:'Тест №2',az:'Sınaq №2',en:'Test #2'}[props.language]||'Test #2';
 const products=props.products||[];
 return <Offer {...props} offers={[
  {id:'current-set',...props},
  {id:'test-copy',...props,products:products.map((p,i)=>i===0?{...p,name:`${test} · ${p.name}`}:p),onOpen:p=>props.onOpen(products.find(x=>x.id===p.id))}
 ]}/>;
}
