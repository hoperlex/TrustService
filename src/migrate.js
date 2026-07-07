require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./db');

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS appeals (
      id         BIGSERIAL PRIMARY KEY,
      full_name  TEXT NOT NULL,
      phone      TEXT,
      email      TEXT,
      message    TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'new',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS employees (
      id            SERIAL PRIMARY KEY,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(
    `CREATE INDEX IF NOT EXISTS appeals_created_at_idx ON appeals (created_at DESC)`
  );

  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASSWORD;
  if (user && pass) {
    const hash = await bcrypt.hash(pass, 12);
    await pool.query(
      `INSERT INTO employees (username, password_hash)
       VALUES ($1, $2)
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [user, hash]
    );
    console.log(`Сотрудник "${user}" создан/обновлён.`);
  } else {
    console.log('ADMIN_USER/ADMIN_PASSWORD не заданы — сотрудник не создан.');
  }

  console.log('Миграция завершена.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Ошибка миграции:', err);
  process.exit(1);
});
