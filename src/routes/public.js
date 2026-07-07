const express = require('express');
const rateLimit = require('express-rate-limit');
const QRCode = require('qrcode');
const { query } = require('../db');

const router = express.Router();

// Антиспам: не более 5 обращений с одного IP за 10 минут.
const appealLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много обращений. Попробуйте позже.' },
});

function clean(value, maxLen) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

// Приём обращения из публичной формы.
router.post('/api/appeals', appealLimiter, async (req, res) => {
  const fullName = clean(req.body.full_name, 200);
  const phone = clean(req.body.phone, 50);
  const email = clean(req.body.email, 200);
  const message = clean(req.body.message, 5000);

  if (!fullName || !message) {
    return res
      .status(400)
      .json({ error: 'Заполните ФИО и текст обращения.' });
  }

  try {
    const result = await query(
      `INSERT INTO appeals (full_name, phone, email, message)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [fullName, phone || null, email || null, message]
    );
    return res.json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    console.error('Ошибка сохранения обращения:', err);
    return res.status(500).json({ error: 'Не удалось сохранить обращение.' });
  }
});

// Контакты для верхнего блока публичной страницы (только непустые).
router.get('/api/config', (req, res) => {
  res.json({
    contacts: {
      max: process.env.CONTACT_MAX || '',
      telegram: process.env.CONTACT_TELEGRAM || '',
      email: process.env.CONTACT_EMAIL || '',
      phone: process.env.CONTACT_PHONE || '',
    },
  });
});

// Страница для распечатки QR на A4. QR кодирует PUBLIC_URL.
router.get('/print', async (req, res) => {
  const url =
    process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
  let svg;
  try {
    svg = await QRCode.toString(url, {
      type: 'svg',
      margin: 1,
      width: 320,
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('Ошибка генерации QR:', err);
    svg = '<p>Не удалось сгенерировать QR-код.</p>';
  }
  res.type('html').send(renderPrint(url, svg));
});

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderPrint(url, svg) {
  const safeUrl = escapeHtml(url);
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Служба доверия ООО «СУ-10» — печать QR</title>
  <link rel="stylesheet" href="/css/styles.css">
</head>
<body class="print-page">
  <main class="poster">
    <h1 class="poster__title">СЛУЖБА ДОВЕРИЯ</h1>
    <p class="poster__subtitle">ООО «СУ-10»</p>
    <div class="poster__qr">${svg}</div>
    <p class="poster__hint">Отсканируйте QR-код камерой телефона,<br>
      чтобы отправить обращение в службу доверия.</p>
    <p class="poster__url">${safeUrl}</p>
    <button type="button" id="print-btn" class="btn poster__print-btn">Печать</button>
  </main>
  <script src="/js/print.js"></script>
</body>
</html>`;
}

module.exports = router;
