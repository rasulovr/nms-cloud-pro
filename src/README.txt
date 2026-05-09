RMS QR Menu update: ratings + recommendations + RMS admin section

Replace in src:
- main.jsx
- QRMenu.jsx
- QRMenu.css
- RMSQRMenuAdmin.jsx

Run SQL:
- sql_qr_recommendations_admin.sql

Changes:
- Rating stars are visually filled according to average rating.
- Guest QR Menu shows recommendations for dishes/drinks.
- New RMS section added: QR Menu.
- QR Menu admin section includes:
  - positions/photos/prices
  - recommendations
  - ratings
  - bills/payments overview
  - ads
  - guest info: Wi-Fi, hours, contacts, socials
