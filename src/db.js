const fs = require('fs');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL не задан. Заполните .env (см. .env.example).');
  process.exit(1);
}

// TLS до внешней (managed) PostgreSQL. Если задан путь к корневому сертификату
// (DB_CA_CERT_PATH), включаем проверку сертификата сервера — это эквивалент
// sslmode=verify-full. Явный ssl-объект имеет приоритет над параметрами URL.
// Для локального Postgres (localhost) переменную не задают → соединение без TLS.
let ssl;
if (process.env.DB_CA_CERT_PATH) {
  ssl = {
    ca: fs.readFileSync(process.env.DB_CA_CERT_PATH, 'utf8'),
    rejectUnauthorized: true,
  };
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(ssl ? { ssl } : {}),
});

pool.on('error', (err) => {
  console.error('Неожиданная ошибка пула PostgreSQL:', err);
});

function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
