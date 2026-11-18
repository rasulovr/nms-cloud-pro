import React,{useMemo,useState} from 'react';
export default function PrimaryRegister({rows}){
 const [search,setSearch]=useState(''),[from,setFrom]=useState(''),[to,setTo]=useState(''),[page,setPage]=useState(1);
 const invalid=from&&to&&from>to;
 const matching=useMemo(()=>rows.filter(r=>`${r.invoiceNumber} ${r.supplierName}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())),[rows,search]);
 const unknown=matching.filter(r=>!r.receiptDate).length;
 const visible=useMemo(()=>invalid?[]:matching.filter(r=>(!from||r.receiptDate&&r.receiptDate>=from)&&(!to||r.receiptDate&&r.receiptDate<=to)).sort((a,b)=>String(b.receiptDate||'').localeCompare(String(a.receiptDate||''))||a.invoiceNumber.localeCompare(b.invoiceNumber)),[matching,from,to,invalid]);
 const pages=Math.max(1,Math.ceil(visible.length/25)),safe=Math.min(page,pages);
 const update=(setter,value)=>{setter(value);setPage(1)};
 return <section aria-label="Первичные электронные счета" className="eqaime-review">
 <h3>E-qaimə из портала</h3><p>Сумма указана по полю «Yekun məbləğ» электронного документа. Внутренние накладные не суммируются. Суммы не являются остатками долга.</p>
 <p role="status">Подтверждённый долг не рассчитан. Документы со спорными статусами исключены из автоматического расчёта; автоматического расчёта в этом разделе нет.</p>
 <div className="eqaime-filters"><label>Поиск первички<input value={search} onChange={e=>update(setSearch,e.target.value)}/></label><label>Поступление с<input type="date" value={from} onChange={e=>update(setFrom,e.target.value)}/></label><label>Поступление по<input type="date" value={to} onChange={e=>update(setTo,e.target.value)}/></label><button onClick={()=>{setFrom('');setTo('');setSearch('');setPage(1)}}>Сбросить фильтры</button></div>
 {invalid&&<p role="alert">Дата начала должна быть не позже даты окончания.</p>}
 <p>Без подтверждённой даты поступления: {unknown}.{(from||to)&&' Эти строки исключены фильтром дат.'}</p>
 <p>Документов по фильтру: {visible.length}. Требуют проверки: {visible.filter(r=>r.sourceReviewRequired).length}.</p>
 <div className="eqaime-table"><table><thead><tr><th>Номер e-qaimə</th><th>Дата поступления</th><th>Поставщик</th><th>Сумма e-qaimə, AZN</th><th>Товар / исходное описание</th><th>Оплата и статус</th></tr></thead><tbody>{visible.slice((safe-1)*25,safe*25).map(r=><tr key={r.id}><td>{r.invoiceNumber}</td><td>{r.receiptDate||'Не подтверждена'}{!r.receiptDate&&<small>Дата документа и дата выгрузки не подставлены.</small>}</td><td>{r.supplierName}</td><td data-testid="primary-amount">{r.primaryAmount.replace('.',',')}</td><td>{r.description||'Описание не указано'}<small>Номера в описании не заменяют номер электронной e-qaimə.</small></td><td><span className={`eqaime-payment-status ${r.paymentStatus?.state||'partial_or_unknown'}`}>{r.paymentStatus?.state==='fully_confirmed'?'✓ ':''}{r.paymentStatus?.label||'Недостаточно сведений об оплате'}</span>{r.paymentStatus?.confirmedPaidAmount!==null&&r.paymentStatus?.confirmedPaidAmount!==undefined&&<small>Подтверждено оплат: {r.paymentStatus.confirmedPaidAmount.replace('.',',')} AZN</small>}<small>{r.sourceStatus}</small><small>{r.sourceType||'Тип документа не подтверждён'}</small>{r.sourceReviewRequired&&<strong> · Требует проверки. Не включать в расчёт.</strong>}</td></tr>)}{!visible.length&&<tr><td colSpan={6}>Нет документов по фильтру. Это не означает отсутствие долга.</td></tr>}</tbody></table></div>
 <footer><button disabled={safe<=1} onClick={()=>setPage(safe-1)}>Предыдущая страница</button><span>{safe} / {pages}</span><button disabled={safe>=pages} onClick={()=>setPage(safe+1)}>Следующая страница</button></footer></section>
}
