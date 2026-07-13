# Развёртывание страницы «Служба доверия ООО «СУ-10»»

Статическая страница за nginx, домен `sd.su10.ru`, HTTPS через Let's Encrypt.
Разворачивается под **root**, без отдельного системного пользователя (nginx отдаёт файлы
сам как `www-data`). Node.js, PostgreSQL и сервисы не нужны.

## Предпосылки

- Сервер (Ubuntu/Debian), вход по SSH под root.
- DNS: A-запись `sd.su10.ru` → IP сервера (нужна для выпуска сертификата).

## Команды (под root)

```bash
# 1. Пакеты
apt update && apt install -y nginx certbot python3-certbot-nginx git

# 2. Код (репозиторий публичный). Веб-корень — public/
git clone https://github.com/hoperlex/TrustService.git /var/www/sd.su10.ru

# 3. Nginx vhost (HTTP; HTTPS добавит certbot)
cp /var/www/sd.su10.ru/deploy/nginx.sd.su10.ru.conf /etc/nginx/sites-available/sd.su10.ru
ln -sf /etc/nginx/sites-available/sd.su10.ru /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default        # опционально
nginx -t && systemctl reload nginx

# 4. HTTPS (нужна работающая DNS-запись)
certbot --nginx -d sd.su10.ru --agree-tos -m <ваш-email> --redirect
```

## Проверка

- До DNS: `curl -H 'Host: sd.su10.ru' http://<IP>/` → страница (200).
- После DNS+HTTPS: `curl -I https://sd.su10.ru/` → `200`; телефон/почта на телефоне
  крупные и нажимаются (`tel:` / `mailto:`).

## Обновление содержимого

- Поменять телефон/почту/текст в `public/index.html` → commit/push → на сервере
  `git -C /var/www/sd.su10.ru pull` (страница подхватится сразу).
- QR-код перевыпускать **не нужно** — он ведёт на `sd.su10.ru`.
- Сертификат продлевается автоматически (`certbot.timer`).
