import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const parseNum = (v) => Number(String(v || '0').replace(',', '.')) || 0
const fmt = (n) => Number(n || 0).toFixed(2)

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [transactions, setTransactions] = useState([])
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data: suppliersData } = await supabase.from('suppliers').select('*')
    const { data: txData } = await supabase.from('supplier_transactions').select('*')

    setSuppliers(suppliersData || [])
    setTransactions(txData || [])
  }

  async function addSupplier() {
    if (!name.trim()) return
    await supabase.from('suppliers').insert({ name })
    setName('')
    load()
  }

  async function addPurchase() {
    if (!selectedSupplier || !amount) return

    await supabase.from('supplier_transactions').insert({
      supplier_id: selectedSupplier,
      type: 'purchase',
      amount: parseNum(amount)
    })

    setAmount('')
    load()
  }

  async function addPayment() {
    if (!selectedSupplier || !amount) return

    await supabase.from('supplier_transactions').insert({
      supplier_id: selectedSupplier,
      type: 'payment',
      amount: parseNum(amount)
    })

    setAmount('')
    load()
  }

  function getDebt(id) {
    const tx = transactions.filter(t => t.supplier_id === id)
    let debt = 0
    tx.forEach(t => {
      if (t.type === 'purchase') debt += t.amount
      if (t.type === 'payment') debt -= t.amount
    })
    return debt
  }

  return <div>OK</div>

      <input value={name} onChange={e => setName(e.target.value)} placeholder="Новый поставщик"/>
      <button onClick={addSupplier}>Добавить</button>

      <br /><br />

      <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)}>
        <option value="">Выбери поставщика</option>
        {suppliers.map(s => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Сумма"/>

      <button onClick={addPurchase}>Закупка</button>
      <button onClick={addPayment}>Оплата</button>

      <br /><br />

      <table>
        <thead>
          <tr>
            <th>Поставщик</th>
            <th>Долг</th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map(s => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>{fmt(getDebt(s.id))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
