# Установка vBios SHM на новый сервер

Документ предназначен для пользователя без опыта администрирования Linux. Все команды ниже выполняются на Ubuntu-сервере через SSH.

## 1. Что понадобится

- Ubuntu Server 22.04 или 24.04 LTS;
- 2 vCPU, 4 ГБ RAM, 30 ГБ SSD;
- домен, направленный на IP сервера;
- доступ root или пользователь с `sudo`;
- Telegram-бот;
- Yandex Object Storage для изображений;
- платёжные ключи, если будут подключаться оплаты.

Пример домена в инструкции: `pbalka.ru`.

## 2. DNS

Создайте записи типа `A`:

```text
pbalka.ru       SERVER_IP
www.pbalka.ru   SERVER_IP
admin.pbalka.ru SERVER_IP
```

Подождите обновления DNS и проверьте:

```bash
ping -c 3 pbalka.ru
```

## 3. Установка Docker

Подключитесь к серверу:

```bash
ssh root@SERVER_IP
```

Установите Docker и необходимые программы:

```bash
apt update
apt install -y ca-certificates curl git nginx certbot python3-certbot-nginx
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
docker compose version
```

## 4. Загрузка проекта

```bash
mkdir -p /opt/shm
cd /opt/shm
git clone https://github.com/dev-vbs/vbios-ticket-yandex.git .
cp .env.example .env
chmod 600 .env
```

## 5. Заполнение `.env`

Откройте файл:

```bash
nano /opt/shm/.env
```

Минимальная конфигурация:

```env
SHM_REPO=ghcr.io/dev-vbs
CORE_VERSION=latest
CLIENT_VERSION=ghcr.io/dev-vbs/vbios-clients:latest
ADMIN_VERSION=ghcr.io/dev-vbs/vbios-admin:latest

TZ=Europe/Moscow
WORKERS_COUNT=4

MYSQL_DATABASE=webface
MYSQL_USER=webface
MYSQL_PASS=СИЛЬНЫЙ_ПАРОЛЬ_БАЗЫ
MYSQL_ROOT_PASS=СИЛЬНЫЙ_ROOT_ПАРОЛЬ
MYSQL_HOST=mysql
MYSQL_PORT=3306

TICKET_S3_ACCESS_KEY=YCAxxxxxxxx
TICKET_S3_SECRET_KEY=СЕКРЕТНЫЙ_S3_КЛЮЧ

ENABLE_RATE_LIMIT=true
TRUSTED_IPS=
CORS_ALLOWED_ORIGINS=https://pbalka.ru
```

Не публикуйте `.env` и не передавайте S3-ключи frontend-контейнеру.

## 6. Запуск контейнеров

```bash
cd /opt/shm
docker compose pull
docker compose up -d
docker compose ps
```

Проверка состояния:

```bash
docker compose ps
```

Сервисы `mysql`, `redis`, `core`, `api`, `client` должны быть `running` или `healthy`.

## 7. Создание таблиц тикетов и аватаров

```bash
cd /opt/shm
mkdir -p sql
```

Загрузите миграции:

```bash
for file in ticket-3.7.0.sql ticket-object-storage.sql ticket-telegram-images.sql ticket-responder.sql user-avatars.sql; do
  curl -fsSL "https://raw.githubusercontent.com/dev-vbs/vbios-ticket-yandex/main/server/app/sql/$file" -o "sql/$file"
  docker compose cp "sql/$file" mysql:/tmp/$file
done
```

Импортируйте их:

```bash
for file in ticket-3.7.0.sql ticket-object-storage.sql ticket-telegram-images.sql ticket-responder.sql user-avatars.sql; do
  docker compose exec -T mysql sh -lc "mysql -u root -p\"\$MYSQL_ROOT_PASSWORD\" \"\$MYSQL_DATABASE\" < /tmp/$file"
done
```

Проверьте таблицы:

```bash
docker compose exec mysql mysql -u webface -p webface -e \
"SHOW TABLES LIKE 'ticket%'; SHOW TABLES LIKE 'user_avatars';"
```

## 8. Yandex Object Storage

Создайте бакет с DNS-совместимым именем, например:

```text
vbios-ticket-images-2026-48291
```

Бакет должен быть закрытым. Создайте сервисный аккаунт и статический S3-ключ. Выдайте доступ к бакету:

- просмотр объектов;
- загрузка объектов;
- удаление объектов.

В конфигурации SHM создайте или измените ключ `ticket`:

```json
{
  "storage": {
    "provider": "yandex",
    "bucket": "vbios-ticket-images-2026-48291"
  }
}
```

Структура хранения:

```text
avatars/<user_id>/<random>.jpg
 tickets/<user_id>/<random>.jpg
```

Проверьте передачу ключей:

```bash
docker compose exec core sh -lc '
test -n "$TICKET_S3_ACCESS_KEY" && echo ACCESS_OK || echo ACCESS_MISSING
test -n "$TICKET_S3_SECRET_KEY" && echo SECRET_OK || echo SECRET_MISSING
'
```

## 9. Telegram-бот и группа

1. Откройте `@BotFather`.
2. Создайте бота.
3. Сохраните токен в конфигурации Telegram-профиля SHM.
4. Создайте закрытую супергруппу.
5. Включите Topics.
6. Добавьте бота администратором.
7. Разрешите боту отправлять сообщения, фото и файлы, а также управлять темами.

В конфигурации `ticket` укажите:

```json
{
  "id": -1001234567890,
  "telegram_profile": "vBios_BOT",
  "forum_topics": 1,
  "storage": {
    "provider": "yandex",
    "bucket": "vbios-ticket-images-2026-48291"
  }
}
```

После изменения:

```bash
docker compose up -d --force-recreate core spool
```

Изображение профиля пользователя отправляется отдельным фото в теме. Если пользователь не загрузил аватар, используется стандартный fallback Icons8:

```text
https://img.icons8.com/fluency/96/user-male-circle.png
```

## 10. HTTPS и Nginx

Создайте reverse proxy для клиента и API. После настройки получите сертификат:

```bash
certbot --nginx -d pbalka.ru -d www.pbalka.ru
```

Проверьте:

```bash
curl -I https://pbalka.ru
```

## 11. Первый вход

Откройте:

```text
https://pbalka.ru
```

Создайте администратора или используйте предусмотренную проектом первоначальную учётную запись. Сразу смените пароль и включите 2FA.

## 12. Проверка тикетов

Проверьте последовательно:

1. создание обращения в кабинете;
2. отправку текста;
3. отправку фотографии;
4. появление темы в Telegram-группе;
5. ответ сотрудника из темы;
6. доставку ответа пользователю в бот;
7. закрытие тикета кнопкой.

Логи:

```bash
docker compose logs --since=10m core spool api --tail=300
```

## 13. Проверка аватаров

```sql
SELECT user_id, bucket, object_key, mime_type, size
FROM user_avatars;
```

Правильный путь:

```text
avatars/2/....jpg
```

Если тема Telegram была удалена:

```sql
UPDATE tickets
SET telegram_chat_id = NULL,
    telegram_thread_id = NULL,
    telegram_error = NULL
WHERE ticket_id = 13;
```

После нового сообщения тема создастся заново.

## 14. Обновление проекта

Перед обновлением сделайте резервную копию:

```bash
cd /opt/shm
docker compose exec -T mysql sh -lc \
'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" --single-transaction "$MYSQL_DATABASE"' > backup-$(date +%F).sql
```

Обновите проект:

```bash
git pull origin main
docker compose pull
docker compose up -d --force-recreate
```

## 15. Резервное копирование

Храните отдельно:

- дампы MySQL;
- `.env`;
- настройки Nginx;
- содержимое Object Storage.

Периодически проверяйте восстановление дампа на тестовом сервере.

## 16. Частые ошибки

### `Ticket S3 credentials are missing`

Ключи не переданы в `core` или `spool`. Проверьте `.env` и пересоздайте контейнеры.

### `403 Forbidden`

У сервисного аккаунта нет прав на бакет или используются неправильные ключи.

### `404 Not Found`

Объект удалён или указан неправильный бакет/ключ.

### `message thread not found`

Telegram-тема удалена. Сбросьте `telegram_thread_id` в таблице `tickets`.

### Белый экран кабинета

```bash
docker compose pull client
docker compose up -d --force-recreate client
```

Затем очистите данные сайта в браузере и выполните `Ctrl + Shift + R`.

### API недоступен

```bash
docker compose ps
docker compose logs api core --tail=200
docker compose exec api wget -qO- http://127.0.0.1/shm/healthcheck.cgi
```

## 17. Production-безопасность

- используйте HTTPS;
- не открывайте MySQL и Redis наружу;
- не делайте Object Storage публичным;
- не храните секреты в Git;
- используйте длинные пароли;
- ограничьте доступ к админке по IP/VPN;
- включите rate limit;
- регулярно обновляйте Docker-образы;
- проверяйте резервные копии.

## 18. Как изменять конфигурацию SHM

Большая часть настроек хранится в базе данных SHM. Изменяйте их через админку, а не вручную в контейнере.

Основные разделы админки:

- **Конфигурация** — ключи `ticket`, `telegram`, `oauth2`, общие настройки;
- **Пользователи** — пользователи, группы, роли и блокировки;
- **Услуги** — тарифы, стоимость и срок действия;
- **Платёжные системы** — подключение и параметры оплат;
- **Серверы** — серверы VPN и серверные группы;
- **Шаблоны** — тексты Telegram, уведомления и письма;
- **События** — автоматические действия SHM.

После изменения конфигурации обычно достаточно:

```bash
docker compose restart core spool
```

Если менялись переменные `.env`, нужен полный recreate:

```bash
docker compose up -d --force-recreate
```

## 19. Как добавить услугу или тариф

1. Откройте админку.
2. Перейдите в **Услуги**.
3. Нажмите **Создать**.
4. Укажите название, цену, срок действия и категорию.
5. Выберите сервер или серверную группу.
6. Сохраните услугу.
7. Проверьте покупку тестовым пользователем.

После изменения проверьте API:

```bash
curl -s https://pbalka.ru/shm/v1/user/service | head
```

Если услуга не отображается, проверьте статус, права группы пользователя и наличие связанной серверной группы.

## 20. Как добавить платёжную систему

1. Откройте **Платёжные системы**.
2. Выберите нужный провайдер.
3. Нажмите **Установить** или **Настроить**.
4. Вставьте ключи провайдера.
5. Сохраните настройки.
6. Создайте тестовый платёж небольшой суммой.
7. Проверьте возврат пользователя на сайт и запись в **Платежи**.

Секретные ключи нельзя отправлять в Telegram, GitHub или frontend.

При ошибке оплаты:

```bash
docker compose logs --since=15m core spool --tail=300 | grep -Ei "pay|payment|error|webhook"
```

## 21. Как изменить Telegram-настройки

В админке откройте конфигурацию `ticket` и проверьте:

```json
{
  "id": -1001234567890,
  "telegram_profile": "vBios_BOT",
  "forum_topics": 1
}
```

Если бот не отвечает:

```bash
docker compose logs --since=15m core --tail=300 | grep -Ei "telegram|webhook|403|400|timeout"
```

Проверьте, что бот:

- добавлен в группу;
- является администратором;
- может отправлять фото и сообщения;
- может управлять темами;
- не заблокирован пользователем.

## 22. Как проверить конкретный тикет

Найдите тикет в базе:

```sql
SELECT ticket_id, user_id, status, telegram_chat_id,
       telegram_thread_id, telegram_error
FROM tickets
WHERE ticket_id = 13;
```

Проверьте сообщения:

```sql
SELECT message_id, ticket_id, user_id, is_admin, message, created
FROM ticket_messages
WHERE ticket_id = 13
ORDER BY message_id;
```

Проверьте вложения:

```sql
SELECT m.id, m.name, m.mime_type, m.size, m.object_bucket,
       m.object_key
FROM ticket_media m
WHERE m.ticket_id = 13;
```

Если тема удалена в Telegram:

```sql
UPDATE tickets
SET telegram_chat_id = NULL,
    telegram_thread_id = NULL,
    telegram_error = NULL
WHERE ticket_id = 13;
```

После следующего сообщения тема создастся заново.

## 23. Как проверить аватар пользователя

```sql
SELECT user_id, bucket, object_key, mime_type, size, updated_at
FROM user_avatars
WHERE user_id = 2;
```

Путь должен начинаться с:

```text
avatars/2/
```

Проверка объекта в Yandex Storage:

```bash
aws --endpoint-url=https://storage.yandexcloud.net \
  s3api head-object \
  --bucket vbios-ticket-images-2026-48291 \
  --key "avatars/2/OBJECT_KEY.jpg"
```

Если аватар не нужен, удалите его в профиле кнопкой **Удалить**. В базе это также можно проверить:

```sql
SELECT * FROM user_avatars WHERE user_id = 2;
```

## 24. Как проверить ИИ-помощника

Проверьте настройки:

```sql
SELECT JSON_EXTRACT(value, '$.ai.enabled') AS enabled,
       JSON_EXTRACT(value, '$.ai.reply_mode') AS reply_mode,
       JSON_EXTRACT(value, '$.ai.model') AS model,
       IF(JSON_UNQUOTE(JSON_EXTRACT(value, '$.ai.api_key')) <> '', 'KEY_PRESENT', 'KEY_MISSING') AS key_status
FROM config
WHERE `key` = 'ticket';
```

Проверьте задания ИИ:

```sql
SELECT source_message_id, ticket_id, status, error,
       reply_message_id
FROM ticket_ai_jobs
ORDER BY source_message_id DESC
LIMIT 30;
```

Ошибки ИИ:

```bash
docker compose logs --since=15m spool core --tail=300 |
  grep -Ei "ai|timeout|HTTP 4|HTTP 5|read timeout"
```

Статусы заданий:

- `queued` — ожидает spool;
- `done` — ответ создан;
- `error` — провайдер вернул ошибку;
- `retry` — будет повторная попытка.

Не очищайте задания вручную, пока не сохранён текст ошибки.

## 25. Как проверить вход через Telegram

Проверьте настройки клиента и профиль:

```env
TELEGRAM_BOT_NAME=vbiosbot
TELEGRAM_OIDC_AUTH_ENABLE=true
TELEGRAM_BOT_AUTH_PROFILE=vBios_BOT
ALLOW_TELEGRAM_PIN=true
```

После изменения:

```bash
docker compose up -d --force-recreate client core api
```

Логи авторизации:

```bash
docker compose logs --since=15m core api client --tail=300 |
  grep -Ei "telegram|oidc|oauth|auth|state|nonce|callback|error"
```

Проверьте, что callback-домен использует HTTPS и совпадает с доменом кабинета.

## 26. Полезные команды Docker

```bash
docker compose ps
docker compose top
docker compose stats --no-stream
docker compose restart core
docker compose restart spool
docker compose restart api
docker compose restart client
docker compose logs -f core
docker compose logs -f spool
docker compose exec core sh
docker compose exec mysql mysql -u root -p webface
```

Перезапуск одного сервиса обычно безопаснее, чем остановка всего проекта.

## 27. Как понять, где проблема

### Сайт не открывается

```bash
curl -I https://pbalka.ru
docker compose ps client nginx
```

### API возвращает 502/504

```bash
docker compose ps api core
docker compose logs api core --tail=200
```

### Белый экран админки

```bash
docker compose pull admin
docker compose up -d --force-recreate admin
```

Очистите кэш браузера и проверьте консоль JavaScript.

### Не создаётся тикет

Проверьте `tickets`, логи `core`, наличие миграций и права пользователя.

### Текст отправляется, фото нет

Проверьте права бота на отправку фото, ключи Object Storage и `ticket_media`.

### Фото есть в базе, но не открывается

Проверьте `head-object`, bucket, `object_key` и системное время сервера.

### Контейнер постоянно перезапускается

```bash
docker compose ps
docker inspect shm-core-1 --format '{{.State.Status}} {{.State.ExitCode}}'
docker compose logs core --tail=300
```

## 28. Откат обновления

Перед обновлением сохраните версии образов:

```bash
docker compose images > images-before-update.txt
```

Если новая версия не работает, верните предыдущие значения `CORE_VERSION`, `CLIENT_VERSION` и `ADMIN_VERSION` в `.env`, затем:

```bash
docker compose pull
docker compose up -d --force-recreate
```

Базу данных откатывайте только из проверенного дампа и после остановки приложений.
