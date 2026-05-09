RMS QR Menu branch/table generator + menu admin

Replace in src:
- main.jsx
- QRMenu.jsx
- QRMenu.css
- RMSQRMenuAdmin.jsx

Run in Supabase:
- sql_qr_tables_menu_admin.sql

What this adds:
1. RMS section: QR Menu
2. QR generation for each branch/table
3. Table QR links:
   https://YOUR-DOMAIN/?qr=menu&branch=BC1&table=1
4. Add/edit menu positions, categories, prices, descriptions, photo URLs, stop-list
5. Recommendations, ratings, ads, guest info

Important about Clopos import:
The Clopos page is a dynamic web app. I could confirm the public menu page exists, but the full structured menu is not exposed in the text response. For exact migration, export menu from Clopos as CSV/Excel or send screenshots/files, and I will convert it to Supabase SQL import.
