# Развёртывание «Служба доверия ООО «СУ-10»»

Инструкция по установке и подключению: БД (Yandex Managed PostgreSQL), секреты,
миграция, запуск через systemd, Nginx + HTTPS. Организовано по аналогии с проектом
matcheck.

## Оглавление
1. [Схема](#схема)
2. [База данных: Yandex Managed PostgreSQL](#база-данных-yandex-managed-postgresql)
3. [Сертификат Yandex CA](#сертификат-yandex-ca)
4. [Секрет сессии](#секрет-сессии)
5. [Файл окружения (.env)](#файл-окружения-env)
6. [Установка и миграция](#установка-и-миграция)
7. [Запуск через systemd](#запуск-через-systemd)
8. [Nginx + HTTPS](#nginx--https)
9. [Проверка после деплоя](#проверка-после-деплоя)
10. [Обновление кода](#обновление-кода)
11. [Локальная разработка (без TLS)](#локальная-разработка-без-tls)

---

## Схема

```
Пользователь → https://trust.su10.ru
                     │
              [системный Nginx]  (443, TLS Let's Encrypt)
                     │  proxy_pass
              127.0.0.1:3000  →  Node app (systemd: trustservice)
                     │  TLS verify-full (порт 6432)
              Yandex Managed PostgreSQL
```

Приложение слушает только `127.0.0.1` — наружу смотрит Nginx.

---

## База данных: Yandex Managed PostgreSQL

1. В консоли Yandex Cloud → **Managed Service for PostgreSQL** создать кластер
   (или использовать существующий).
2. Создать **базу** `trustservice` и **пользователя** (например `trust`) с паролем.
3. Запомнить параметры подключения:
   - host — вида `rc1x-xxxxxxxx.mdb.yandexcloud.net`;
   - порт — **6432** (пулер соединений; для managed-кластера используем его);
   - имя БД — `trustservice`, пользователь и пароль.

> Расширения/таблицы создаст миграция (`node src/migrate.js`) — заранее ничего
> в БД делать не нужно, только сама база и пользователь.

---

## Сертификат Yandex CA

Для `sslmode=verify-full` нужен корневой сертификат Яндекса.

```bash
# на проде
mkdir -p /srv/trustservice/secrets/yandex-ca
curl -o /srv/trustservice/secrets/yandex-ca/root.crt \
  https://storage.yandexcloud.net/cloud-certs/CA.pem
chmod 700 /srv/trustservice/secrets
```

Проверить, что это валидный сертификат (без вывода содержимого):

```bash
openssl x509 -in /srv/trustservice/secrets/yandex-ca/root.crt -noout -issuer -enddate
sha256sum /srv/trustservice/secrets/yandex-ca/root.crt
```

Путь к этому файлу указывается в переменной `DB_CA_CERT_PATH` (см. ниже).
`src/db.js` читает его и включает проверку сертификата сервера
(`ssl: { ca, rejectUnauthorized: true }`).

---

## Секрет сессии

`SESSION_SECRET` — это просто длинная случайная строка для подписи cookie-сессии
сотрудника. К базе данных отношения не имеет (сессии stateless, отдельного
хранилища сессий нет).

```bash
openssl rand -hex 32
```

Полученную строку положить в `SESSION_SECRET`.

---

## Файл окружения (.env)

На проде секреты держим **вне репозитория** — в `/srv/trustservice/secrets/trust.env`
(так же, как matcheck держит `/srv/matcheck/secrets/api.env`). Шаблон — `.env.example`.

`/srv/trustservice/secrets/trust.env`:

```
NODE_ENV=production
PORT=3000
HOST=127.0.0.1

DATABASE_URL=postgresql://trust:<PASSWORD>@rc1x-xxxx.mdb.yandexcloud.net:6432/trustservice?sslmode=verify-full
DB_CA_CERT_PATH=/srv/trustservice/secrets/yandex-ca/root.crt

SESSION_SECRET=<openssl rand -hex 32>
PUBLIC_URL=https://trust.su10.ru

ADMIN_USER=<логин сотрудника>
ADMIN_PASSWORD=<пароль сотрудника>

CONTACT_MAX=https://max.ru/...
CONTACT_TELEGRAM=https://t.me/...
CONTACT_EMAIL=trust@su10.ru
CONTACT_PHONE=+7...
```

```bash
chmod 600 /srv/trustservice/secrets/trust.env
chown trustservice:trustservice /srv/trustservice/secrets/trust.env
```

---

## Установка и миграция

Код кладём в `/srv/trustservice/app` (клон репозитория `hoperlex/TrustService`).

```bash
# от пользователя trustservice
cd /srv/trustservice/app
npm ci --omit=dev

# миграция читает переменные из окружения; подставим trust.env разово:
set -a; . /srv/trustservice/secrets/trust.env; set +a
node src/migrate.js      # создаёт таблицы + сотрудника из ADMIN_USER/ADMIN_PASSWORD
```

После успешного создания сотрудника **уберите `ADMIN_PASSWORD`** из `trust.env`
(пароль уже сохранён в БД в виде bcrypt-хеша).

---

## Запуск через systemd

Готовый unit — [`deploy/trustservice.service`](../deploy/trustservice.service).

```bash
# создать системного пользователя и каталоги (однократно)
useradd --system --create-home --home-dir /srv/trustservice trustservice
mkdir -p /srv/trustservice/{app,secrets,logs}
chown -R trustservice:trustservice /srv/trustservice
chmod 700 /srv/trustservice/secrets

# установить и запустить сервис
cp deploy/trustservice.service /etc/systemd/system/trustservice.service
systemctl daemon-reload
systemctl enable --now trustservice
systemctl status trustservice        # должно быть active (running)
journalctl -u trustservice -f        # логи
```

---

## Nginx + HTTPS

Пример vhost — [`deploy/nginx.trust.su10.ru.conf`](../deploy/nginx.trust.su10.ru.conf).

```bash
# 1) выпустить сертификат Let's Encrypt (webroot)
mkdir -p /var/www/certbot
# временно нужен HTTP-vhost, отдающий /.well-known/acme-challenge/ из /var/www/certbot
certbot certonly --webroot -w /var/www/certbot -d trust.su10.ru

# 2) поставить vhost
cp deploy/nginx.trust.su10.ru.conf /etc/nginx/sites-available/trust.su10.ru
ln -s /etc/nginx/sites-available/trust.su10.ru /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

Автопродление сертификата — штатным таймером `certbot.timer` (проверить
`systemctl status certbot.timer`).

Приложение доверяет заголовкам прокси (`trust proxy = 1`) и в `NODE_ENV=production`
ставит cookie с флагом `Secure` — поэтому Nginx обязан передавать
`X-Forwarded-Proto $scheme` (в примере это есть).

---

## Проверка после деплоя

```bash
systemctl status trustservice                 # active (running)
curl -I https://trust.su10.ru/                 # 200
curl -s https://trust.su10.ru/print | grep -o '<svg' | head -1   # QR присутствует
```

- Открыть `https://trust.su10.ru/` — форма и контакты.
- Отправить тестовое обращение → проверить строку в managed-БД
  (`psql "$DATABASE_URL" -c 'select id, full_name, status, created_at from appeals order by id desc limit 3;'`).
- Войти в `https://trust.su10.ru/admin` под сотрудником → обращение в списке, сменить статус.
- Сгенерировать/распечатать QR со страницы `/print` (ведёт на `PUBLIC_URL`).

---

## Обновление кода

```bash
cd /srv/trustservice/app
git pull
npm ci --omit=dev
set -a; . /srv/trustservice/secrets/trust.env; set +a
node src/migrate.js        # применит новые таблицы/изменения (идемпотентно)
systemctl restart trustservice
```

Перед миграциями с изменением схемы — снапшот кластера в консоли Yandex Cloud
(Managed PostgreSQL → Резервные копии → Создать копию).

---

## Локальная разработка (без TLS)

Для локального Postgres на `localhost` TLS не нужен — просто **не задавайте**
`DB_CA_CERT_PATH`, а `DATABASE_URL` укажите без `sslmode`:

```
DATABASE_URL=postgres://trust:trustpass@localhost:5432/trustservice
DB_CA_CERT_PATH=
```

Далее `npm install`, `npm run migrate`, `npm start` (см. [../README.md](../README.md)).
