require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieSession = require('cookie-session');

const publicRoutes = require('./routes/public');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

const app = express();

// За Nginx/reverse-proxy — доверяем первому прокси (нужно для rate-limit по IP и secure cookie).
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        // Не форсируем https для локального запуска по http.
        'upgrade-insecure-requests': null,
      },
    },
  })
);

app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));

if (!process.env.SESSION_SECRET) {
  console.warn('SESSION_SECRET не задан — используется небезопасный ключ по умолчанию.');
}

app.use(
  cookieSession({
    name: 'ts_session',
    keys: [process.env.SESSION_SECRET || 'dev-insecure-secret-change-me'],
    maxAge: 8 * 60 * 60 * 1000, // 8 часов
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  })
);

// Маршруты приложения — до раздачи статики.
app.use('/', publicRoutes);
app.use('/', authRoutes);
app.use('/', adminRoutes);

// Статика (index.html для «/», css, js). Данные кабинета защищены на уровне API,
// поэтому статичная оболочка admin.html без входа бесполезна (API вернёт 401).
app.use(express.static(path.join(__dirname, '..', 'public')));

// 404 для всего остального.
app.use((req, res) => {
  res.status(404).send('Страница не найдена.');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Служба доверия слушает http://localhost:${port}`);
});
