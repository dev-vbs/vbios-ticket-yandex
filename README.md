# vBios — личный кабинет для SHM

Услуги, подписки, устройства, оплата и поддержка в одном интерфейсе. Светлая и тёмная темы, адаптивная мобильная версия и AJAX-форма входа.

[Полный мануал SHM и расширений](docs/SHM-REMNAWAVE-MANUAL-RU.md) · [Полный конфиг и применение](docs/cabinet-full-config.md) · [Remnawave: серверы и расширения](docs/remnawave-cabinet.md) · [Выбор серверов — шаблон local](docs/remnawave-servers-config-local.txt) · [Установка на сервер](#установка-vbios-shm-на-новый-сервер) · [Галерея скриншотов](docs/screenshots/README.md)

## Превью личного кабинета

Актуальные снимки интерфейса от 18 ноября 2026 года. Все данные демонстрационные: аккаунт, тарифы, баланс, сообщения и показатели мониторинга. Секреты и реальные ключи доступа не используются.

| Тёмная тема | Светлая тема |
| --- | --- |
| ![Кабинет — тёмная тема](docs/screenshots/dashboard.png) | ![Кабинет — светлая тема](docs/screenshots/dashboard-light.png) |

Раскройте нужный раздел, чтобы посмотреть остальные экраны. Нажмите на изображение для просмотра в полном размере.

<details>
<summary><strong>Remnawave: серверы, трафик и расширения</strong></summary>

| Экран | Тёмная тема | Светлая тема |
| --- | --- | --- |
| Диагностика и лимиты | ![Диагностика и лимиты — тёмная тема](docs/screenshots/remna-diagnostics.png) | ![Диагностика и лимиты — светлая тема](docs/screenshots/remna-diagnostics-light.png) |
| Смена тарифа через SHM | ![Смена тарифа через SHM — тёмная тема](docs/screenshots/remna-tariff.png) | ![Смена тарифа через SHM — светлая тема](docs/screenshots/remna-tariff-light.png) |
| График трафика | ![График трафика — тёмная тема](docs/screenshots/remna-traffic.png) | ![График трафика — светлая тема](docs/screenshots/remna-traffic-light.png) |
| История обновлений подписки | ![История обновлений подписки — тёмная тема](docs/screenshots/remna-history.png) | ![История обновлений подписки — светлая тема](docs/screenshots/remna-history-light.png) |
| Платные расширения | ![Платные расширения — тёмная тема](docs/screenshots/remna-addons.png) | ![Платные расширения — светлая тема](docs/screenshots/remna-addons-light.png) |
| Замена ссылки доступа | ![Замена ссылки доступа — тёмная тема](docs/screenshots/remna-revoke.png) | ![Замена ссылки доступа — светлая тема](docs/screenshots/remna-revoke-light.png) |

| На телефоне | Тёмная тема | Светлая тема |
| --- | --- | --- |
| Диагностика и лимиты | ![Диагностика и лимиты — мобильная тёмная тема](docs/screenshots/remna-diagnostics-mobile-dark.png) | ![Диагностика и лимиты — мобильная светлая тема](docs/screenshots/remna-diagnostics-mobile-light.png) |
| Смена тарифа через SHM | ![Смена тарифа через SHM — мобильная тёмная тема](docs/screenshots/remna-tariff-mobile-dark.png) | ![Смена тарифа через SHM — мобильная светлая тема](docs/screenshots/remna-tariff-mobile-light.png) |
| График трафика | ![График трафика — мобильная тёмная тема](docs/screenshots/remna-traffic-mobile-dark.png) | ![График трафика — мобильная светлая тема](docs/screenshots/remna-traffic-mobile-light.png) |
| История обновлений подписки | ![История обновлений подписки — мобильная тёмная тема](docs/screenshots/remna-history-mobile-dark.png) | ![История обновлений подписки — мобильная светлая тема](docs/screenshots/remna-history-mobile-light.png) |
| Платные расширения | ![Платные расширения — мобильная тёмная тема](docs/screenshots/remna-addons-mobile-dark.png) | ![Платные расширения — мобильная светлая тема](docs/screenshots/remna-addons-mobile-light.png) |

</details>

<details>
<summary><strong>Стартовая страница и AJAX-вход</strong></summary>

| Экран | Тёмная тема | Светлая тема |
| --- | --- | --- |
| Стартовая страница | ![Стартовая страница — тёмная тема](docs/screenshots/landing-preview-dark.png) | ![Стартовая страница — светлая тема](docs/screenshots/landing-preview-light.png) |
| Мониторинг серверов | ![Мониторинг серверов — тёмная тема](docs/screenshots/monitor-dark.png) | ![Мониторинг серверов — светлая тема](docs/screenshots/monitor-light.png) |
| Вход в кабинет | ![Вход в кабинет — тёмная тема](docs/screenshots/login.png) | ![Вход в кабинет — светлая тема](docs/screenshots/login-light.png) |
| Регистрация | ![Регистрация — тёмная тема](docs/screenshots/register.png) | ![Регистрация — светлая тема](docs/screenshots/register-light.png) |
| Восстановление пароля | ![Восстановление пароля — тёмная тема](docs/screenshots/password-reset.png) | ![Восстановление пароля — светлая тема](docs/screenshots/password-reset-light.png) |

</details>

<details>
<summary><strong>Все разделы кабинета</strong></summary>

| Экран | Тёмная тема | Светлая тема |
| --- | --- | --- |
| Главная | ![Главная — тёмная тема](docs/screenshots/dashboard.png) | ![Главная — светлая тема](docs/screenshots/dashboard-light.png) |
| Мои услуги | ![Мои услуги — тёмная тема](docs/screenshots/services.png) | ![Мои услуги — светлая тема](docs/screenshots/services-light.png) |
| Карточка услуги | ![Карточка услуги — тёмная тема](docs/screenshots/service-details.png) | ![Карточка услуги — светлая тема](docs/screenshots/service-details-light.png) |
| Центр устройств | ![Центр устройств — тёмная тема](docs/screenshots/device-center.png) | ![Центр устройств — светлая тема](docs/screenshots/device-center-light.png) |
| Параметры подключения | ![Параметры подключения — тёмная тема](docs/screenshots/connection.png) | ![Параметры подключения — светлая тема](docs/screenshots/connection-light.png) |
| Баланс | ![Баланс — тёмная тема](docs/screenshots/balance.png) | ![Баланс — светлая тема](docs/screenshots/balance-light.png) |
| История операций | ![История операций — тёмная тема](docs/screenshots/operations.png) | ![История операций — светлая тема](docs/screenshots/operations-light.png) |
| Уведомления | ![Уведомления — тёмная тема](docs/screenshots/notifications.png) | ![Уведомления — светлая тема](docs/screenshots/notifications-light.png) |
| Поддержка | ![Поддержка — тёмная тема](docs/screenshots/tickets.png) | ![Поддержка — светлая тема](docs/screenshots/tickets-light.png) |
| Переписка с поддержкой | ![Переписка с поддержкой — тёмная тема](docs/screenshots/ticket-conversation.png) | ![Переписка с поддержкой — светлая тема](docs/screenshots/ticket-conversation-light.png) |
| Профиль | ![Профиль — тёмная тема](docs/screenshots/profile.png) | ![Профиль — светлая тема](docs/screenshots/profile-light.png) |
| Помощь | ![Помощь — тёмная тема](docs/screenshots/help.png) | ![Помощь — светлая тема](docs/screenshots/help-light.png) |

</details>

<details>
<summary><strong>Формы и дополнительные действия</strong></summary>

| Экран | Тёмная тема | Светлая тема |
| --- | --- | --- |
| Выбор тарифа | ![Выбор тарифа — тёмная тема](docs/screenshots/order.png) | ![Выбор тарифа — светлая тема](docs/screenshots/order-light.png) |
| Пополнение баланса | ![Пополнение баланса — тёмная тема](docs/screenshots/payment.png) | ![Пополнение баланса — светлая тема](docs/screenshots/payment-light.png) |
| Промокод | ![Промокод — тёмная тема](docs/screenshots/promo.png) | ![Промокод — светлая тема](docs/screenshots/promo-light.png) |
| QR-код подписки | ![QR-код подписки — тёмная тема](docs/screenshots/subscription-qr.png) | ![QR-код подписки — светлая тема](docs/screenshots/subscription-qr-light.png) |
| Создание обращения | ![Создание обращения — тёмная тема](docs/screenshots/ticket-create.png) | ![Создание обращения — светлая тема](docs/screenshots/ticket-create-light.png) |
| Смена пароля | ![Смена пароля — тёмная тема](docs/screenshots/password-change.png) | ![Смена пароля — светлая тема](docs/screenshots/password-change-light.png) |
| Настройка 2FA | ![Настройка 2FA — тёмная тема](docs/screenshots/two-factor.png) | ![Настройка 2FA — светлая тема](docs/screenshots/two-factor-light.png) |
| Passkey | ![Passkey — тёмная тема](docs/screenshots/passkey.png) | ![Passkey — светлая тема](docs/screenshots/passkey-light.png) |

</details>

<details>
<summary><strong>Мобильная версия — 390 px</strong></summary>

| Экран | Тёмная тема | Светлая тема |
| --- | --- | --- |
| Стартовая страница | ![Стартовая страница — тёмная тема](docs/screenshots/mobile-landing-dark.png) | ![Стартовая страница — светлая тема](docs/screenshots/mobile-landing-light.png) |
| AJAX-вход | ![AJAX-вход — тёмная тема](docs/screenshots/mobile-login-dark.png) | ![AJAX-вход — светлая тема](docs/screenshots/mobile-login-light.png) |
| Регистрация | ![Регистрация — тёмная тема](docs/screenshots/mobile-register-dark.png) | ![Регистрация — светлая тема](docs/screenshots/mobile-register-light.png) |
| Главная | ![Главная — тёмная тема](docs/screenshots/mobile-dashboard.png) | ![Главная — светлая тема](docs/screenshots/mobile-dashboard-light.png) |
| Мои услуги | ![Мои услуги — тёмная тема](docs/screenshots/mobile-services.png) | ![Мои услуги — светлая тема](docs/screenshots/mobile-services-light.png) |
| Карточка услуги | ![Карточка услуги — тёмная тема](docs/screenshots/mobile-service.png) | ![Карточка услуги — светлая тема](docs/screenshots/mobile-service-light.png) |
| Центр устройств | ![Центр устройств — тёмная тема](docs/screenshots/mobile-devices.png) | ![Центр устройств — светлая тема](docs/screenshots/mobile-devices-light.png) |
| Выбор тарифа | ![Выбор тарифа — тёмная тема](docs/screenshots/mobile-order.png) | ![Выбор тарифа — светлая тема](docs/screenshots/mobile-order-light.png) |
| Баланс | ![Баланс — тёмная тема](docs/screenshots/mobile-balance.png) | ![Баланс — светлая тема](docs/screenshots/mobile-balance-light.png) |
| История операций | ![История операций — тёмная тема](docs/screenshots/mobile-operations.png) | ![История операций — светлая тема](docs/screenshots/mobile-operations-light.png) |
| Уведомления | ![Уведомления — тёмная тема](docs/screenshots/mobile-notifications.png) | ![Уведомления — светлая тема](docs/screenshots/mobile-notifications-light.png) |
| Поддержка | ![Поддержка — тёмная тема](docs/screenshots/mobile-tickets.png) | ![Поддержка — светлая тема](docs/screenshots/mobile-tickets-light.png) |
| Переписка | ![Переписка — тёмная тема](docs/screenshots/mobile-conversation.png) | ![Переписка — светлая тема](docs/screenshots/mobile-conversation-light.png) |
| Профиль | ![Профиль — тёмная тема](docs/screenshots/mobile-profile.png) | ![Профиль — светлая тема](docs/screenshots/mobile-profile-light.png) |
| Помощь | ![Помощь — тёмная тема](docs/screenshots/mobile-help.png) | ![Помощь — светлая тема](docs/screenshots/mobile-help-light.png) |

</details>

<details>
<summary><strong>Стартовая страница целиком</strong></summary>

| Экран | Тёмная тема | Светлая тема |
| --- | --- | --- |
| Все блоки стартовой страницы | ![Все блоки стартовой страницы — тёмная тема](docs/screenshots/landing-dark.png) | ![Все блоки стартовой страницы — светлая тема](docs/screenshots/landing-light.png) |

</details>

---

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

### Вход, регистрация и привязка через Telegram OIDC

Кабинет использует Authorization Code Flow с PKCE S256, одноразовым state и nonce. Подпись JWT проверяется ключами Telegram, также проверяются issuer, audience и срок действия. Реальный Telegram ID берётся из `id` подписанного профиля, а не из `sub`.

1. Откройте мини-приложение @BotFather, выберите бота → **Login Widget**.
2. В **Allowed URLs** добавьте оба адреса (замените домен своим):
   - `https://pbalka.ru`
   - `https://pbalka.ru/shm/v1/telegram/web/callback`
3. В **Advanced → Signing algorithm** выберите **RS256** (как в рабочем транспорте). **EdDSA и ES256K поддерживают только `openid`, без `profile` и реального Telegram ID.** Именно поэтому токен может содержать только `aud,exp,iat,iss,nonce,sub` несмотря на запрошенный `profile`.
4. Получите **Client ID** и **Client Secret** в этом же разделе BotFather. Client Secret — отдельный секрет OIDC, это не токен бота.
5. В конфигурации `telegram` SHM дополните свой существующий профиль (сохраните его токен и остальные параметры):

```json
{
  "vBios_BOT": {
    "token": "BOT_TOKEN",
    "oidc_enabled": true,
    "client_id": "CLIENT_ID_FROM_BOTFATHER",
    "client_secret": "CLIENT_SECRET_FROM_BOTFATHER"
  }
}
```

Секреты хранятся только на сервере. Не вставляйте их в клиентские переменные и не публикуйте. Client ID относится к приложению/боту, а не к личному ID пользователя.

6. В `/opt/shm/.env` установите:

```dotenv
TELEGRAM_BOT_AUTH_PROFILE=vBios_BOT
TELEGRAM_BOT_AUTH_ENABLE=false
TELEGRAM_OIDC_AUTH_ENABLE=true
```

Имя профиля должно совпадать с ключом в конфигурации `telegram`. Для регистрации новых пользователей регистрация должна быть разрешена в настройках SHM. Имя бота и `/setdomain` старого iframe Widget не заменяют настройки Allowed URLs OIDC.

7. Обновите файлы Compose из репозитория. После успешной публикации образов в GitHub Actions выполните:

```bash
cd /opt/shm
docker compose pull client core
docker compose up -d --force-recreate client core
docker compose ps
```

8. Откройте `/login` заново, без старых параметров callback, обновите страницу и проверьте вход, затем «Профиль → Telegram». После изменения алгоритма в BotFather нужно начать новую авторизацию: старый токен не изменится.

Если `client_id/client_secret is not configured`, проверьте профиль и отдельные OIDC credentials. Если не приходит `id`, проверьте **RS256** и начните вход заново с `openid profile`. Отдельного UserInfo endpoint Telegram не предоставляет. При ошибке `redirect_uri` проверьте точное совпадение callback с Allowed URLs, включая HTTPS, домен и путь. Неверная подпись не обходится: проверьте credentials приложения и актуальность образа core. Не отправляйте токены, cookie и Client Secret в переписку.

Официальная документация: https://core.telegram.org/bots/telegram-login#openid-connect

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

## Настройка страницы помощи

Страница `/help` получает приложения и инструкции из конфигурации SHM с ключом `apps`. [Инструкция и форматы](docs/help-apps.md), [готовый пример JSON](docs/apps-config.example.json).
