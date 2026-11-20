# Страница подписки Remnawave в стиле vBios

Страница из предоставленного архива включена в `subscription-page/` как отдельный сервис. Личный кабинет, AJAX-вход, услуги и платежи SHM сохраняются. Страница подписки показывает состояние доступа, расход трафика, инструкции для устройств, QR-код и ссылки подключения. Светлая и тёмная темы переключаются кнопкой в шапке и сохраняются в браузере.

## 1. Подготовка

Нужны установленный кабинет, HTTPS-домен подписок (например `sub.example.com`), доступ контейнера к панели Remnawave и API-токен панели. В Remnawave должна быть создана конфигурация страницы подписки с приложениями и переводами. Настройки этой страницы берутся **из Remnawave, не из `config.main` SHM**.

Исходник архива — Remnawave Subscription Page 8.0.1, контракты API 3.1.1. Совместимость с вашей установленной панелью нужно проверить до переноса рабочего домена: несовместимая или отсутствующая конфигурация не позволит сервису запуститься. Руководство панели: https://docs.rw/ .

## 2. Настройки `.env`

```ini
SUBSCRIPTION_VERSION=ghcr.io/dev-vbs/vbios-subscription:latest
SUBSCRIPTION_PORT=127.0.0.1:9084
SUBPAGE_PANEL_URL=https://panel.example.com
SUBPAGE_API_TOKEN=ВСТАВЬТЕ_ТОКЕН_REMNAWAVE
SUBPAGE_CONFIG_UUID=UUID_КОНФИГУРАЦИИ_СТРАНИЦЫ
SUBPAGE_CABINET_URL=https://bill.example.com
```

UUID копируется из конфигурации страницы подписки в панели. Нулевой UUID в примере `.env.example` — идентификатор стандартной конфигурации upstream; используйте фактический UUID вашей панели. Токен храните только на сервере, не в публичном `config.main`, репозитории или скриншотах.

## 3. Запуск

После успешной публикации образа GitHub Actions:

```bash
docker compose --profile subscription pull subscription
docker compose --profile subscription up -d subscription
docker compose --profile subscription logs --tail=100 subscription
```

Для самостоятельной сборки из корня репозитория:

```bash
docker build --target subscription -t ghcr.io/dev-vbs/vbios-subscription:latest ./subscription-page
```

Dockerfile сам собирает frontend и backend; предварительно собранный `frontend/dist` не требуется. Сервис необязательный: обычный запуск кабинета не включает профиль `subscription`.

## 4. Домен и HTTPS

Создайте DNS A/AAAA-записи для `sub.example.com`. В существующем HTTPS server-блоке Nginx для этого домена используйте:

```nginx
location / {
    access_log off;
    proxy_pass http://127.0.0.1:9084;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 60s;
}
```

Это фрагмент **уже настроенного HTTPS-хоста**, а не полный конфиг сертификата. Выпустите сертификат по основной [инструкции установки](INSTALLATION-RU.md). Порт 9084 оставьте на loopback. `TRUST_PROXY=1` рассчитан на один внешний прокси; при Cloudflare/дополнительных прокси настройте доверенные адреса в compose под свою сеть.

## 5. Связь с кабинетом

В Remnawave укажите новый домен подписки в настройках выдаваемых пользователю ссылок. Формат ссылки: `https://sub.example.com/<shortUuid>`. Открытие этой ссылки в браузере показывает страницу, запрос приложения получает конфигурацию. Не заменяйте ответ для приложений статическим HTML и не переписывайте User-Agent на прокси.

В кабинете используется фактическая ссылка подписки из Remnawave. Кнопка «Личный кабинет» на новой странице ведёт на `SUBPAGE_CABINET_URL`. Покупка, смена тарифа и оплата продолжают выполняться в SHM.

Сначала проверьте **отдельную тестовую подписку**: открытие браузером, QR-код, копирование, импорт и обновление в реальном приложении. Только потом меняйте домен у действующих пользователей. Корень `/` не является страницей продажи: нужна полная ссылка с shortUuid.

Ссылка подписки даёт доступ к услуге. Не публикуйте её в README/логах/аналитике, не включайте общий CDN-кеш для этого домена. На странице отключена индексация и передача Referer.

## Обновление и откат

```bash
docker compose --profile subscription pull subscription
docker compose --profile subscription up -d --no-deps subscription
docker compose --profile subscription ps subscription
```

Для отката задайте прежний опубликованный SHA-тег в `SUBSCRIPTION_VERSION` и повторите команды. Сервис не изменяет баланс и БД SHM.

## Исходники и лицензия

Сохранена лицензия `subscription-page/LICENCE` и исходники проекта Remnawave: https://github.com/remnawave/subscription-page . Изменения vBios находятся в этом репозитории, ссылка на исходники доступна внизу страницы. При распространении изменённой версии соблюдайте AGPL-3.0-only, включая предоставление соответствующего исходного кода пользователям сетевого сервиса.

## Отдельно от биллинга — в вашем compose Remnawave

Можно использовать только этот образ, без установки остальных контейнеров проекта. В существующий `services:` вашего compose добавьте сервис ниже. Якоря `common/logging/networks` должны быть объявлены **в этом же вашем compose**; в примере они намеренно не требуются:

```yaml
  remnawave-subscription-page:
    image: ghcr.io/dev-vbs/vbios-subscription:latest
    container_name: remnawave-subscription-page
    hostname: remnawave-subscription-page
    restart: unless-stopped
    depends_on:
      remnawave:
        condition: service_healthy
    environment:
      REMNAWAVE_PANEL_URL: http://remnawave:3000
      REMNAWAVE_API_TOKEN: ${SUBPAGE_API_TOKEN:?Укажите токен в .env}
      APP_PORT: "3010"
      SUBPAGE_CONFIG_UUID: ${SUBPAGE_CONFIG_UUID:-00000000-0000-0000-0000-000000000000}
      VBIOS_CABINET_URL: ${SUBPAGE_CABINET_URL:-}
      TRUST_PROXY: "1"
    ports:
      - '127.0.0.1:3010:3010'
```

Оба сервиса должны находиться в одной Docker-сети. Если у `remnawave` своя сеть, добавьте странице ту же `networks:` или ваш `<<: [*common, *logging, *networks]`, как в исходном compose. `depends_on` применим, только когда сервис `remnawave` объявлен в том же compose-проекте и у него есть healthcheck.

В `.env` рядом с вашим compose:

```ini
SUBPAGE_API_TOKEN=НОВЫЙ_ТОКЕН_ИЗ_REMNAWAVE
SUBPAGE_CONFIG_UUID=UUID_ВАШЕЙ_КОНФИГУРАЦИИ_СТРАНИЦЫ
SUBPAGE_CABINET_URL=https://bill.example.com
```

После успешной сборки образа:

```bash
docker compose config --quiet
docker compose pull remnawave-subscription-page
docker compose up -d --no-deps remnawave-subscription-page
docker compose logs --tail=100 remnawave-subscription-page
```

Старый контейнер с тем же `container_name` необходимо сначала остановить и убрать из прежнего compose: два контейнера с одинаковым именем и портом одновременно не запускаются. Для этого варианта измените в HTTPS Nginx-фрагменте выше upstream на `http://127.0.0.1:3010`.

### Совсем отдельный compose-файл

Готовый [docker-compose.subscription.yml](../docker-compose.subscription.yml) запускается самостоятельно и не содержит зависимостей от SHM. Скопируйте его и [пример `.env`](../subscription-page/.env.example) в отдельный каталог, заполните параметры, затем:

```bash
docker compose -f docker-compose.subscription.yml config --quiet
docker compose -f docker-compose.subscription.yml pull
docker compose -f docker-compose.subscription.yml up -d
docker compose -f docker-compose.subscription.yml logs --tail=100
```

В этом режиме используйте доступный HTTPS URL панели в `SUBPAGE_PANEL_URL`. Имя `http://remnawave:3000` из другого compose не разрешится без подключения к общей внешней Docker-сети. Публичная страница работает самостоятельно; ссылка на кабинет необязательна, и при пустом `SUBPAGE_CABINET_URL` кнопка скрыта.


[Пример JSON-конфигурации](subscription-page-config.example.json) предназначен для адаптации в редакторе страницы Remnawave. В нём демонстрационные инструкции и нет ссылок скачивания: заполните официальные адреса приложений и кнопки импорта перед публикацией. Это не `config.main` и не local-шаблон SHM.
