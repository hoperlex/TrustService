'use strict';

// --- Верхний блок контактов ------------------------------------------------

const CONTACT_META = {
  max: { label: 'Max', href: (v) => v },
  telegram: { label: 'Telegram', href: (v) => v },
  email: { label: 'E-mail', href: (v) => `mailto:${v}` },
  phone: { label: 'Телефон', href: (v) => `tel:${v.replace(/\s/g, '')}` },
};

const CONTACT_ORDER = ['max', 'telegram', 'email', 'phone'];

async function loadContacts() {
  const container = document.getElementById('contacts');
  if (!container) return;
  try {
    const res = await fetch('/api/config');
    if (!res.ok) return;
    const { contacts } = await res.json();
    for (const key of CONTACT_ORDER) {
      const value = contacts && contacts[key];
      if (!value) continue;
      const meta = CONTACT_META[key];
      const link = document.createElement('a');
      link.className = `contact contact--${key}`;
      link.href = meta.href(value);
      link.textContent = meta.label;
      if (key === 'max' || key === 'telegram') {
        link.target = '_blank';
        link.rel = 'noopener';
      }
      container.appendChild(link);
    }
  } catch (err) {
    // Контакты не критичны для формы — молча пропускаем.
  }
}

// --- Форма обращения -------------------------------------------------------

function setupForm() {
  const form = document.getElementById('appeal-form');
  const messageEl = document.getElementById('form-message');
  const submitBtn = document.getElementById('submit-btn');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    messageEl.textContent = '';
    messageEl.className = 'form__message';

    const data = {
      full_name: form.full_name.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      message: form.message.value.trim(),
    };

    if (!data.full_name || !data.message) {
      showMessage(messageEl, 'Заполните ФИО и текст обращения.', false);
      return;
    }

    submitBtn.disabled = true;
    try {
      const res = await fetch('/api/appeals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok) {
        form.reset();
        showMessage(messageEl, 'Обращение принято.', true);
      } else {
        showMessage(
          messageEl,
          body.error || 'Не удалось отправить обращение. Попробуйте позже.',
          false
        );
      }
    } catch (err) {
      showMessage(messageEl, 'Ошибка сети. Проверьте соединение.', false);
    } finally {
      submitBtn.disabled = false;
    }
  });
}

function showMessage(el, text, ok) {
  el.textContent = text;
  el.className = `form__message ${ok ? 'form__message--ok' : 'form__message--error'}`;
}

loadContacts();
setupForm();
