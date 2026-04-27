NMS Cloud Pro v1 Frontend

Это первый frontend-пакет для подключения к Supabase.

Что внутри:
- React + Vite проект
- Supabase client
- Login через Supabase Auth
- Дашборд
- Выручка
- Расходы за день
- Финансы ресторанов
- Поставщики базово
- Настройки базово

Как запустить локально:
1. Установить Node.js
2. Распаковать проект
3. В терминале:
   npm install
   cp .env.example .env
4. В .env вставить:
   VITE_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY
5. Запустить:
   npm run dev

Как разместить:
- загрузить проект на GitHub
- подключить к Vercel
- добавить Environment Variables:
  VITE_SUPABASE_URL
  VITE_SUPABASE_ANON_KEY

Важно:
Сначала нужно выполнить database.sql из SQL-пакета в Supabase.
Затем создать пользователя в Supabase Auth.
После входа в систему перейти в Настройки и создать admin-профиль для текущего пользователя.
