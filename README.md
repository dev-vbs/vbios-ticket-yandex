# Установка SHM / vBios на новый сервер

Руководство для владельца сервера и администратора. Подготовлено 10.11.2026 для модифицированной сборки [dev-vbs/vbios-ticket-yandex](https://github.com/dev-vbs/vbios-ticket-yandex), с личным кабинетом, тикетами и вложениями в Yandex Object Storage. Это не универсальная инструкция для любой сборки SHM. Клиентам VPN передавайте адрес кабинета и инструкции подключения; доступ к серверу и конфигурации предназначен администраторам.

Исходники для сверки: commit `d27ba7053e8a8b4831e252ef880a5df63e812cb7`. Проверены синтаксис Compose и JSON-примера; запуск контейнеров, помощник смены пароля и облачные подключения на новом сервере здесь не выполнялись.

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
apt install -y ca-certificates curl gnupg git openssl nginx certbot jq
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

Скопируйте содержимое этого комплекта на сервер в `/opt/shm`. Внутри должны находиться `docker-compose.yml`, `.env.example`, каталог `sql` и `reset-admin.pl`.

Также сохраните исходники для дальнейших обновлений:

```bash
git clone https://github.com/dev-vbs/vbios-ticket-yandex.git /opt/vbios-source
install -d -m 700 /opt/shm
cd /opt/shm
cp .env.example .env
chmod 600 .env
nano .env
```

Если `nano` отсутствует: `apt install -y nano`. Эти команды предполагают, что комплект уже загружен в `/opt/shm`; не копируйте `.env.example` из случайного рабочего каталога.

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
ADMIN_VERSION=3
CLIENT_VERSION=ghcr.io/dev-vbs/vbios-client:latest
TICKET_S3_ACCESS_KEY=
TICKET_S3_SECRET_KEY=
```

Не публикуйте `.env` и конфигурации с токенами в GitHub. `latest` меняется: перед рабочим развёртыванием проверьте выбранные образы на тестовом сервере и сохраните их digest. Исходники в GitHub и опубликованные образы могут обновляться в разное время.

## 4. Запустите базу и создайте структуру SHM

```bash
cd /opt/shm
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
docker compose exec mysql mysql -u root -p webface -e 'SOURCE /tmp/ticket-3.7.0.sql; SOURCE /tmp/ticket-telegram-images.sql; SHOW TABLES LIKE "ticket%";'
```

Введите `MYSQL_ROOT_PASS`. Если изменили имя базы, замените `webface`. SQL содержит создание дополнительных таблиц; он не настраивает облако, Telegram или ИИ. Для существующей базы сначала нужна резервная копия и проверка совместимости схемы: `CREATE TABLE IF NOT EXISTS` не исправляет произвольную старую структуру.

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

В комплекте spool запускается одной копией. Если нужны две: `docker compose up -d --scale spool=2`. Предупреждение про `deploy.mode` исключено из подготовленного Compose.

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

Только после успешного выпуска замените файл `vbios` содержимым из `nginx-vbios.conf.example`. В нём замените домены и путь сертификата на фактический из вывода Certbot (`certbot certificates`). Затем:

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

В подготовленном Compose Telegram OIDC и OTP первоначально выключены. Включайте их только после отдельной настройки соответствующего входа. Бот поддержки и Telegram-вход в кабинет — разные интеграции.

## 8. Изображения тикетов: Yandex Object Storage

1. Создайте облако с активным платёжным аккаунтом и отдельный каталог для вложений.
2. В каталоге создайте сервисный аккаунт `vbios-ticket-storage`. Для простого развёртывания назначьте ему `storage.editor` на этот отдельный каталог. Не держите в каталоге чужие бакеты.
3. Создайте приватный бакет с уникальным именем, например `mycompany-ticket-images-unique`. Публичное чтение и список объектов выключите. Используйте стандартный класс хранения.
4. Создайте **статический ключ доступа** сервисного аккаунта. Это пара Access Key ID / Secret Access Key, не IAM-токен.
5. Запишите ключи в `/opt/shm/.env` в `TICKET_S3_ACCESS_KEY` и `TICKET_S3_SECRET_KEY`.
6. В разделе конфигурации SHM создайте ключ `ticket` с JSON из `ticket.example.json`. Замените бакет; Telegram и ИИ можно подключить позднее. Для работы только кабинета уберите поля `id`, `telegram_profile`, `forum_topics`.

```bash
cd /opt/shm
docker compose up -d --no-deps --force-recreate core spool
```

Простой `restart` не перечитывает изменённые переменные контейнеров. Ключи AWS CLI на хосте также не передаются в SHM автоматически. Настройки endpoint/региона реализации: `https://storage.yandexcloud.net`, `ru-central1`.

Бакет остаётся приватным: изображения пользователю отдаёт авторизованный API SHM. Для такой схемы публичный бакет и браузерный CORS не нужны. Поддерживаются JPEG, PNG, GIF, WebP до 5 МиБ на файл; это не загрузка любых документов и видео.

Создайте тикет с текстом и маленькой PNG-картинкой. Изображение должно открыться в кабинете и появиться в бакете. `403 AccessDenied` требует проверки роли, bucket policy, соответствия ключей и бакета. Если AWS CLI с **теми же ключами из контейнера** пишет объект успешно, а SHM нет — проверяйте версию `TicketStorage.pm`, подпись запроса и параметры, а не делайте бакет публичным.

Подробная инструкция по консоли облака включена в `YANDEX-CLOUD-TICKETS.md`.

## 9. Telegram: группа поддержки и личный бот

Создайте бота через BotFather. Добавьте его администратором в закрытую супергруппу поддержки с включёнными темами. Разрешите отправлять сообщения/фото/файлы и управлять темами. Доступ в эту группу должен быть только у сотрудников: ответы в теме обрабатываются как ответы поддержки.

В конфигурации SHM создайте/обновите ключ **`telegram`**:

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

`max_tokens`, `history_messages`, `max_replies_per_ticket`, `timeout_seconds` задавайте JSON-числами без кавычек. `reply_mode: "auto"` сохраняет ответ в тикете, `draft` — черновой результат. Текущая интеграция не гарантирует отдельного Telegram-уведомления для каждого ответа ИИ. Изображения ИИ не анализирует и действия с услугами/балансом не выполняет.

Если `instructions` заполнен, текст берётся оттуда. Иначе нужен файл `/app/data/ticket-ai-prompt.txt`. Не включайте ИИ без уведомления пользователей о передаче текста обращений внешнему провайдеру.

Диагностика:

```bash
cd /opt/shm
docker compose exec mysql mysql -u webface -p webface -e 'SELECT source_message_id,ticket_id,status,error,reply_message_id FROM ticket_ai_jobs ORDER BY source_message_id DESC LIMIT 10;'
```

401 — авторизация провайдера; 400 — тело запроса/модель/тип параметров; 500 — нужен текст ошибки провайдера и журнал core. `AI response or persistence failed` — общая ошибка, её нельзя исправить одним изменением пароля базы. Старые неудачные задания автоматически повторяться не обязаны: проверяйте новым сообщением, не удаляя историю.

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
