# Локальные секреты / сертификаты (НЕ коммитятся)

Файлы (`root.crt`, `*.pem`, `*.env`, пароли) в git **не попадают** — игнорируются
в корневом `.gitignore`. В репозитории живут только `.gitkeep` и этот README,
чтобы сохранялась структура каталогов.

На проде зеркальный путь — `/srv/trustservice/secrets/` (каталог `chmod 700`,
владелец `trustservice`).

## Yandex Cloud CA (TLS до Managed PostgreSQL)

Положить корневой сертификат сюда:

```
infra/secrets/yandex-ca/root.crt
```

Скачать:

```
curl -o infra/secrets/yandex-ca/root.crt https://storage.yandexcloud.net/cloud-certs/CA.pem
```

(на проде тот же файл — `/srv/trustservice/secrets/yandex-ca/root.crt`).

Затем прописать путь к нему в `.env` (файл тоже под `.gitignore`):

```
DB_CA_CERT_PATH=<абсолютный путь>/infra/secrets/yandex-ca/root.crt
DATABASE_URL=postgresql://<USER>:<PASSWORD>@<HOST>.mdb.yandexcloud.net:6432/trustservice?sslmode=verify-full
```

## Проверка целостности

Сверять отпечаток, а не печатать содержимое:

```
sha256sum infra/secrets/yandex-ca/root.crt
```
