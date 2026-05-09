RMS QR Menu update: photos + live bill

Replace in src:
- QRMenu.jsx
- QRMenu.css

Do NOT replace main.jsx.

Run SQL:
- sql_qr_menu_photos_live_bill.sql

Open:
https://project-83si4.vercel.app/?qr=menu&branch=BC1&table=1

What changed:
- Guest ordering is disabled.
- Guest sees photo-based menu.
- Guest can rate dishes.
- Guest can open “Мой счёт”.
- Bill is read from rms_qr_live_bills + rms_qr_live_bill_items.
- Menu photos are read from rms_menu_products.image_url.
