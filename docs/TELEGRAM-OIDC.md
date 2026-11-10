# Вход в кабинет через Telegram OIDC

Telegram OIDC работает отдельно от входа через Mini App и старого Telegram Login Widget. Токен бота для отправки сообщений и OIDC Client Secret — разные настройки.

## 1. Telegram

Откройте настройки вашего бота в BotFather и настройте Telegram Login / Web Login. Получите **Client ID** и **Client Secret**. Разрешите адрес кабинета `https://bill.pbalka.ru` и callback:

```text
https://bill.pbalka.ru/shm/v1/telegram/web/callback
```

Адрес должен совпадать полностью: HTTPS, домен, путь. Если кабинет работает на другом домене, замените его во всех примерах. Не указывайте callback на домене админки, когда вход запускается из кабинета: cookie сессии должна попасть на домен кабинета.

## 2. Конфигурация SHM

В админке откройте конфигурацию `telegram`. В **существующем** профиле бота добавьте поля OIDC. Пример структуры:

```json
{
  "vBios_BOT": {
    "token": "ТОКЕН_БОТА",
    "oidc_enabled": true,
    "client_id": "CLIENT_ID_ИЗ_НАСТРОЕК_TELEGRAM_LOGIN",
    "client_secret": "CLIENT_SECRET_ИЗ_НАСТРОЕК_TELEGRAM_LOGIN"
  }
}
```

Сохраните остальные поля вашего профиля: шаблоны, обработчики и прочие настройки. Не заменяйте весь `config.telegram` этим минимальным примером. Имя `vBios_BOT` чувствительно к регистру; оно должно соответствовать реальному профилю. В `config.ticket.telegram_profile` укажите то же имя, если тикеты используют этого бота. Сам OIDC не требует изменения `config.ticket`.

Поддерживаются также имена `oidc_client_id` и `oidc_client_secret`. Не публикуйте Client Secret в GitHub, Compose или настройках JavaScript кабинета.

В `config.billing` проверьте:

```json
{
  "allow_user_auth_api": true,
  "allow_user_register_api": true
}
```

Это также фрагмент существующей конфигурации. Если регистрация новых пользователей запрещена, задайте `allow_user_register_api: false`: кабинет передаст Telegram вход без автоматического создания пользователя.

## 3. Кабинет и сеть

Обновлённый кабинет получает доступность входа и имя профиля из `GET /shm/v1/system/auth`. В Compose для `client` можно оставить настройки совместимости:

```yaml
environment:
  TELEGRAM_OIDC_AUTH_ENABLE: "true"
  TELEGRAM_BOT_AUTH_PROFILE: "vBios_BOT"
  TELEGRAM_BOT_AUTH_ENABLE: "false"
```

Актуальный кабинет использует `/system/auth` для обнаружения входа; явное `TELEGRAM_OIDC_AUTH_ENABLE: "true"` также сохраняет кнопку и выбранный `TELEGRAM_BOT_AUTH_PROFILE`, даже если обнаружение сообщает `enabled: false`. Видимость кнопки не заменяет настройку OIDC в backend. Для OIDC необходим доступ **из core** к `https://oauth.telegram.org` для обмена кода и получения ключей проверки подписи. Прокси для `api.telegram.org` сам по себе эту задачу не решает. Браузер также должен открывать `oauth.telegram.org`.

Redis должен быть доступен core: там сохраняются state, nonce, PKCE и контекст привязки. Не перезапускайте Redis между началом входа и callback.

На внешнем Nginx кабинета передавайте исходные адрес и HTTPS:

```nginx
location / {
    proxy_pass http://127.0.0.1:9082;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Замените `9082` на порт вашего `client`. Эта секция должна находиться в HTTPS-сервере с действующим сертификатом. HTTP-сервер может перенаправлять запросы на HTTPS. Не удаляйте `Set-Cookie` и не включайте общий кэш для `/shm/`.

## 4. Обновление и проверка

После успешной сборки образов в GitHub Actions:

```bash
cd /opt/shm
docker compose pull api core spool client
docker compose up -d --no-deps --force-recreate api core spool client
curl -fsS https://bill.pbalka.ru/shm/v1/system/auth
```

Миграция базы данных для этого исправления не требуется. В ответе внутри `data` (объект или первый элемент массива) ожидаются:

```json
{
  "telegram": { "enabled": true, "profile": "vBios_BOT" }
}
```

Проверьте в приватном окне браузера: «Войти через Telegram» → подтверждение в Telegram → возврат в кабинет. Обновите страницу: вход должен сохраниться. Нажмите выход и снова обновите страницу: кабинет должен остаться закрытым.

Для привязки войдите обычным способом, откройте профиль и нажмите кнопку Telegram. Инициализация идёт через авторизованный `/telegram/web/auth/init`; uid вручную передавать не нужно. Уже привязанный к другому пользователю Telegram не переносится автоматически.

## Маршруты

| Задача | Маршрут GET |
|---|---|
| Доступные способы входа | `/shm/v1/system/auth` |
| Telegram: инициализация привязки | `/shm/v1/telegram/web/auth/init` |
| Telegram: старт входа | `/shm/v1/telegram/web/auth/start` |
| Telegram: callback | `/shm/v1/telegram/web/callback` |
| Остальные OAuth2-провайдеры: инициализация | `/shm/v1/oauth2/init/{provider}` |
| Остальные OAuth2-провайдеры: старт | `/shm/v1/oauth2/start/{provider}` |
| Остальные OAuth2-провайдеры: callback | `/shm/v1/oauth2/callback/{provider}` |

Telegram не следует запускать как `/oauth2/start/telegram`. Для Google, Yandex и GitHub нужны отдельные Client ID / Secret в `config.oauth2` и callback соответствующего провайдера. В этой сборке нет модуля VK: одно упоминание VK в описании API не подключает его.

Если вход не завершён, проверьте `docker compose logs --since=5m core`. Ошибки `client_id/client_secret` означают неверную конфигурацию профиля; ошибки обмена кода — доступ к OAuth Telegram или несовпадающий callback; отсутствие сохранённого state — доступность Redis или просроченный вход. Не публикуйте cookie, коды подтверждения и секреты из журналов.
