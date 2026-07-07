'use strict';

const form = document.getElementById('login-form');
const messageEl = document.getElementById('login-message');
const loginBtn = document.getElementById('login-btn');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  messageEl.textContent = '';
  messageEl.className = 'form__message';

  const username = form.username.value.trim();
  const password = form.password.value;
  if (!username || !password) {
    show('Введите логин и пароль.');
    return;
  }

  loginBtn.disabled = true;
  try {
    const res = await fetch('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.ok) {
      window.location.href = '/admin';
    } else {
      show(body.error || 'Не удалось войти.');
    }
  } catch (err) {
    show('Ошибка сети. Проверьте соединение.');
  } finally {
    loginBtn.disabled = false;
  }
});

function show(text) {
  messageEl.textContent = text;
  messageEl.className = 'form__message form__message--error';
}
