const express = require('express');
const path = require('path');
const { query } = require('../db');
const { requireLogin, requireLoginApi } = require('../middleware/auth');

const router = express.Router();

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
const STATUSES = ['new', 'in_progress', 'done'];

// Страница кабинета (защищена).
router.get('/admin', requireLogin, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
});

// Список всех обращений (новые сверху).
router.get('/api/appeals', requireLoginApi, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, full_name, phone, email, message, status, created_at
       FROM appeals
       ORDER BY created_at DESC, id DESC`
    );
    res.json({ appeals: result.rows });
  } catch (err) {
    console.error('Ошибка загрузки обращений:', err);
    res.status(500).json({ error: 'Ошибка сервера.' });
  }
});

// Смена статуса обращения.
router.patch('/api/appeals/:id/status', requireLoginApi, async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const status = req.body.status;

  if (!Number.isInteger(id) || !STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Некорректные данные.' });
  }

  try {
    const result = await query(
      'UPDATE appeals SET status = $1 WHERE id = $2 RETURNING id',
      [status, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Обращение не найдено.' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Ошибка смены статуса:', err);
    res.status(500).json({ error: 'Ошибка сервера.' });
  }
});

module.exports = router;
