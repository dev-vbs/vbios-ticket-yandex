# Полный мануал установки и эксплуатации vBios / SHM

Инструкция для **чистого Ubuntu Server 24.04 LTS**, Docker Compose v2 и одного сервера биллинга. Команды выполняются в Bash от root (`sudo -i`). Панель Remnawave и её ноды устанавливаются отдельно: этот репозиторий содержит биллинг, кабинет и интеграцию, а не установщик Remnawave.

Примеры доменов: `bill.example.com` — кабинет, `admin.example.com` — админка. Замените их своими **во всех файлах и командах**. Нужны 2 vCPU, 4 ГБ RAM, SSD от 30 ГБ, доступ SSH, DNS и исходящий HTTPS. Для продаж нужны платёжный провайдер и рабочие шаблоны жизненного цикла услуг SHM.

## Маршрут установки

**Сервер и DNS → Docker → база и новый пароль admin → HTTPS → конфигурация SHM → тарифы и оплата → проверка → резервная копия.** Не открывайте продажи до прохождения проверки в разделе 11.

| Ситуация | С чего начать |
| --- | --- |
| Чистый сервер | Выполняйте разделы 1–5 последовательно |
| Контейнеры работают, нужна настройка | Разделы 6–10: оформление, тарифы, оплата, поддержка, мониторинг |
| Нужно обновить рабочий проект | [Пошаговое обновление](PRODUCTION-UPDATE-RU.md) |
| Нужно перенести или восстановить сервис | Раздел 13: согласованная копия и восстановление |
| Что-то не работает | Раздел 14: диагностика и типовые причины |

Все команды в блоках Bash выполняются на сервере через SSH. Значения example.com, REAL_... и REPLACE_... нужно заменить своими. Конструкции {{ ... }} — шаблоны SHM для транспорта local, не команды Linux.

## Содержание

1. [Состав и подготовка](#1-состав-и-подготовка)
2. [Docker и файлы проекта](#2-docker-и-файлы-проекта)
3. [Переменные окружения](#3-переменные-окружения)
4. [База и первый администратор](#4-база-и-первый-администратор)
5. [Домен и HTTPS](#5-домен-и-https)
6. [Настройки SHM и страницы входа](#6-настройки-shm-и-страницы-входа)
7. [Тарифы, Remnawave и расширения](#7-тарифы-remnawave-и-расширения)
8. [Оплата через SHM](#8-оплата-через-shm)
9. [Telegram, поддержка и файлы](#9-telegram-поддержка-и-файлы)
10. [Мониторинг](#10-мониторинг)
11. [Проверка перед продажами](#11-проверка-перед-продажами)
12. [Обновления и публикация](#12-обновления-и-публикация)
13. [Резервные копии и восстановление](#13-резервные-копии-и-восстановление)
14. [Диагностика](#14-диагностика)

## 1. Состав и подготовка

| Сервис Compose | Назначение | Доступ снаружи |
| --- | --- | --- |
| client | React-кабинет, AJAX-вход, прокси `/shm/` | Через Nginx, локально 9082 |
| admin | Административный интерфейс | Через Nginx, локально 9081 |
| api | Внутренний HTTP-шлюз SHM | Без публикации порта |
| core | API, запуск схемы/миграций SHM | Внутренняя сеть |
| spool | Два обработчика заданий | Внутренняя сеть |
| mysql | Данные клиентов, конфигурация, платежи | Только внутренняя сеть |
| redis | Кэш и история мониторинга | Только внутренняя сеть |
| phpmyadmin | Необязательная SQL-панель | Только localhost:9083 |

Создайте A-записи двух доменов на IP сервера. Если есть AAAA, IPv6 тоже должен вести на этот сервер. Откройте входящие TCP 80/443 и свой SSH-порт в firewall провайдера. Не открывайте 3306, 6379 и 9081–9083 в Интернет. Не меняйте SSH/firewall вслепую из единственного соединения.

```bash
apt update
apt install -y ca-certificates curl git openssl nginx certbot dnsutils nano cron
getent ahosts bill.example.com
getent ahosts admin.example.com
timedatectl status
```

Правильное время важно для OIDC, сертификатов и подписей. До создания администратора публичный прокси не включаем.

## 2. Docker и файлы проекта

Установка из официального APT-репозитория Docker для Ubuntu:

```bash
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
. /etc/os-release
printf '%s\n' "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
docker compose version
mkdir -p /opt/shm
git clone https://github.com/dev-vbs/vbios-ticket-yandex.git /opt/shm
cd /opt/shm
cp .env.example .env
chmod 600 .env
```

Если `/opt/shm` уже содержит установку, остановитесь: используйте раздел обновления. Не импортируйте начальную базу поверх данных клиентов.

## 3. Переменные окружения

```bash
cd /opt/shm
openssl rand -hex 32
openssl rand -hex 32
nano .env
```

Сохраните два разных результата в менеджере паролей и задайте `MYSQL_PASS` и `MYSQL_ROOT_PASS`. Шестнадцатеричные строки не требуют экранирования `$` в Compose.

Минимально проверьте следующие значения; остальные оставьте из `.env.example`:

```dotenv
TZ=Europe/Moscow
MYSQL_USER=webface
MYSQL_DATABASE=webface
MYSQL_PASS=REPLACE_WITH_FIRST_RANDOM_HEX
MYSQL_ROOT_PASS=REPLACE_WITH_SECOND_RANDOM_HEX
MYSQL_HOST=mysql
MYSQL_PORT=3306
ADMIN_PORT=127.0.0.1:9081
CLIENT_PORT=127.0.0.1:9082
PHPMYADMIN_PORT=127.0.0.1:9083
SHM_REPO=ghcr.io/dev-vbs
CORE_VERSION=latest
ADMIN_VERSION=ghcr.io/dev-vbs/vbios-admin:latest
CLIENT_VERSION=ghcr.io/dev-vbs/vbios-clients:latest
WORKERS_COUNT=4
ENABLE_RATE_LIMIT=true
CORS_ALLOWED_ORIGINS=https://bill.example.com,https://admin.example.com
APP_NAME=vBios
TELEGRAM_BOT_AUTH_ENABLE=false
TELEGRAM_OIDC_AUTH_ENABLE=false
TELEGRAM_WEBAPP_AUTH_ENABLE=false
TELEGRAM_WEBAPP_AUTO_AUTH_ENABLE=false
```

Telegram включаем после настройки, а не с пустыми credentials. `CORE_VERSION` — **тег**, `ADMIN_VERSION` и `CLIENT_VERSION` — **полные имена образов**. Для воспроизводимой установки замените latest согласованными опубликованными тегами одной сборки; MySQL и Redis в Compose тоже используют подвижные теги, поэтому перед их обновлением отдельно изучайте совместимость версий.

`TRUSTED_IPS` не заполняйте произвольными сетями. Не публикуйте вывод `docker compose config`: он содержит секреты. Проверка без вывода значений:

```bash
docker compose config --quiet
docker compose pull
```

Если GHCR сообщает denied, проверьте видимость пакетов и существование тегов. Для закрытых пакетов нужен `docker login ghcr.io` с токеном `read:packages`; используйте `--password-stdin`.

## 4. База и первый администратор

Этот путь использует **штатную инициализацию core**, не полный SQL-дамп. `init.pl` создаёт базовую схему в пустой базе; при последующих запусках применяет подходящие версии миграций. Дополнительные таблицы проекта устанавливаем отдельно идемпотентными SQL-файлами, чтобы не зависеть от исходной версии схемы.

```bash
cd /opt/shm
docker compose up -d mysql redis
docker compose ps
docker compose up -d core
docker compose logs --tail=150 core
```

Дождитесь завершения `Creating structure of database` / `Loading data` без SQL-ошибок. Не запускайте второй core параллельно инициализации. Проверьте наличие пользователя:

```bash
docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql -u "$MYSQL_USER" "$MYSQL_DATABASE" -e "SELECT user_id,login FROM users WHERE user_id=1;"'
```

Ожидается `1 admin`. Установите таблицы поддержки, аватаров и журнал расширений:

```bash
set -e
for file in ticket-3.7.0.sql ticket-object-storage.sql ticket-telegram-images.sql ticket-responder.sql user-avatars.sql remnawave-addons.sql; do
  docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql -u "$MYSQL_USER" "$MYSQL_DATABASE"' < "server/app/sql/$file"
done
docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql -u "$MYSQL_USER" "$MYSQL_DATABASE" -e "SHOW TABLES LIKE '\''ticket%'\''; SHOW TABLES LIKE '\''user_avatars'\''; SHOW TABLES LIKE '\''remnawave_addon_ledger'\'';"'
```

При ошибке прекратите установку и изучите её; не добавляйте `mysql --force`. Файл `vbios-full-install.sql` — альтернативный импорт **только в пустую базу**, он не нужен в описанном пути и не должен запускаться после core.

Смените начальный пароль **до открытия сайта**. Скрипт проверяет, что меняется именно исходный admin, использует штатный метод и фиксирует транзакцию:

```bash
docker compose cp docs/new-server/reset-admin.pl core:/tmp/reset-admin.pl
read -r -s -p 'Новый пароль admin (минимум 16 символов): ' VB_ADMIN_PASSWORD
printf '\n'
printf '%s\n' "$VB_ADMIN_PASSWORD" | docker compose exec -T core perl /tmp/reset-admin.pl
unset VB_ADMIN_PASSWORD
```

Ожидается `Admin password updated`. Если этого нет, не открывайте админку. Не изменяйте password-хэши вручную SQL-запросом.

```bash
docker compose up -d api admin client spool
docker compose ps
curl --fail --silent --show-error http://127.0.0.1:9082/shm/healthcheck.cgi
```

`phpmyadmin` для работы кабинета не нужен. При необходимости запускается отдельно: `docker compose up -d phpmyadmin`, доступ через SSH-туннель, а не публичный порт.

## 5. Домен и HTTPS

Сначала создаём только HTTP-конфиг для ACME, поскольку TLS-файл не загрузится до выпуска сертификата:

```bash
mkdir -p /var/www/letsencrypt
cat > /etc/nginx/sites-available/vbios <<'NGINX'
server {
    listen 80;
    server_name admin.example.com bill.example.com;
    location ^~ /.well-known/acme-challenge/ { root /var/www/letsencrypt; }
    location / { return 404; }
}
NGINX
ln -s /etc/nginx/sites-available/vbios /etc/nginx/sites-enabled/vbios
nginx -t
systemctl reload nginx
certbot certonly --webroot -w /var/www/letsencrypt --cert-name admin.example.com -d admin.example.com -d bill.example.com
```

Введите действующий email и подтвердите условия Certbot. Если проверка домена не прошла, исправьте DNS/порт 80 до продолжения. Далее установите готовый прокси, заменив домены:

```bash
cd /opt/shm
sed -e 's/admin\.example\.com/admin.example.com/g' -e 's/bill\.example\.com/bill.example.com/g' docs/new-server/nginx-vbios.conf.example > /etc/nginx/sites-available/vbios
nginx -t
systemctl reload nginx
certbot renew --dry-run
install -d /etc/letsencrypt/renewal-hooks/deploy
printf '#!/bin/sh\nnginx -t && systemctl reload nginx\n' > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx
chmod 755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx
curl --fail -I https://bill.example.com
curl --fail --silent --show-error https://bill.example.com/shm/healthcheck.cgi
```

В `sed` меняется **правая часть** подстановки на ваши домены. Путь сертификата должен совпадать с `--cert-name`. Готовый конфиг направляет весь кабинет, включая `/shm/`, через client, админку — через admin; дополнительный публичный порт api не требуется. Ограничьте административный домен доверенными IP, если они постоянные, сохранив доступ ACME по HTTP.

## 6. Настройки SHM и страницы входа

Войдите на `https://admin.example.com` как admin с новым паролем. Конфигурация хранится в БД SHM, `.env` задаёт окружение контейнеров.

В разделе конфигурации отредактируйте соответствующие ключи, **сохраняя остальные поля**:

| Ключ | Что установить |
| --- | --- |
| api | `url`: `https://bill.example.com` |
| cli | `url`: `https://bill.example.com` |
| company | Реальное название компании/сервиса |
| billing | Валюта RUB, нужная политика биллинга; `allow_user_register_api`: 1 для открытой регистрации |
| mail | Реальный отправитель и рабочий почтовый транспорт для восстановления |
| pay_systems | Только настроенные рабочие провайдеры; отключите показ начального примера ЮMoney с нулевым счётом |

Для оформления используйте [полный config.main](main-config-template.txt) и [инструкцию local](main-config.md). Создайте шаблон в SHM, вставьте содержимое файла, замените данные и выполните **транспортом `local` от администратора**. Это Template Toolkit, не Bash, не содержимое `.env` и не JSON для терминала. Проверьте результат задания в SHM.

Полный шаблон **заменяет весь `config.main`**. Для существующего сайта используйте [частичное обновление Login](login-design-local.txt). В публичном `config.main` запрещены токены, ключи и пароли. После применения проверьте `/shm/v1/system/main` и `/login`, обе темы, регистрацию и мобильную версию.

Тарифы из API SHM, внутри объекта main:

```text
plans_source = 'shm'
plans_currency = 'RUB'
plans = []
plan_service_ids = [ 6 7 8 ]
```

Замените 6/7/8 реальными `service_id`. Без `plan_service_ids` показываются доступные к заказу тарифы; пустой массив скрывает все. Нужен `allow_to_order = 1`. Это публичная базовая цена; индивидуальную скидку и окончательное списание рассчитывает SHM.

## 7. Тарифы, Remnawave и расширения

### Основные услуги

1. В отдельной панели Remnawave создайте ноды, профили, hosts и Internal Squads; проверьте рабочую подписку в приложении.
2. Получите API-токен панели. В SHM создайте приватный `config.remna` через [шаблон конфигурации](remnawave-config-local.txt). Укажите реальный HTTPS URL, токен, префиксы и параметры доступа. Префиксы должны совпадать с шаблоном выдачи.
3. Выполните [Remnawave_LOCAL](Remnawave_LOCAL.txt) транспортом local от администратора: это **только проверка чтения API**, не создание пользователей.
4. Создайте основной тариф SHM: название, цена, период, `allow_to_order`, категория интеграции и события управления подпиской.
5. Подключите ваш рабочий основной обработчик выдачи: создание/активация после оплаты, блокировка при неоплате, продление, удаление. Проверьте каждый переход тестовой услугой.

**Важная граница комплекта:** универсального готового обработчика полного жизненного цикла основного тарифа в `Remnawave_LOCAL.txt` нет. Модуль предоставляет API, но правила создания пользователей, сроки и squads зависят от вашей схемы услуг SHM. Нельзя считать установку готовой к продаже после одного теста чтения нод. Если такого обработчика у вас ещё нет, это отдельный обязательный этап интеграции до приёма оплат.

`service_id` — тариф, `user_service_id` — купленная услуга. Имя Remnawave должно соответствовать `name_prefix + user_service_id`, storage — выбранному `storage_prefix`. Node UUID применяется для мониторинга; **Internal Squad UUID** — для выдачи доступа. Они невзаимозаменяемы.

[Полный конфиг кабинета](cabinet-full-config-local.txt) настраивает main/remna и расширения, но **не создаёт** тарифы, squads, платёжные системы и события. Перед выполнением заполните settings и сохраните предыдущие конфиги.

### Платные расширения

Следуйте [полному руководству с полями услуг и событиями](SHM-REMNAWAVE-MANUAL-RU.md). Обязательный порядок:

1. Создайте отдельные простые услуги SHM категории `remna_addon`: устройства, трафик, локация. `period=0`, `pay_in_credit=0`, `is_composite=0`, `allow_to_order=1`, config: `{"no_auto_renew":1}`.
2. Внесите фактические ID и размеры прибавки в `config.remna.addons`, используя [готовый local-шаблон](remnawave-addons-config-local.txt). Для локации нужен Internal Squad UUID.
3. Получите `openssl rand -hex 32` и сохраните результат в приватный `config.remna.addon_signing_key`. Строка REPLACE_WITH... не является ключом. Не меняйте ключ при незавершённых заказах.
4. Проверьте наличие `remnawave_addon_ledger` (создан в разделе 4).
5. Создайте шаблон `Remnawave_Addon_LOCAL` из [файла](Remnawave_Addon_LOCAL.txt).
6. Для категории remna_addon создайте два события UserService: CREATE и ACTIVATE, transport local, template_id Remnawave_Addon_LOCAL. Не назначайте выдачу на NOT_ENOUGH_MONEY или PROLONGATE; устраните пересечения с широкими правилами `%`.
7. Покупайте расширение из карточки основной услуги: так SHM получает подписанную привязку заказа. После оплаты проверьте задание и фактический лимит Remnawave. При сбое повторяют **то же задание**, а не покупку.

Все деньги списывает SHM. Remnawave изменяет только технические параметры после подтверждения оплаты. При безлимитном исходном лимите прибавка может не иметь смысла. Наследование расширений при продлении/смене тарифа проверяется с вашим основным обработчиком отдельно.

## 8. Оплата через SHM

В SHM установите/настройте выбранную платёжную систему, её merchant ID, секреты, callback и return URL **по документации именно этого модуля и провайдера**. Единого callback для всех провайдеров нет. Секреты хранятся в закрытой конфигурации, не в main или frontend.

До открытия продаж проведите тестовый платёж и проверьте цепочку:

- платёж подтверждён серверным callback, а не только возвратом браузера;
- в SHM есть ровно одно зачисление и правильная сумма/валюта;
- неоплаченная услуга не выдаётся, оплаченная запускает нужное задание;
- повтор callback не удваивает платёж/расширение;
- отказ/отмена и недостаточный баланс показываются корректно;
- продление и смена тарифа выполняются через SHM и отражаются в Remnawave.

Заранее заполните реквизиты, правила сервиса, политику персональных данных и контакт поддержки своими данными.

## 9. Telegram, поддержка и файлы

### Вход Telegram OIDC — необязательный

В BotFather настройте Telegram Login / OIDC, Allowed URLs:

```text
https://bill.example.com
https://bill.example.com/shm/v1/telegram/web/callback
```

В конфигурации SHM `telegram` добавьте профиль, сохраняя остальные профили:

```json
{"vBios_BOT":{"token":"BOT_TOKEN","oidc_enabled":true,"client_id":"OIDC_CLIENT_ID","client_secret":"OIDC_CLIENT_SECRET"}}
```

Client Secret и токен бота — разные секреты. Настройте RS256 для получения Telegram id в используемом проектом сценарии. В `.env`: имя бота без @, `TELEGRAM_BOT_AUTH_PROFILE=vBios_BOT`, `TELEGRAM_OIDC_AUTH_ENABLE=true`; старый Widget оставьте выключенным. Пересоздайте client/core и начинайте новую авторизацию с `/login`. Для нового клиента должна быть разрешена регистрация SHM. Проверку подписи JWT отключать нельзя.

### Тикеты и Telegram-группа

Создайте закрытую супергруппу с Topics, добавьте бота администратором с правами отправки сообщений/фото/файлов и управления темами. В `config.ticket` задайте `id` группы (`-100...`), `telegram_profile=vBios_BOT`, `forum_topics=1`; [пример JSON](new-server/ticket.example.json).

Для входящих ответов нужен установленный бот-шаблон SHM и Telegram webhook с секретом; один group ID не включает обработку ответов. Настройте их через установленный Telegram-модуль SHM, используя его **реальный template_id**, профиль и URL кабинета. Путь обработчика проекта: `/shm/v1/telegram/bot/<template_id>?tg_profile=vBios_BOT`. Сгенерируйте `openssl rand -hex 32` и сохраните значение в `config.telegram.vBios_BOT.secret`; при регистрации webhook передайте тот же `secret_token`. Секрет webhook должен совпадать с конфигурацией профиля; запросы без настроенного секрета отклоняются. Не подставляйте OIDC callback вместо bot webhook.

### Вложения, аватары, ИИ

[Пошаговая настройка Yandex Object Storage](new-server/YANDEX-CLOUD-TICKETS.md): закрытый бакет, сервисный аккаунт и статические S3-ключи. В `.env` задайте TICKET_S3_ACCESS_KEY / TICKET_S3_SECRET_KEY; в config.ticket.storage — provider yandex и имя бакета. Не делайте бакет публичным. Ключи передаются только core/spool.

```bash
docker compose up -d --no-deps --force-recreate core spool client
```

Проверьте текстовый тикет, вложение, тему Telegram, ответ оператора, закрытие тикета и аватар. Необязательный ИИ включайте только после настройки используемого провайдера; `TIMEWEB_AI_KEY` хранится в `.env`, а не в main. Отсутствие ключа не должно заменять живую поддержку.

## 10. Мониторинг

Внутри main включите мониторинг и задайте свои Node UUID:

```text
monitor_enabled = 1
monitor_nodes = [
    { uuid = 'REAL_NODE_UUID' title = 'Франкфурт' description = 'Германия' ping_ip = 'REAL_PUBLIC_IP' ping_port = 443 ping_url = 'https://node.example.com/ping' }
]
```

IP и порт должны соответствовать реально доступному сервису. Не копируйте чужие UUID из примеров. Приватные URL/токен Remnawave остаются в remna. Откройте `/status` и проверьте:

```bash
curl --fail --silent --show-error --max-time 45 https://bill.example.com/shm/v1/system/monitor
```

Для сбора без посетителей создайте cron (замените домен):

```bash
cat > /etc/cron.d/vbios-monitor <<'CRON'
*/5 * * * * root curl --fail --silent --show-error --max-time 45 https://bill.example.com/shm/v1/system/monitor > /dev/null 2>&1
CRON
chmod 644 /etc/cron.d/vbios-monitor
systemctl enable --now cron
```

История не появляется задним числом. `/status` обновляется каждые 5 минут и при возвращении к вкладке; Redis хранит реальные проверки за последний час. В текущем Compose у Redis **нет постоянного тома**, после пересоздания история может пропасть. Это не журнал SLA.

**Откуда задержка:** backend `latency_ms` — TCP-замер от сервера SHM, не от клиента. `ping_url` позволяет браузеру проверить HTTPS RTT: установите [location /ping](node-ping-nginx.conf) на каждой ноде с действующим TLS и CORS, без CDN и кеширования. В текущем интерфейсе браузерная проверка используется как fallback при отсутствии серверного замера; при наличии backend latency не следует выдавать её за пользовательскую. Постоянный приоритет замеров от посетителя потребует изменения клиентской логики. Браузер не умеет ICMP ping по IP; HTTPS по IP требует подходящего сертификата. TCP/HTTPS-доступность не подтверждает работу всего протокола подписки.

Полные пояснения статусов, истории и причин отсутствия данных: [мониторинг](MONITORING.md).

## 11. Проверка перед продажами

[Галерея актуального интерфейса](screenshots/README.md) поможет сравнить расположение разделов. Демонстрационные данные на снимках не являются настройками для вашей установки.

- В `docker compose ps` нет перезапусков и unhealthy; очереди spool обрабатываются.
- HTTPS и автопродление сертификата работают на двух доменах.
- Новый admin-пароль проверен; обычный пользователь не имеет административного доступа.
- Регистрация, выход, повторный вход, восстановление и смена пароля проверены отдельным клиентом.
- Login, услуги, карточка подписки, профиль, поддержка работают на телефоне и в двух темах.
- В каталоге реальные тарифы SHM; нет пустых обещаний и демонстрационных цен.
- Пройдена реальная цепочка оплата → задание → Remnawave → подключение приложения.
- Проверены неоплата, блокировка, продление, смена тарифа и разовые расширения.
- Мониторинг не рисует выдуманные значения; ссылки и QR принадлежат правильному клиенту.
- Проверены вложения, Telegram-ответы и восстановление резервной копии на отдельном стенде.

Не считайте установку принятой по одному HTTP 200 или скриншоту.

## 12. Обновления и публикация

Сначала дождитесь успешной сборки **Build and publish vBios images** в Actions и сделайте резервную копию (раздел 13). Сохраните текущие image IDs/digests и Git commit. Подвижный latest не обеспечивает откат.

```bash
cd /opt/shm
git status --short
git rev-parse HEAD
docker compose images
git pull --ff-only origin main
docker compose config --quiet
docker compose pull api core spool admin client
docker compose stop spool
docker compose up -d --no-deps --force-recreate core
docker compose logs --tail=150 core
```

После успешной инициализации/миграций:

```bash
docker compose up -d --no-deps --force-recreate api admin client spool
docker compose ps
curl --fail --silent --show-error https://bill.example.com/shm/healthcheck.cgi
docker compose logs --since=10m --tail=100 core spool api client admin
```

Это обновляет **все пять прикладных сервисов**, включая spool из того же образа core. Для обновления только интерфейса можно пересоздать client/admin. `restart` не подтягивает новый образ и не применяет изменённый `.env`. MySQL/Redis обновляйте отдельно, а не случайно вместе с кабинетом. Не используйте `down -v` и очистку volumes.

При неудачной миграции не возвращайте старое приложение к неизвестной новой схеме: сохраните проблемную БД для разбора, восстанавливайте совместимую пару БД + версии образов на отдельной установке.

### Свой GitHub и уведомления о публикации

В собственном fork включите Actions и разрешите публикацию Packages. Workflow использует GITHUB_TOKEN с packages:write. Проверьте, что опубликованы vbios-core, vbios-api, vbios-clients, vbios-admin, а owner в `.env` соответствует вашему GHCR. Для анонимного pull пакеты должны быть публичными.

В Settings → Secrets and variables → Actions добавьте `TELEGRAM_BOT_TOKEN` (Secret), `TELEGRAM_CHAT_ID` (Secret или Variable), например ID группы `-100...`. Бот должен иметь право писать в эту группу. Уведомление отправляется после успешной сборки main; отправки в произвольную группу только по имени нет. Описания изменений берутся из заголовков коммитов — пишите их по-русски. Группа уведомлений сборки и группа тикетов — независимые настройки.

## 13. Резервные копии и восстановление

### Согласованная копия перед обновлением

Команды ниже выполняются в Bash на хосте. В резервной копии есть секреты и персональные данные; храните её зашифрованной вне этого сервера. Для простоты и согласованности на время копии останавливаем всех писателей, оставляя MySQL запущенным. Планируйте окно обслуживания.

```bash
set -euo pipefail
cd /opt/shm
umask 077
VB_BACKUP_DIR="/var/backups/vbios/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$VB_BACKUP_DIR"
git rev-parse HEAD > "$VB_BACKUP_DIR/git-commit.txt"
docker compose images > "$VB_BACKUP_DIR/images.txt"
cp .env docker-compose.yml "$VB_BACKUP_DIR/"
if [ -f compose.override.yaml ]; then cp compose.override.yaml "$VB_BACKUP_DIR/"; fi
if [ -f docker-compose.override.yml ]; then cp docker-compose.override.yml "$VB_BACKUP_DIR/"; fi
cp -a /etc/nginx/sites-available/vbios "$VB_BACKUP_DIR/nginx-vbios.conf"
docker compose stop client admin api spool core
docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump -u root --single-transaction --routines --triggers --events --no-tablespaces "$MYSQL_DATABASE"' > "$VB_BACKUP_DIR/database.sql"
test -s "$VB_BACKUP_DIR/database.sql"
docker compose run --rm --no-deps -T --entrypoint tar core -C /app/data -czf - . > "$VB_BACKUP_DIR/shm-data.tar.gz"
tar -tzf "$VB_BACKUP_DIR/shm-data.tar.gz" > /dev/null
docker compose up -d core
docker compose logs --tail=100 core
```

После проверки core запустите `docker compose up -d api admin client spool`. Если копирование завершилось ошибкой, приложения останутся остановленными — исправьте ошибку и запустите их явно, не принимайте неполный backup за готовый.

Отдельно копируйте Object Storage (версии/резервная реплика), настройки и БД Remnawave, используемые override-файлы, cron и свои шаблоны/инструкции. Конфиги/шаблоны SHM находятся в дампе БД. Каталог сертификатов содержит приватные ключи; на новом сервере можно выпустить сертификат заново. История Redis текущим рецептом не сохраняется. Нужны ежедневные копии и регулярный тест восстановления, не только backup перед обновлением.

### Восстановление на отдельном чистом сервере

1. Выполните разделы 1–3. Возьмите код сохранённого commit и соответствующие версии образов; восстановите `.env` и override. Сохраните имя проекта Compose/каталог `/opt/shm`, чтобы не подключить случайные новые volumes.
2. Пока не направляйте публичный DNS и callback провайдеров на тестовую копию. Не запускайте spool тестовой копии с рабочими ключами: он может выполнять задания и менять Remnawave.
3. Скопируйте backup в защищённый каталог, проверьте его контрольную сумму/целостность. Подставьте путь:

```bash
set -euo pipefail
cd /opt/shm
VB_RESTORE_DIR=/var/backups/vbios/REPLACE_BACKUP_DIRECTORY
test -s "$VB_RESTORE_DIR/database.sql"
tar -tzf "$VB_RESTORE_DIR/shm-data.tar.gz" > /dev/null
docker compose up -d mysql redis
```

Дождитесь healthy MySQL. На **пустой целевой базе**, до первого запуска core:

```bash
docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql -u "$MYSQL_USER" "$MYSQL_DATABASE"' < "$VB_RESTORE_DIR/database.sql"
docker compose run --rm --no-deps -T --entrypoint tar core -C /app/data -xzf - < "$VB_RESTORE_DIR/shm-data.tar.gz"
docker compose up -d core
docker compose logs --tail=150 core
```

Этот импорт не предназначен для слияния с существующими данными. Если core уже создал таблицы на целевой установке, не продолжайте поверх них: подготовьте отдельную пустую БД/установку. После проверки схемы восстановите Nginx/сертификаты и запустите api/admin/client. Spool, платежи и внешние интеграции включайте только при подтверждённом переключении с остановленного старого сервера. Не допускайте двух активных биллингов с одними внешними учётными данными.

## 14. Диагностика

```bash
cd /opt/shm
docker compose ps
docker compose logs --since=15m --tail=200 core spool api client admin
docker compose exec -T api wget -qO- http://127.0.0.1/shm/healthcheck.cgi
nginx -t
journalctl -u nginx --since '15 minutes ago' --no-pager
```

| Симптом | Что проверить |
| --- | --- |
| 502 на домене | Локальный порт 9081/9082, контейнеры, healthcheck и Nginx error.log |
| Access denied MySQL | Пароли `.env` и первоначальные credentials тома; изменение env не меняет пароль существующей БД |
| SQL table missing | Завершение init, отдельные SQL раздела 4, правильная база; не импортировать full-install поверх рабочей |
| OIDC jwks / подпись | Свежий core, часы, доступ к Telegram HTTPS, реальные client credentials, RS256; начать новый вход |
| PASSWORD_SAVE_NOT_CONFIRMED | Версии client/core, ответ API и backend-логи; не считать пароль сохранённым без повторного входа |
| Расширение оплачено, но не выдано | События CREATE/ACTIVATE, шаблон, журнал задания, ledger, подпись/целевой user_service_id; повтор того же задания |
| Мониторинг unknown/без истории | Реальные UUID/IP/порт, доступ из core, cron, Redis; история не восстанавливает прошлое |
| S3 missing / 403 | Окружение core и spool, закрытый бакет, права сервисного аккаунта, пересоздание после env |
| Нет ответа Telegram | Webhook/secret/template_id, права бота и Topics, правильный профиль ticket |
| 429 | Правильный реальный IP за прокси, rate limit; не доверять произвольному X-Forwarded-For |

Перед отправкой логов удалите токены, пароли, cookies, ссылки подписок и данные клиентов. Факт готовности подтверждается проверками раздела 11 на вашей инфраструктуре. В рамках подготовки этого руководства фактическое развёртывание на чистом сервере с вашими платёжными ключами не выполнялось.
