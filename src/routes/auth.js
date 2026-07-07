const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const { query } = require('../db');

const router = express.Router();

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');

// Защита от перебора пароля: не более 10 попыток входа за 15 минут с IP.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много попыток входа. Попробуйте позже.' },
});

router.get('/admin/login', (req, res) => {
  if (req.session && req.session.userId) return res.redirect('/admin');
  res.sendFile(path.join(PUBLIC_DIR, 'login.html'));
});

router.post('/admin/login', loginLimiter, async (req, res) => {
  const username = (req.body.username || '').trim();
  const password = req.body.password || '';

  if (!username || !password) {
    return res.status(400).json({ error: 'Введите логин и пароль.' });
  }

  try {
    const result = await query(
      'SELECT id, password_hash FROM employees WHERE username = $1',
      [username]
    );
    const row = result.rows[0];
    const ok = row && (await bcrypt.compare(password, row.password_hash));
    if (!ok) {
      return res.status(401).json({ error: 'Неверный логин или пароль.' });
    }
    req.session.userId = row.id;
    return res.json({ ok: true });
  } catch (err) {
    console.error('Ошибка входа:', err);
    return res.status(500).json({ error: 'Ошибка сервера.' });
  }
});

router.post('/admin/logout', (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

module.exports = router;
