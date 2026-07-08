# Развёртывание страницы «Служба доверия ООО «СУ-10»»

Статическая страница за nginx на VPS, домен `sb.su10.ru`, HTTPS через Let's Encrypt.
Node.js, PostgreSQL и системные сервисы **не нужны** — nginx отдаёт HTML/CSS напрямую.

## Предпосылки

- VPS (Ubuntu/Debian) с установленными `nginx` и `certbot`.
- DNS: A-запись `sb.su10.ru` → IP сервера.

## Шаги

1. **Код** — клонировать репозиторий (веб-корень — `public/`):

   ```bash
   git clone https://github.com/hoperlex/TrustService.git /srv/sb
   chmod -R a+rX /srv/sb/public          # чтобы nginx (www-data) мог читать
   ```

   Обновление содержимого потом: `git -C /srv/sb pull`.

2. **Nginx vhost**:

   ```bash
   cp /srv/sb/deploy/nginx.sb.su10.ru.conf /etc/nginx/sites-available/sb.su10.ru
   ln -s /etc/nginx/sites-available/sb.su10.ru /etc/nginx/sites-enabled/
   nginx -t && systemctl reload nginx
   ```

3. **HTTPS** (Let's Encrypt, webroot):

   ```bash
   mkdir -p /var/www/certbot
   certbot certonly --webroot -w /var/www/certbot -d sb.su10.ru
   systemctl reload nginx
   ```

   Автопродление — штатным `certbot.timer`.

## Проверка

- `curl -I https://sb.su10.ru/` → `200`.
- Открыть на телефоне: телефон и почта — крупные, нажимаются (`tel:` / `mailto:`).

## Обновление содержимого

- Поменять `public/index.html` (телефон, почта, текст) → commit/push → на сервере `git -C /srv/sb pull`.
- QR-код перевыпускать **не нужно** — он ведёт на `sb.su10.ru`, а меняется только содержимое страницы.
