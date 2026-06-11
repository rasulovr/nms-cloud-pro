// Vercel Serverless Function: /api/loyalty/google-wallet?token=...
// Creates a Google Wallet Save URL when Google Wallet env vars are configured.

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

    const required = ['GOOGLE_WALLET_ISSUER_ID', 'GOOGLE_WALLET_CLASS_ID', 'GOOGLE_WALLET_CLIENT_EMAIL', 'GOOGLE_WALLET_PRIVATE_KEY']
    const missing = required.filter((k) => !process.env[k])
    if (missing.length) {
      const back = `/?loyalty_wallet=${encodeURIComponent(token)}`
      return html(res, 'Google Wallet ещё не подключён', `<p>Карта найдена: <b>${card.name || 'Гость'}</b><br/>№ <code>${card.card_number || ''}</code></p><p>Для Save to Google Wallet нужно добавить env vars:</p><p><code>${missing.join('</code><br/><code>')}</code></p><a class="btn" href="${back}">Вернуться к карте</a>`, 501)
    }

    let jwt
    try { jwt = require('jsonwebtoken') } catch (e) {
      return html(res, 'Нужен пакет jsonwebtoken', '<p>Добавьте зависимость <code>jsonwebtoken</code> в package.json и redeploy.</p>', 501)
    }

    const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID
    const classId = process.env.GOOGLE_WALLET_CLASS_ID.includes('.') ? process.env.GOOGLE_WALLET_CLASS_ID : `${issuerId}.${process.env.GOOGLE_WALLET_CLASS_ID}`
    const objectId = `${issuerId}.bc_${String(card.id).replace(/-/g, '_')}`
    const cardNo = String(card.card_number || objectId)

    const payload = {
      iss: process.env.GOOGLE_WALLET_CLIENT_EMAIL,
      aud: 'google',
      typ: 'savetowallet',
      iat: Math.floor(Date.now() / 1000),
      origins: [process.env.PUBLIC_APP_ORIGIN || process.env.VERCEL_URL || 'https://app.rms.rest'],
      payload: {
        genericObjects: [{
          id: objectId,
          classId,
          genericType: 'GENERIC_TYPE_UNSPECIFIED',
          hexBackgroundColor: '#F6F1E8',
          cardTitle: { defaultValue: { language: 'ru', value: 'Barista&Chef' } },
          subheader: { defaultValue: { language: 'ru', value: 'Карта напитков' } },
          header: { defaultValue: { language: 'ru', value: card.name || 'Гость' } },
          barcode: { type: 'QR_CODE', value: cardNo, alternateText: cardNo },
          textModulesData: [
            { id: 'stamps', header: 'Отметки', body: `${Number(card.stamp_count || 0)}/10` },
            { id: 'free_drinks', header: 'Бесплатные напитки', body: `${Number(card.free_drink_balance || 0)}` },
            { id: 'rule', header: 'Правило', body: '1 напиток = 1 отметка. 10 отметок = 1 бесплатный напиток.' },
          ],
        }],
      },
    }

    const privateKey = String(process.env.GOOGLE_WALLET_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    const tokenJwt = jwt.sign(payload, privateKey, { algorithm: 'RS256' })
    res.writeHead(302, { Location: `https://pay.google.com/gp/v/save/${tokenJwt}` })
    res.end()
  } catch (error) {
    return html(res, 'Google Wallet error', `<p>${String(error.message || error)}</p>`, 500)
  }
}
