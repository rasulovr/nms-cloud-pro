// Vercel Serverless Function: /api/loyalty/apple-wallet?token=...
// Requires Apple Developer Pass Type certificate before real .pkpass generation.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

function html(res, title, body, status = 200) {
  res.status(status).setHeader('Content-Type', 'text/html; charset=utf-8')
  res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{margin:0;background:#f6f1e8;color:#173c32;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif}.box{max-width:520px;margin:40px auto;padding:28px;background:#fff;border-radius:28px;box-shadow:0 18px 50px rgba(20,30,40,.12)}h1{margin:0 0 12px;font-size:28px}.btn{display:inline-block;margin-top:18px;padding:13px 16px;border-radius:14px;background:#173c32;color:#fff;text-decoration:none;font-weight:800}code{background:#f2eee6;padding:2px 6px;border-radius:7px}</style></head><body><div class="box"><h1>${title}</h1>${body}</div></body></html>`)
}

async function loadCard(token) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Supabase env vars are not configured')
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/rms_loyalty_wallet_card_by_token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: SUPABASE_ANON_KEY, authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ p_wallet_token: token }),
  })
  if (!r.ok) throw new Error(await r.text())
  const data = await r.json()
  return Array.isArray(data) ? data[0] : data
}

module.exports = async function handler(req, res) {
  try {
    const token = String(req.query.token || '').trim()
    if (!token) return html(res, 'Wallet token yoxdur', '<p>QR linkində token tapılmadı.</p>', 400)

    const card = await loadCard(token)
    if (!card) return html(res, 'Карта не найдена', '<p>Карта отключена или QR недействителен.</p>', 404)

    const required = ['APPLE_PASS_TYPE_IDENTIFIER', 'APPLE_TEAM_IDENTIFIER', 'APPLE_WWDR_PEM', 'APPLE_SIGNER_CERT_PEM', 'APPLE_SIGNER_KEY_PEM']
    const missing = required.filter((k) => !process.env[k])
    if (missing.length) {
      const back = `/?loyalty_wallet=${encodeURIComponent(token)}`
      return html(res, 'Apple Wallet ещё не подключён', `<p>Карта найдена: <b>${card.name || 'Гость'}</b><br/>№ <code>${card.card_number || ''}</code></p><p>Для реального <code>.pkpass</code> нужно добавить Apple Pass Certificate env vars:</p><p><code>${missing.join('</code><br/><code>')}</code></p><a class="btn" href="${back}">Вернуться к карте</a>`, 501)
    }

    let PKPass
    try { PKPass = require('passkit-generator').PKPass } catch (e) {
      return html(res, 'Нужен пакет passkit-generator', '<p>Добавьте зависимость <code>passkit-generator</code> в package.json и redeploy.</p>', 501)
    }

    const serialNumber = `bc-${String(card.id).replace(/-/g, '').slice(0, 18)}`
    const cardNo = String(card.card_number || serialNumber)
    const stamps = Number(card.stamp_count || 0)
    const freeDrinks = Number(card.free_drink_balance || 0)

    const pass = await PKPass.from({
      model: {},
      certificates: {
        wwdr: Buffer.from(process.env.APPLE_WWDR_PEM),
        signerCert: Buffer.from(process.env.APPLE_SIGNER_CERT_PEM),
        signerKey: Buffer.from(process.env.APPLE_SIGNER_KEY_PEM),
        signerKeyPassphrase: process.env.APPLE_SIGNER_KEY_PASSPHRASE || undefined,
      },
    }, {
      formatVersion: 1,
      passTypeIdentifier: process.env.APPLE_PASS_TYPE_IDENTIFIER,
      teamIdentifier: process.env.APPLE_TEAM_IDENTIFIER,
      organizationName: process.env.APPLE_ORGANIZATION_NAME || 'Barista&Chef',
      description: 'Barista&Chef Drink Loyalty Card',
      serialNumber,
      backgroundColor: 'rgb(246,241,232)',
      foregroundColor: 'rgb(23,60,50)',
      labelColor: 'rgb(122,94,45)',
      logoText: 'BARISTA&CHEF',
      barcodes: [{ message: cardNo, format: 'PKBarcodeFormatQR', messageEncoding: 'iso-8859-1' }],
      storeCard: {
        primaryFields: [{ key: 'name', label: 'КАРТА ГОСТЯ', value: card.name || 'Гость' }],
        secondaryFields: [{ key: 'stamps', label: 'ОТМЕТКИ', value: `${stamps}/10` }, { key: 'free', label: 'БЕСПЛАТНО', value: `${freeDrinks}` }],
        auxiliaryFields: [{ key: 'card', label: 'НОМЕР КАРТЫ', value: cardNo }],
        backFields: [{ key: 'terms', label: 'Правило', value: '1 напиток = 1 отметка. 10 отметок = 1 бесплатный напиток.' }],
      },
    })

    const buffer = pass.getAsBuffer()
    res.status(200)
    res.setHeader('Content-Type', 'application/vnd.apple.pkpass')
    res.setHeader('Content-Disposition', `attachment; filename="baristachef-${cardNo}.pkpass"`)
    res.end(buffer)
  } catch (error) {
    return html(res, 'Apple Wallet error', `<p>${String(error.message || error)}</p>`, 500)
  }
}
