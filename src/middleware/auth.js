// Защита страниц кабинета: без входа — редирект на форму логина.
function requireLogin(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.redirect('/admin/login');
}

// Защита API кабинета: без входа — 401 JSON (фронт сам перекинет на логин).
function requireLoginApi(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.status(401).json({ error: 'Требуется вход.' });
}

module.exports = { requireLogin, requireLoginApi };
