'use strict';

const STATUS_LABELS = {
  new: 'Новое',
  in_progress: 'В работе',
  done: 'Обработано',
};
const STATUS_ORDER = ['new', 'in_progress', 'done'];

const body = document.getElementById('appeals-body');
const messageEl = document.getElementById('admin-message');
const emptyNote = document.getElementById('empty-note');

document.getElementById('refresh-btn').addEventListener('click', loadAppeals);
document.getElementById('logout-btn').addEventListener('click', logout);

function setMessage(text, isError) {
  messageEl.textContent = text || '';
  messageEl.className = 'admin__message' + (isError ? ' admin__message--error' : '');
}

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function loadAppeals() {
  setMessage('Загрузка…', false);
  try {
    const res = await fetch('/api/appeals');
    if (res.status === 401) {
      window.location.href = '/admin/login';
      return;
    }
    if (!res.ok) {
      setMessage('Не удалось загрузить обращения.', true);
      return;
    }
    const { appeals } = await res.json();
    render(appeals || []);
    setMessage('', false);
  } catch (err) {
    setMessage('Ошибка сети. Проверьте соединение.', true);
  }
}

function render(appeals) {
  body.textContent = '';
  emptyNote.hidden = appeals.length > 0;

  for (const a of appeals) {
    const tr = document.createElement('tr');
    tr.appendChild(cell(formatDate(a.created_at)));
    tr.appendChild(cell(a.full_name));
    tr.appendChild(cell(a.phone || '—'));
    tr.appendChild(cell(a.email || '—'));

    const msgCell = cell(a.message);
    msgCell.className = 'table__msg';
    tr.appendChild(msgCell);

    tr.appendChild(statusCell(a));
    body.appendChild(tr);
  }
}

// textContent исключает stored-XSS: содержимое обращения не парсится как HTML.
function cell(text) {
  const td = document.createElement('td');
  td.textContent = text == null ? '' : String(text);
  return td;
}

function statusCell(appeal) {
  const td = document.createElement('td');
  const select = document.createElement('select');
  select.className = 'status status--' + appeal.status;

  for (const s of STATUS_ORDER) {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = STATUS_LABELS[s];
    if (s === appeal.status) opt.selected = true;
    select.appendChild(opt);
  }

  select.addEventListener('change', async () => {
    const next = select.value;
    const prev = appeal.status;
    select.disabled = true;
    try {
      const res = await fetch(`/api/appeals/${appeal.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      if (!res.ok) throw new Error('bad status');
      appeal.status = next;
      select.className = 'status status--' + next;
      setMessage('Статус обновлён.', false);
    } catch (err) {
      select.value = prev;
      setMessage('Не удалось изменить статус.', true);
    } finally {
      select.disabled = false;
    }
  });

  td.appendChild(select);
  return td;
}

async function logout() {
  try {
    await fetch('/admin/logout', { method: 'POST' });
  } catch (err) {
    /* игнорируем — всё равно уводим на логин */
  }
  window.location.href = '/admin/login';
}

loadAppeals();
