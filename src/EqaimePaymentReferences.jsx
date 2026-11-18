import React from 'react';
export default function PaymentReferences({numbers=[]}){
 if(!numbers.length)return <span>Номер e-qaimə не указан</span>;
 return <details className="eqaime-payment-references"><summary>Электронные фактуры: {numbers.length}</summary><p>Одна строка — один банковский перевод. Показана его исходная полная сумма; суммы по отдельным фактурам не распределены.</p><ul>{numbers.map(n=><li key={n}>{n}</li>)}</ul></details>;
}
