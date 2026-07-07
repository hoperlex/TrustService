const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL не задан. Заполните .env (см. .env.example).');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.on('error', (err) => {
  console.error('Неожиданная ошибка пула PostgreSQL:', err);
});

function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
