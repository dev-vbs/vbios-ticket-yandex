# vBios — биллинг, личный кабинет и поддержка

Модифицированная сборка SHM с личным кабинетом, тикетами, приватными изображениями в Yandex Object Storage и обменом сообщениями с Telegram. Сервер и кабинет поставляются исходниками и собираются в Docker-образы через GitHub Actions.

**Полная инструкция установки находится ниже.** Для действующего сервера: [обновление тикетов](docs/UPGRADE-TICKETS.md), [изменения безопасности](docs/SECURITY-UPGRADE.md).

## Возможности

Настройка входа через Telegram: [Telegram OIDC](docs/TELEGRAM-OIDC.md).

- Личный кабинет: услуги, баланс, платежи и обращения в поддержку.
- Тикеты с текстом и изображениями JPEG, PNG, WebP, GIF до 5 МиБ на файл.
- Полноэкранный просмотр фотографий на тёмном фоне: масштаб до 500%, перемещение, жест двумя пальцами, скачивание оригинала и управление с клавиатуры.
- Приватное хранение вложений в Yandex Object Storage; существующие вложения в базе также поддерживаются.
- Быстрый показ S3-изображений по временным ссылкам после проверки владельца. Повторная загрузка при сбое и отдельная кнопка повторной попытки.
- Выбор ответа: ИИ-помощник или сотрудник поддержки. Сотрудники отвечают из закрытой группы Telegram с темами.
- Передача обращения от ИИ сотруднику с контекстом переписки. После выбора сотрудника результат уже выполняющегося запроса ИИ не публикуется в тикете.
- Текст и изображения между кабинетом, группой поддержки и личным чатом пользователя с ботом.
- Ответ сотрудника с фотографией и подписью приходит в личный бот одним сообщением с кнопкой ответа. [Как отправлять такие ответы](docs/SUPPORT-PHOTO-REPLY.md).

SHM управляет биллингом. Для выдачи VPN нужны отдельно настроенные VPN-панель, тарифы и обработчики услуг. Платёжные провайдеры, почта и меню Telegram подключаются под ваш проект; Compose не создаёт их автоматически.

## Состав проекта

| Путь | Назначение |
|---|---|
| `server/` | Сервер SHM, API, тикеты, интеграции S3 / Telegram / ИИ |
| `client/` | Личный кабинет: React, TypeScript, Mantine, Vite |
| `docker-compose.yml` | Запуск опубликованных образов и зависимостей |
| `.env.example` | Настройки окружения без рабочих секретов |
| `server/app/sql/` | Дополнительная схема тикетов и миграции |
| `docs/new-server/` | Пошаговая установка, HTTPS и примеры конфигураций |
| `.github/workflows/publish.yml` | Сборка и публикация образов GHCR |

## Содержание

1. [Требования](#1-что-потребуется)
2. [Docker и программы](#2-установите-docker-и-необходимые-программы)
3. [Файлы, образы и переменные окружения](#3-подготовьте-файлы)
4. [База данных и миграции](#4-запустите-базу-и-создайте-структуру-shm)
5. [Администратор и запуск](#5-задайте-пароль-администратора)
6. [Домены, Nginx и HTTPS](#6-настройте-nginx-и-получите-https)
7. [Биллинг, тарифы и способы входа](#7-первичная-настройка-биллинга)
8. [Yandex S3 и фотографии](#8-изображения-тикетов-yandex-object-storage)
9. [Telegram, группа и ответы пользователю](#9-telegram-группа-поддержки-и-личный-бот)
10. [ИИ-помощник](#10-ии-помощник--дополнительная-функция)
11. [Проверка запуска](#11-проверка-перед-выдачей-доступа-клиентам)
12. [Резервное копирование](#12-резервная-копия)
13. [Обновление](#13-обновления)
14. [Диагностика](#14-быстрая-диагностика)
15. [Разработка и свой GitHub](#15-разработка-и-свой-github)

Инструкция предназначена для **нового сервера Ubuntu 24.04 x86_64** и текущей сборки этого репозитория. Команды установки выполняются в Bash от root. Для действующей базы не повторяйте первичную установку: сначала сделайте копию и следуйте инструкции обновления. Внешние Telegram, S3, почта, платежи и VPN требуют собственных аккаунтов и проверки после настройки.

## 1. Что потребуется

- Новый сервер с Ubuntu 24.04 LTS x86_64, доступом root через SSH и исходящим HTTPS. Практический стартовый размер: 2 vCPU, 4 ГБ RAM, 30 ГБ SSD; нагрузку и резервные копии учитывайте отдельно.
- Домен и две DNS-записи A: `admin.example.com` и `bill.example.com`, указывающие на публичный IP сервера. Везде ниже заменяйте `example.com` своим доменом. Если есть AAAA, IPv6 также должен вести на этот сервер.
- Доступные извне TCP-порты 80 и 443. SSH оставьте открытым на используемом вами порту. MySQL и Redis публиковать не нужно.
- Для дополнительных функций: бот BotFather, приватная группа поддержки с темами, Yandex Cloud и ключ Timeweb AI Proxy.

SHM — биллинг. Запуск кабинета сам по себе не создаёт VPN-сервер, тарифы, платёжный шлюз и интеграцию Remnawave. Их настройка выполняется отдельно и завершается пробной покупкой.

Все команды ниже выполняются **на новом Linux-сервере в Bash от root**, кроме явно обозначенных команд на компьютере администратора. Не применяйте процедуру первичной установки к рабочей базе.

## 2. Установите Docker и необходимые программы

```bash
apt update
apt install -y ca-certificates curl gnupg git openssl nginx certbot jq nano
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "$VERSION_CODENAME")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker nginx
docker version
docker compose version
```

Если на сервере уже установлен другой Docker, сначала согласуйте его замену с администратором. Для Debian используйте репозиторий Docker для Debian, а не приведённый Ubuntu.

## 3. Подготовьте файлы

Получите исходники и скопируйте подготовленные файлы:

```bash
git clone https://github.com/dev-vbs/vbios-ticket-yandex.git /opt/vbios-source
install -d -m 700 /opt/shm
cp /opt/vbios-source/docker-compose.yml /opt/shm/
cp /opt/vbios-source/.env.example /opt/shm/
cp /opt/vbios-source/docs/new-server/reset-admin.pl /opt/shm/
cp -r /opt/vbios-source/server/app/sql /opt/shm/
cd /opt/shm
cp .env.example .env
chmod 600 .env
nano .env
```

Исходники находятся в `/opt/vbios-source`, рабочие файлы запуска — в `/opt/shm`. В режиме опубликованных образов переменные `VBIOS_SOURCE_DIR` и `VBIOS_CLIENT_SOURCE_DIR` не нужны: код уже находится внутри образов. Не задавайте их вместо ключей S3.

В `.env` задайте два **разных** пароля базы. Получить каждый можно командой `openssl rand -hex 24`. Остальные начальные значения:

```dotenv
TZ=Europe/Moscow
MYSQL_DATABASE=webface
MYSQL_USER=webface
MYSQL_PASS=ЗАМЕНИТЕ_ПАРОЛЕМ
MYSQL_ROOT_PASS=ЗАМЕНИТЕ_ДРУГИМ_ПАРОЛЕМ
MYSQL_HOST=mysql
MYSQL_PORT=3306
ADMIN_PORT=127.0.0.1:9081
CLIENT_PORT=127.0.0.1:9082
PHPMYADMIN_PORT=127.0.0.1:9083
WORKERS_COUNT=4
ENABLE_RATE_LIMIT=false
SHM_REPO=ghcr.io/dev-vbs
CORE_VERSION=latest
ADMIN_VERSION=ghcr.io/dev-vbs/vbios-admin:latest
CLIENT_VERSION=ghcr.io/dev-vbs/vbios-clients:latest
TICKET_S3_ACCESS_KEY=
TICKET_S3_SECRET_KEY=
TIMEWEB_AI_KEY=
```

Не публикуйте `.env` и конфигурации с токенами в GitHub. `latest` меняется: перед рабочим развёртыванием проверьте выбранные образы на тестовом сервере и сохраните их digest. Исходники в GitHub и опубликованные образы могут обновляться в разное время.

### Какие образы загружаются

| Сервис | Образ | Назначение |
|---|---|---|
| core | `ghcr.io/dev-vbs/vbios-core:latest` | SHM, база и интеграции |
| spool | Тот же образ core | Фоновые задания; в Compose две копии |
| api | `ghcr.io/dev-vbs/vbios-api:latest` | Внутренний HTTP-прокси API |
| client | `ghcr.io/dev-vbs/vbios-clients:latest` | Личный кабинет; **clients с s** |
| admin | `ghcr.io/dev-vbs/vbios-admin:latest` | Админ-панель Vite: пользователи, услуги, аналитика, топология |
| mysql / redis | См. Compose | База и временное состояние |
| phpmyadmin | `phpmyadmin:latest` | Доступ к БД через локальный порт |

Кабинет `vbios-client` без `s` текущий workflow не публикует. Не смешивайте его с новым сервером. Core/API/client должны соответствовать одной проверенной версии. MySQL и сторонние образы также зафиксируйте на проверенных версиях/digest после тестирования; обновление `mysql:lts` не выполняйте без проверки совместимости и копии базы.

### Что означают переменные `.env`

| Переменная | Значение / назначение |
|---|---|
| `TZ` | Часовой пояс, например `Europe/Moscow` |
| `MYSQL_DATABASE`, `MYSQL_USER` | База и пользователь SHM |
| `MYSQL_PASS`, `MYSQL_ROOT_PASS` | Разные пароли приложения и администратора MySQL |
| `MYSQL_HOST`, `MYSQL_PORT` | В сети Compose: `mysql`, `3306` |
| `ADMIN_PORT`, `CLIENT_PORT`, `PHPMYADMIN_PORT` | Локальные порты `127.0.0.1:9081/9082/9083` |
| `SHM_REPO`, `CORE_VERSION` | Реестр и тег образов core/api |
| `ADMIN_VERSION`, `CLIENT_VERSION` | Версия админки и полный адрес образа кабинета |
| `WORKERS_COUNT` | Количество обработчиков core, начальное значение `4` |
| `ENABLE_RATE_LIMIT` | Флаг ограничения запросов API; проверьте поведение до включения |
| `TICKET_S3_ACCESS_KEY`, `TICKET_S3_SECRET_KEY` | Пара статических ключей Yandex S3, только backend |

Compose читает `.env` для подстановок, но передаёт контейнеру только переменные из его `environment`/`env_file`. Не выполняйте `source .env`: формат Compose не равен shell-скрипту. Не публикуйте вывод `docker compose config` без `--quiet`: он может содержать пароли.

## 4. Запустите базу и создайте структуру SHM

```bash
cd /opt/shm
# Если почта/Telegram-вход ещё не настроены, в секции client файла
# docker-compose.yml задайте OTP_ENABLE: "false" и
# TELEGRAM_OIDC_AUTH_ENABLE: "false" перед запуском.
docker compose config --quiet
docker compose pull
docker compose up -d mysql redis
docker compose up -d core
docker compose logs --tail=100 core
```

Дождитесь завершения инициализации базы и запуска core без ошибок. Если загрузка GHCR выдаёт `denied`, убедитесь, что пакеты общедоступны, либо выполните `docker login ghcr.io` с аккаунтом, имеющим право читать пакеты. Не вводите токен в командную строку.

На новой базе эта сборка импортирует базовую структуру, но дополнительные таблицы тикетов необходимо проверить и добавить отдельно:

```bash
docker compose cp sql/ticket-3.7.0.sql mysql:/tmp/ticket-3.7.0.sql
docker compose cp sql/ticket-telegram-images.sql mysql:/tmp/ticket-telegram-images.sql
docker compose cp sql/ticket-object-storage.sql mysql:/tmp/ticket-object-storage.sql
docker compose cp sql/ticket-responder.sql mysql:/tmp/ticket-responder.sql
docker compose exec mysql mysql -u root -p webface -e 'SOURCE /tmp/ticket-3.7.0.sql; SOURCE /tmp/ticket-object-storage.sql; SOURCE /tmp/ticket-telegram-images.sql; SOURCE /tmp/ticket-responder.sql; SHOW TABLES LIKE "ticket%";'
```

Введите `MYSQL_ROOT_PASS`. Если изменили имя базы, замените `webface`. SQL содержит создание дополнительных таблиц; он не настраивает облако, Telegram или ИИ. Для существующей базы сначала нужна резервная копия и проверка совместимости схемы: `CREATE TABLE IF NOT EXISTS` не исправляет произвольную старую структуру.

Нужны таблицы `tickets`, `ticket_messages`, `ticket_media`, `ticket_message_media`, `ticket_media_objects`, `ticket_ai_jobs`, `ticket_preferences`, а также `ticket_telegram_links`, `ticket_telegram_received`, `ticket_telegram_media_sent`. Основная схема SHM и дополнительная схема тикетов — разные части. Не импортируйте дамп чужого рабочего проекта вместо структуры.

## 5. Задайте пароль администратора

Используйте приложенный помощник **только при первичной установке**, после инициализации базы. Он задаёт пароль существующему пользователю №1 и завершает его активные сеансы через штатный метод SHM. Пароль не передаётся аргументом процесса.

```bash
cd /opt/shm
docker compose cp reset-admin.pl core:/tmp/reset-admin.pl
read -rsp 'Новый пароль администратора: ' ADMIN_PASSWORD; printf '\n'
printf '%s\n' "$ADMIN_PASSWORD" | docker compose exec -T core perl /tmp/reset-admin.pl
unset ADMIN_PASSWORD
```

Ожидаемый результат: `Admin password updated`. Не используйте предполагаемые стандартные пароли. Логин исходной учётной записи этой сборки — `admin`. Помощник не восстанавливает удалённую учётную запись и не предназначен для сторонних версий SHM.

Затем запустите остальные службы:

```bash
docker compose up -d
docker compose ps
```

По умолчанию запускаются две копии spool. Для одной используйте `docker compose up -d --scale spool=1`. Предупреждение про `deploy.mode` исключено из подготовленного Compose.

## 6. Настройте Nginx и получите HTTPS

Проверьте DNS:

```bash
getent ahostsv4 admin.example.com
getent ahostsv4 bill.example.com
install -d /var/www/letsencrypt
```

Создайте `/etc/nginx/sites-available/vbios` со следующим содержимым, заменив оба домена:

```nginx
server {
    listen 80;
    server_name admin.example.com bill.example.com;
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
        default_type text/plain;
    }
    location / { return 404; }
}
```

Активируйте и проверьте выдачу тестового файла:

```bash
ln -s /etc/nginx/sites-available/vbios /etc/nginx/sites-enabled/vbios
nginx -t && systemctl reload nginx
printf 'acme-check\n' > /var/www/letsencrypt/.well-known-test
install -d /var/www/letsencrypt/.well-known/acme-challenge
cp /var/www/letsencrypt/.well-known-test /var/www/letsencrypt/.well-known/acme-challenge/check
curl -f http://admin.example.com/.well-known/acme-challenge/check
curl -f http://bill.example.com/.well-known/acme-challenge/check
```

Проверьте эти URL также из внешней сети: должны вернуть `acme-check`. Если приходит 404, проверьте A/AAAA, активный виртуальный хост, CDN и доступ на порт 80. Повторение Certbot без исправления маршрута не поможет. При существующем конфиге с такими же доменами объедините настройки, не создавайте дубликаты.

```bash
certbot certonly --webroot -w /var/www/letsencrypt \
  -d admin.example.com -d bill.example.com \
  --agree-tos -m admin@example.com
```

Только после успешного выпуска замените файл `vbios` содержимым из `/opt/vbios-source/docs/new-server/nginx-vbios.conf.example`. В нём замените домены и путь сертификата на фактический из вывода Certbot (`certbot certificates`). Затем:

```bash
nginx -t && systemctl reload nginx
install -d /etc/letsencrypt/renewal-hooks/deploy
printf '#!/bin/sh\nnginx -t && systemctl reload nginx\n' > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx
chmod 755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx
certbot renew --dry-run
```

Откройте `https://admin.example.com` и войдите как `admin` с заданным паролем. Кабинет клиента: `https://bill.example.com`. phpMyAdmin оставлен на локальном интерфейсе; при необходимости открывайте его через SSH-туннель с компьютера администратора: `ssh -L 9083:127.0.0.1:9083 root@SERVER_IP`, затем `http://127.0.0.1:9083`.

## 7. Первичная настройка биллинга

В административной панели проверьте название проекта, адрес кабинета, контакты поддержки и доступные способы регистрации. Создайте тестового клиента. Настройте почту/OTP, если используете вход по коду; включение кнопки OTP в интерфейсе само по себе не настраивает отправку писем.

Создайте услуги и тарифы, подключите используемую VPN-панель и обработчики выдачи/продления/удаления услуг. Для Remnawave нужны собственные адрес панели, токен, squads и рабочие шаблоны интеграции. Для платежей нужны договор/аккаунт провайдера, ключи и callback URL именно выбранного модуля. Универсального платёжного токена SHM нет.

В корневом Compose Telegram OIDC и OTP включены. Перед первым запуском измените `OTP_ENABLE` и `TELEGRAM_OIDC_AUTH_ENABLE` в секции client на `"false"`, если соответствующие способы входа ещё не настроены. Включайте их после отдельной проверки входа по паролю и настройки провайдеров. Бот поддержки и Telegram-вход в кабинет — разные интеграции.

### Настройки интерфейса и Telegram OIDC

Переменные готового кабинета задавайте в `client.environment` файла Compose **без `VITE_`**. Флаги ниже не настраивают backend и не создают бота:

```yaml
    environment:
      SHM_HOST: http://api
      SHM_BASE_PATH: /
      APP_NAME: vBios
      OTP_ENABLE: "false"
      TELEGRAM_BOT_NAME: "YOUR_BOT_USERNAME"
      TELEGRAM_BOT_AUTH_PROFILE: "vBios_BOT"
      TELEGRAM_BOT_AUTH_ENABLE: "false"
      TELEGRAM_OIDC_AUTH_ENABLE: "false"
      TELEGRAM_WEBAPP_AUTH_ENABLE: "false"
      TELEGRAM_WEBAPP_AUTO_AUTH_ENABLE: "false"
      TELEGRAM_WEBAPP_PROFILE: "vBios_BOT"
      ALLOW_TELEGRAM_PIN: "true"
```

Это фрагмент существующего `client`, а не второй сервис. Username бота без `@` и имя профиля `vBios_BOT` — разные значения. Имя профиля чувствительно к регистру. `OTP_ENABLE` включайте после настройки OTP/почты; серверные разрешения входа проверяются независимо от видимости кнопок. WebApp и старый Widget включайте только если настраиваете именно эти способы входа.

Для OIDC получите Client ID/Client Secret в настройках Telegram Login вашего бота, разрешите домен кабинета и callback `https://bill.example.com/shm/v1/telegram/web/callback`. В существующий профиль `config.telegram.vBios_BOT` добавьте:

```json
{
  "oidc_enabled": true,
  "client_id": "YOUR_TELEGRAM_LOGIN_CLIENT_ID",
  "client_secret": "YOUR_TELEGRAM_LOGIN_CLIENT_SECRET"
}
```

Это поля профиля, не замена всего `config.telegram`. Токен бота не заменяет OIDC Client Secret. В существующей `config.billing` разрешите `allow_user_auth_api: true`; `allow_user_register_api` выставьте по своей политике регистрации. Затем включите `TELEGRAM_OIDC_AUTH_ENABLE: "true"` и пересоздайте `client`. Core должен иметь доступ к `oauth.telegram.org`, а Redis — хранить одноразовое состояние входа. Не очищайте Redis во время авторизации.

```bash
cd /opt/shm
docker compose up -d --force-recreate client
curl -fsS https://bill.example.com/shm/v1/system/auth | jq .
```

В актуальном кабинете явный флаг OIDC сохраняет кнопку даже при отключённом ответе `/system/auth`; это не отменяет необходимость настроить сервер. Вход и callback должны работать на **одном HTTPS-домене кабинета**, чтобы браузер передал защищённые cookie. Проверьте вход в приватном окне, обновление страницы, выход, привязку из профиля и повторную привязку своего аккаунта. Telegram другого пользователя автоматически не переносится. Полная схема и маршруты: [Telegram OIDC](docs/TELEGRAM-OIDC.md).

Контакты и документы задаются через поддерживаемые переменные кабинета: `SUPPORT_LINK`, `CONTACT_EMAIL`, `PRIVACY_POLICY_URL`, `RETURN_POLICY_URL`, `TERMS_OF_USE_URL`, `PUBLIC_OFFER_URL`, `USER_AGREEMENT_URL`. Это ссылки на опубликованные документы; сам текст соглашения и права администратора ими не создаются. Полный список параметров интерфейса: [client/entry.sh](client/entry.sh) и [client/src/config.ts](client/src/config.ts). Не включайте в эти параметры токены.

## 8. Изображения тикетов: Yandex Object Storage

1. Создайте облако с активным платёжным аккаунтом и отдельный каталог для вложений.
2. В каталоге создайте сервисный аккаунт `vbios-ticket-storage`. Для простого развёртывания назначьте ему `storage.editor` на этот отдельный каталог. Не держите в каталоге чужие бакеты.
3. Создайте приватный бакет с уникальным именем, например `mycompany-ticket-images-unique`. Публичное чтение и список объектов выключите. Используйте стандартный класс хранения.
4. Создайте **статический ключ доступа** сервисного аккаунта. Это пара Access Key ID / Secret Access Key, не IAM-токен.
5. Запишите ключи в `/opt/shm/.env` в `TICKET_S3_ACCESS_KEY` и `TICKET_S3_SECRET_KEY`.
6. В разделе конфигурации SHM создайте ключ `ticket` с JSON из `/opt/vbios-source/docs/new-server/ticket.example.json`. Замените бакет; Telegram и ИИ можно подключить позднее. Для работы только кабинета уберите поля `id`, `telegram_profile`, `forum_topics`.

```bash
cd /opt/shm
docker compose up -d --no-deps --force-recreate core spool
```

Простой `restart` не перечитывает изменённые переменные контейнеров. Ключи AWS CLI на хосте также не передаются в SHM автоматически. Настройки endpoint/региона реализации: `https://storage.yandexcloud.net`, `ru-central1`.

Бакет остаётся приватным. API проверяет владельца и выдаёт временную подписанную ссылку на 15 минут; браузер показывает изображение напрямую из Object Storage. Не публикуйте эти ссылки: до истечения срока они дают доступ к файлу. Для показа через img публичный бакет и браузерный CORS не нужны. Скачать файл можно через прежний авторизованный API. Поддерживаются JPEG, PNG, GIF, WebP до 5 МиБ на файл; это не загрузка любых документов и видео.

Создайте тикет с текстом и маленькой PNG-картинкой. Изображение должно открыться в кабинете и появиться в бакете. `403 AccessDenied` требует проверки роли, bucket policy, соответствия ключей и бакета. Если AWS CLI с **теми же ключами из контейнера** пишет объект успешно, а SHM нет — проверяйте версию `TicketStorage.pm`, подпись запроса и параметры, а не делайте бакет публичным.

Подробная инструкция по консоли облака включена в [YANDEX-CLOUD-TICKETS.md](docs/new-server/YANDEX-CLOUD-TICKETS.md).

### Полный пример `config.ticket`

В админке: раздел конфигурации → ключ `ticket` → JSON-значение. Это запись базы SHM, а не переменная `.env` и не файл Compose. Для новой установки используйте пример ниже; в существующей записи объединяйте поля, сохраняя свои настройки. Замените ID группы, домен и бакет. ИИ включайте после отдельной проверки ключа.

```json
{
  "id": -1001234567890,
  "telegram_profile": "vBios_BOT",
  "forum_topics": 1,
  "admin_user_url_template": "https://admin.example.com/users/{user_id}",
  "storage": {
    "provider": "yandex",
    "bucket": "REPLACE_WITH_PRIVATE_BUCKET"
  },
  "ai": {
    "enabled": false,
    "main_chat_enabled": false,
    "api_key": "",
    "model": "dashscope/qwen3.5-flash",
    "reply_mode": "auto",
    "history_messages": 6,
    "max_replies_per_ticket": 5,
    "max_tokens": 700,
    "timeout_seconds": 12,
    "instructions": "Ты помощник поддержки сервиса. Помогай с кабинетом, оплатой и подключением VPN. Не утверждай, что проверил баланс или изменил услугу. Не запрашивай пароли, токены и ссылки подписки. Не выдумывай тарифы и способы оплаты. Если требуется действие сотрудника, предложи обратиться в поддержку. Отвечай понятно и по шагам."
  }
}
```

Для кабинета без Telegram удалите `id`, `telegram_profile`, `forum_topics`. Для хранения в БД вместо облака используйте `"storage": {"provider": "database"}` — это отдельный выбранный режим, а не исправление неверных S3-ключей. Старые объекты облака по-прежнему требуют доступа к своему бакету. Пароли S3 остаются в окружении backend; не помещайте их в JavaScript клиента.

### Проверка ключей внутри контейнеров

После сохранения ключей и пересоздания выполните проверку, которая не выводит значения:

```bash
cd /opt/shm
for service in core spool; do
  printf '%s: ' "$service"
  docker compose exec -T "$service" sh -c '
    if [ -n "$TICKET_S3_ACCESS_KEY" ] && [ -n "$TICKET_S3_SECRET_KEY" ]; then
      echo "Оба ключа S3 переданы"
    else
      echo "ОШИБКА: ключи S3 отсутствуют"; exit 1
    fi
  ' || break
done
```

Если появляется `Ticket S3 credentials are missing`, сначала исправьте передачу **обоих** ключей в `core` и `spool`. Наличие ключей в AWS CLI на хосте этого не подтверждает. В [корневом Compose](docker-compose.yml) нужные поля уже присутствуют. Для двух реплик spool проверяйте состояние обеих через `docker compose ps`; после пересоздания обе получают одинаковое окружение.

## 9. Telegram: группа поддержки и личный бот

Создайте бота через BotFather. Добавьте его администратором в закрытую супергруппу поддержки с включёнными темами. Разрешите отправлять сообщения/фото/файлы и управлять темами. Доступ в эту группу должен быть только у сотрудников: ответы в теме обрабатываются как ответы поддержки.

В конфигурации SHM создайте ключ **`telegram`**. Для существующей записи объедините поля: не удаляйте другие профили и настройки OIDC:

```json
{
  "server": "https://api.telegram.org",
  "vBios_BOT": {
    "token": "ТОКЕН_ОТ_BOTFATHER",
    "secret": "СЛУЧАЙНАЯ_СТРОКА"
  }
}
```

Секрет можно получить `openssl rand -hex 32`. В `ticket` укажите настоящий отрицательный ID супергруппы, `telegram_profile: "vBios_BOT"`, `forum_topics: 1`. Регистр профиля должен совпадать везде.

Для меню установите свой проверенный Telegram-шаблон с ID `telegram_bot` в шаблонах SHM и все его зависимые шаблоны. Большое меню с проверкой, соглашением и покупкой не устанавливается Docker Compose автоматически. Этот комплект не содержит универсального рабочего меню: его команды зависят от ваших тарифов и обработчиков. Если родительский шаблон вызывает `start`, `profile`, `manage_services`, `pays`, `checkpay`, `ref_bonus`, `pricelist_test`, эти шаблоны тоже должны существовать. Ошибка в шаблоне не устраняется перерегистрацией webhook.

В конфигурации `settings` объедините с существующими полями:

```json
{"telegram":{"profile":"vBios_BOT","username":"ИМЯ_БОТА_БЕЗ_СОБАКИ"}}
```

Зарегистрируйте webhook на сервере; введите тот же token/secret, что в SHM:

```bash
read -rsp 'Bot token: ' TG_TOKEN; printf '\n'
read -rsp 'Webhook secret: ' TG_SECRET; printf '\n'
TG_URL='https://admin.example.com/shm/v1/telegram/bot/telegram_bot?tg_profile=vBios_BOT'
tg_request() {
  local method="$1"; shift
  curl --config <(printf 'url = "https://api.telegram.org/bot%s/%s"\n' "$TG_TOKEN" "$method") \
    --silent --show-error --connect-timeout 10 --max-time 30 "$@"
}
tg_request getMe | jq '{ok,description,username:.result.username}'
jq -n --arg url "$TG_URL" --arg secret "$TG_SECRET" \
  '{url:$url,secret_token:$secret,allowed_updates:["message","callback_query","my_chat_member"]}' |
  tg_request setWebhook --header 'Content-Type: application/json' --data-binary @- | jq .
tg_request getWebhookInfo | jq '{ok,result:{url:.result.url,pending_update_count:.result.pending_update_count,last_error_message:.result.last_error_message}}'
unset TG_TOKEN TG_SECRET TG_URL
unset -f tg_request
```

Успешный ответ `setWebhook` — `ok: true`. Пользователь должен запустить бота и связать Telegram с тем же аккаунтом кабинета. Иначе бот не сможет первым написать человеку или определить владельца тикета.

Если исходящее соединение с `api.telegram.org` недоступно, Nginx для `admin`/`bill` это не исправит. Нужен отдельный доступный Telegram API relay на сервере с доступом к Telegram, а в `telegram.server` — его базовый HTTPS URL. Relay должен пропускать **оба** пути: `/botTOKEN/...` и `/file/botTOKEN/...`, иначе сообщения работают, а загрузка входящих картинок нет. Ограничьте relay IP-адресом SHM и отключите журналирование URL с токенами. Не направляйте `/botTOKEN` в веб-интерфейс администратора: это вызывает HTML/405 вместо JSON Telegram.

Проверка обмена: клиент отправляет тикет с текстом и фото → сообщение появляется в теме группы; сотрудник отвечает в теме фото с подписью → ответ виден в кабинете и личном чате пользователя с ботом. Фото предназначается владельцу тикета, а группа используется сотрудниками. Альбомы обрабатываются отдельными сообщениями.

## 10. ИИ-помощник — дополнительная функция

Сначала проверьте обычные тикеты. Затем в `ticket.ai` замените ключ и включите `enabled: true`. Нужен ключ **Timeweb AI Proxy**, ожидаемый сервисом (обычно `sk-…`), а не JWT личного кабинета. Доступность модели уточняйте у провайдера.

В личном кабинете выбор получателя убран: новое обращение направляется ИИ, если он доступен, иначе сотруднику. Внутри обращения кнопка «Связаться с оператором» или слово «ОПЕРАТОР» отключает ИИ для обращения, включая результат запроса, который уже выполнялся. При передаче сотруднику история передаётся в группу поддержки. После ответа сотрудника обратное включение ИИ в том же тикете запрещено.

`max_tokens`, `history_messages`, `max_replies_per_ticket`, `timeout_seconds` задавайте JSON-числами без кавычек. `reply_mode: "auto"` сохраняет ответ в тикете, `draft` — черновой результат. Текущая интеграция не гарантирует отдельного Telegram-уведомления для каждого ответа ИИ. Изображения ИИ не анализирует и действия с услугами/балансом не выполняет.

Ключ можно хранить в `ticket.ai.api_key`; это доступный в админке серверный секрет. Код также читает `TIMEWEB_AI_KEY`, который имеет приоритет, текущий Compose передаёт его в core и spool. После изменения `.env` пересоздайте оба сервиса; простой restart не обновляет окружение.

Если `instructions` заполнен, текст берётся оттуда. Иначе нужен файл `/app/data/ticket-ai-prompt.txt`. Не включайте ИИ без уведомления пользователей о передаче текста обращений внешнему провайдеру.

Диагностика:

```bash
cd /opt/shm
docker compose exec mysql mysql -u webface -p webface -e 'SELECT source_message_id,ticket_id,status,error,reply_message_id FROM ticket_ai_jobs ORDER BY source_message_id DESC LIMIT 10;'
```

401 — авторизация провайдера; 400 — тело запроса/модель/тип параметров; 500 — нужен текст ошибки провайдера и журнал core. `AI response or persistence failed` — общая ошибка, её нельзя исправить одним изменением пароля базы. Старые неудачные задания автоматически повторяться не обязаны: проверяйте новым сообщением, не удаляя историю.

### ИИ в основном чате Telegram и передача оператору

После проверки провайдера задайте в существующей записи `ticket.ai`:

```json
{
  "enabled": true,
  "main_chat_enabled": true,
  "reply_mode": "auto",
  "history_messages": 6,
  "max_tokens": 700,
  "timeout_seconds": 12,
  "max_replies_per_ticket": 5
}
```

Это фрагмент: объедините его с существующим `ai`, сохранив модель, ключ и `instructions`. Пользователь должен быть зарегистрирован в SHM и связан с профилем бота. Обычные текстовые сообщения без команды и без Telegram Reply используют открытый диалог основного чата. Команды `/start` и кнопки меню остаются в шаблоне. Фото и Reply обслуживаются отдельной логикой тикетов.

Слово **ОПЕРАТОР** (регистр не важен) переключает обращение на сотрудника. ИИ молчит до закрытия этого обращения. В группе создаётся тема с номером тикета, именем/логином и ID клиента; в неё передаётся последняя история. Сотрудник отвечает в этой теме — ответ доставляется пользователю. После закрытия следующее обычное сообщение создаёт новый диалог.

В кабинете та же передача доступна кнопкой **«Связаться с оператором»**. Если Telegram вернул ошибку доставки, пользователь увидит возможность повторить передачу. История остаётся в кабинете независимо от доставки в Telegram.

### Закрытие обращения сотрудником

В теме группы нажмите **«✅ Закрыть тикет»** или отправьте `/close`. Закрытие разрешено владельцу/администратору настроенной Telegram-группы. Другой участник не может закрыть тикет. После закрытия бот пытается уведомить пользователя в личном чате и удаляет тему Telegram вместе с сообщениями. История тикета в базе SHM сохраняется. Для удаления темы боту нужны административные права `can_delete_messages`; для создания тем — `can_manage_topics`.

Кнопка появляется в новых уведомлениях после обновления core. Старые сообщения Telegram автоматически не меняются; в старой теме используйте `/close`. Заблокированный пользователем бот не сможет доставить личное уведомление.

### Промпт из файла ticket-ai-prompt.txt

Предпочтительный вариант — сохранить текст в `ticket.ai.instructions` через конфигурацию админки. Тогда копировать файл в контейнер не требуется.

Если хотите читать именно файл, оставьте `instructions` пустым и разместите его в общем томе `/app/data`:

```bash
cd /opt/shm
test -s ticket-ai-prompt.txt || { echo "Файл отсутствует или пустой"; exit 1; }
docker compose exec -T core sh -c 'cat > /app/data/ticket-ai-prompt.txt' < ticket-ai-prompt.txt
docker compose exec -T core test -s /app/data/ticket-ai-prompt.txt
```

Файл должен быть UTF-8. Core и spool используют один том `shm-data`, поэтому достаточно одной копии. Файл в `/opt/shm` сам по себе контейнеру не виден. Заполненный `instructions` имеет приоритет над файлом. Новые запросы читают файл заново.

Таймаут 12 секунд ограничивает ожидание, а не гарантирует скорость генерации. При медленном провайдере запрос завершится ошибкой. Короткая история и меньший лимит ответа уменьшают объём запроса, но не устраняют HTTP 500 провайдера.

## 11. Проверка перед выдачей доступа клиентам

- Все контейнеры запущены, API и база проходят healthcheck; домены открываются по HTTPS.
- У администратора собственный пароль; тестовый пользователь не имеет административных прав.
- Регистрация, вход и восстановление проверены выбранным способом.
- Покупка и продление тестовой услуги меняют сроки/баланс корректно; повторный callback оплаты не дублирует зачисление.
- Удаление/блокировка услуги проверены на тестовом аккаунте.
- Тикет с текстом и изображением доступен его владельцу; другой клиент его не видит.
- Ответ сотрудника с подписью и картинкой приходит в кабинет и личный бот, если Telegram подключён.
- Настроены резервное копирование и пробное восстановление; сохранены версии образов.

## 12. Резервная копия

Храните копии вне сервера с ограниченным доступом: в них персональные данные и секреты. Для согласованного снимка на время копирования остановите приём запросов и фоновые обработчики:

```bash
cd /opt/shm
umask 077
BACKUP_DIR="/root/vbios-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
docker compose stop client admin api spool core
if ! docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump -u root --single-transaction --set-gtid-purged=OFF --routines --events --triggers "$MYSQL_DATABASE"' > "$BACKUP_DIR/database.sql"; then
  echo 'Ошибка выгрузки базы: не считайте копию завершённой'
fi
cp .env docker-compose.yml "$BACKUP_DIR/"
docker compose run --rm --no-deps --entrypoint tar core -C /app/data -czf - . > "$BACKUP_DIR/shm-data.tar.gz"
docker compose up -d
```

Проверьте коды завершения, размеры файлов и восстановление на отдельном сервере. Каталог копии надо перенести во внешнее защищённое хранилище. Отдельно копируйте приватный S3-бакет средствами Object Storage: SQL содержит ссылки на объекты и не содержит байты новых S3-вложений. Удаление бакета сделает вложения недоступными даже при сохранной базе. Сохраняйте конфигурации Nginx и собственные исходники/шаблоны.

Восстановление выполняйте сначала на изолированном сервере: те же версии образов, пустая БД, импорт SQL, восстановление `/app/data`, доступ к копии бакета и секретам, затем запуск и проверка. Не включайте реальные webhook, платежи и фоновые действия на тестовой копии. Команда `docker compose down -v` удаляет тома — для обновления она не нужна.

### Восстановление на отдельном сервере

1. Подготовьте изолированный сервер с Docker и теми же версиями образов. Не направляйте на него рабочие домены/webhook.
2. Восстановите `.env` и Compose из копии, проверьте имена томов и пароли. Запустите только MySQL/Redis; дождитесь healthcheck.
3. В пустую подготовленную базу импортируйте проверенный дамп. При стандартном имени базы команда выглядит так:

   ```bash
   cd /opt/shm
   docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -u root "$MYSQL_DATABASE"' < /root/restore/database.sql
   ```

4. До старта core восстановите файлы из проверенного архива `/app/data`:

   ```bash
   docker compose run --rm -T --no-deps --entrypoint tar core -C /app/data -xzf - < /root/restore/shm-data.tar.gz
   ```

5. Восстановите объекты S3 и убедитесь, что bucket/object_key в таблицах совпадают с доступными объектами. Если имя бакета изменилось, нужна согласованная миграция метаданных, а не только смена `config.ticket.storage.bucket`.
6. Проверьте Nginx, HTTPS, вход, баланс и вложения. Core при запуске может применять миграции: сначала используйте исходные версии образов. Spool запускайте только после исключения повторных уведомлений, платежей и действий с реальными услугами.
7. После проверки согласованно переключайте домены/webhook и запускайте рабочие службы. Сохраняйте предыдущую копию до завершения проверки.

Импорт заменяет данные в целевой базе: команды предназначены для отдельного восстановления, не для выполнения поверх работающего проекта.

## 13. Обновления

Сначала сделайте проверенную копию. Прочитайте изменения схемы и проверьте обновление на тестовой копии. Подготовленные GitHub Actions публикуют образы, но не обновляют сервер автоматически.

```bash
cd /opt/shm
docker compose images
docker compose pull
docker compose up -d
docker compose ps
docker compose logs --since=5m core spool api
```

Если требуется отдельный SQL, применяйте только миграцию выбранной версии по её инструкции. Откат образа не отменяет изменения базы. Изменение `MYSQL_PASS` в `.env` не меняет пароль уже созданного пользователя MySQL: пароль в базе и окружение нужно менять согласованно.

## 14. Быстрая диагностика

| Симптом | Что проверить |
|---|---|
| `/entry.sh: permission denied` | Загружен старый образ; исправления Dockerfile должны попасть в опубликованный core/api |
| Таблица `ticket_ai_jobs` отсутствует | Применена ли дополнительная схема тикетов именно к текущей базе |
| Загрузка изображения 413 | `client_max_body_size 10m` на внешнем Nginx и лимиты промежуточных прокси |
| `Ticket S3 credentials are missing` | Оба ключа в `.env`, оба поля `environment` в core/spool, затем `up --force-recreate`; AWS CLI на хосте недостаточно |
| Загрузка 500 / storage 403 | Журнал core, версия S3-модуля, ключи контейнера, bucket policy |
| Telegram 405 / ошибка JSON | Запрос Bot API попал в админку/HTML, неверный маршрут relay |
| Сообщения Telegram есть, фото нет | Маршрут `/file/botTOKEN`, права группы, актуальные модули, лимит файла |
| Личный бот молчит | Пользователь запустил и связал бота, совпадает профиль, webhook без ошибки |
| `selective must be Boolean` | Старый Telegram.pm: нужны настоящие JSON boolean, не число 1 |
| Certbot выдаёт 404 | DNS A/AAAA и публичная выдача challenge на нужном сервере |
| Поменяли `.env`, эффекта нет | Пересоздание контейнера вместо простого restart |

```bash
cd /opt/shm
docker compose ps
docker compose logs --since=10m core spool api
```

Перед передачей журналов удаляйте токены, cookies, ссылки подписок и персональные данные. Если токен уже опубликован, замените его у провайдера. Этот комплект сверен с исходниками; реальное развёртывание на вашем новом сервере и внешние сервисы должны пройти проверку по разделу 11.

## 15. Разработка и свой GitHub

Сборка через готовые образы не требует исходников на сервере. Для своего форка:

1. Создайте fork репозитория в GitHub и включите Actions.
2. Проверьте разрешение workflow публиковать пакеты GHCR (`packages: write`).
3. После push в `main` дождитесь успешных тестов и всех трёх сборок в Actions. Workflow собирает `linux/amd64`, spool использует core.
4. Сделайте пакеты общедоступными либо настройте авторизованное скачивание на сервере.
5. В серверной `.env` укажите `SHM_REPO=ghcr.io/your-owner` и `CLIENT_VERSION=ghcr.io/your-owner/vbios-clients:latest`; используйте имя владельца GHCR в нижнем регистре.
6. Обновите образы по разделу 13. Push в GitHub сам сервер не обновляет.

Текущие образы проекта: `ghcr.io/dev-vbs/vbios-core`, `ghcr.io/dev-vbs/vbios-api`, `ghcr.io/dev-vbs/vbios-clients`. Workflow: [.github/workflows/publish.yml](.github/workflows/publish.yml). Для приватного реестра используйте `docker login ghcr.io` с правом чтения пакетов; не вставляйте токен в историю shell.

Проверка кабинета на машине разработчика (нужен Node.js, совместимый с текущим Vite):

```bash
cd client
npm ci
npm run build
```

Проверки серверной логики из корня репозитория, как в CI (Perl, Test::More, JSON, LWP, URI):

```bash
prove media-multipart-test.t media-private-copy-test.t ticket-delivery-test.t support-caption-test.t oidc-cabinet-test.t security-boundaries-test.t telegram-binding-test.t
```

Эти проверки не заменяют запуск на настоящих MySQL, Telegram и Yandex S3. Инструкция сверена с исходниками и примерами; установка на чистую VM и реальные облачные подключения требуют проверки владельцем установки. Изменения безопасности и ограничения совместимости описаны в [SECURITY-UPGRADE.md](docs/SECURITY-UPGRADE.md).

## Лицензии и поддержка

Проект содержит модификации сторонних компонентов SHM и клиента. Сохраняйте лицензии и уведомления из `server/` и `client/`; этот README их не заменяет. Владелец установки отвечает за свои тарифы, платежи, политику хранения обращений и юридические документы. Пользователям передавайте адрес кабинета и публичный контакт поддержки, а не `.env`, доступ к серверу или служебную группу Telegram.

## Новая админ-панель vBios

Исходники находятся в `admin/`. Панель использует API из `server/`: пользователи, профили, услуги, подписки клиентов, платежи, списания, бонусы, промокоды, серверы, группы серверов, задания, шаблоны, события, конфигурация, аналитика и топология. Браузер работает с API через Nginx того же домена; открывать внутренний API-порт в интернет не требуется. API проверяет права независимо от интерфейса.

В `.env` переменная `ADMIN_VERSION` содержит **полное имя образа**, например `ghcr.io/dev-vbs/vbios-admin:latest` или `ghcr.io/dev-vbs/vbios-admin:sha-75409a4`. Пример SHA показывает формат; используйте опубликованный тег нужного коммита. Не задавайте просто `3` или `latest`.

```bash
cd /opt/shm
docker compose pull admin
docker compose up -d --force-recreate admin
```

GitHub Actions должен завершиться успешно до загрузки нового образа. Compose не скачивает новый файл конфигурации автоматически. Если обновляете Compose из репозитория, предварительно сделайте копию и перенесите свои изменения. Сохраняйте прежнее имя проекта/каталог `/opt/shm`: иначе Docker может создать другие тома и показать пустую базу.

### Ошибка dependency api has no healthcheck configured

Используйте текущий Compose: в `api.healthcheck` проверяется `http://127.0.0.1/shm/healthcheck.cgi`. Admin/client ожидают `service_healthy`. После изменения пересоздайте API:

```bash
docker compose config --quiet && docker compose up -d --force-recreate api admin client
```

Если статус `unhealthy`, проверяйте `docker compose logs --since=5m core api`, а не убирайте зависимость. Проверка конфигурации подтверждает синтаксис, но не доступность базы, провайдеров и Telegram.

### Минимальная проверка установки

1. Открывается HTTPS админки и кабинета, вход/выход работают.
2. `docker compose ps` показывает здоровые mysql, redis, api.
3. Создаётся текстовый тикет и тикет с небольшим PNG/JPEG.
4. При передаче оператору создаётся тема с правильным владельцем.
5. Ответ сотрудника с фото и подписью виден в кабинете и личном боте владельца.
6. ИИ отвечает на новый вопрос; после «ОПЕРАТОР» больше не отвечает.
7. Администратор закрывает тикет, пользователь получает уведомление, тема удаляется.
8. Проверена резервная копия базы и общего тома, доступно восстановление на отдельном стенде.

Эти проверки нужно выполнить на своей установке: успешная сборка образов не подтверждает внешние права Yandex/Telegram или доступность Timeweb AI.
