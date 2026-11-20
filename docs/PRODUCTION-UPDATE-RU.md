# Обновление vBios в production

Все команды выполняйте на сервере из каталога, где находится рабочий `docker-compose.yml`, обычно `/opt/shm`.

## Перед обновлением

Сделайте резервную копию базы и сохраните текущие теги образов:

```sh
cd /opt/shm
cp .env .env.backup.$(date +%Y%m%d-%H%M%S)
docker compose config --quiet
docker compose ps
```

Не удаляйте volumes и не используйте `docker compose down -v`: в volumes находятся MySQL, Redis и данные SHM.

## Обновление после нового коммита

GitHub Actions публикует четыре образа: `vbios-core`, `vbios-api`, `vbios-clients`, `vbios-admin`. Для текущего `main` используйте:

```sh
cd /opt/shm
docker compose pull api core spool client admin
docker compose up -d --no-deps --force-recreate core spool api client admin
docker compose ps
```

`spool` использует тот же образ `vbios-core`, поэтому его нужно пересоздавать вместе с `core`. `mysql` и `redis` перезапускать при обновлении кода не нужно.

Порядок для более осторожного обновления:

```sh
docker compose pull core
# сначала backend и очередь
docker compose up -d --no-deps --force-recreate core spool
docker compose pull api
# API пересоздаётся после core
docker compose up -d --no-deps --force-recreate api
docker compose pull client admin
docker compose up -d --no-deps --force-recreate client admin
```

## Только пользовательский кабинет

После изменений в `client/` достаточно:

```sh
docker compose pull client
docker compose up -d --no-deps --force-recreate client
docker compose logs --tail=80 client
```

## Только админка

```sh
docker compose pull admin
docker compose up -d --no-deps --force-recreate admin
docker compose logs --tail=80 admin
```

## Backend, платежи, Remnawave и очередь

После изменений в `server/`, SHM API, платежах, авторизации, Remnawave или локальных шаблонах:

```sh
docker compose pull core spool api
docker compose up -d --no-deps --force-recreate core spool api
docker compose ps core spool api
docker compose logs --tail=120 core spool api
```

Если добавлялась SQL-схема, сначала сделайте backup и примените миграцию по инструкции конкретного файла. Пересоздание контейнера не применяет SQL автоматически.

## Проверка после обновления

```sh
docker compose ps
docker compose exec api wget -qO- http://127.0.0.1/shm/healthcheck.cgi
docker compose logs --tail=100 core spool api client admin
```

Проверьте вручную:

1. Вход в кабинет.
2. Загрузку «Мой VPN».
3. Оплату через SHM на тестовом аккаунте.
4. Открытие ссылки и QR-кода.
5. Центр устройств.
6. Диагностику Remnawave и статус серверов.
7. В админке пользователей, платежи и очередь spool.

Проверка `/shm/healthcheck.cgi` подтверждает доступность API, но не подтверждает реальную оплату или выдачу Remnawave.

## Если нужно обновить конфигурацию

После изменения `.env`, compose environment, CORS, Telegram или S3 используйте `--force-recreate`; обычный `restart` не перечитывает environment:

```sh
docker compose config --quiet
docker compose up -d --no-deps --force-recreate core spool api client admin
```

После изменения только `config.main`/`config.remna` через SHM local контейнеры перезапускать не нужно: обновите страницу и подождите кэш мониторинга до 15 секунд.

## Откат

Не используйте `latest` для контролируемого production-релиза. Сохраните рабочие значения:

```dotenv
CORE_VERSION=sha-ВАШ_РАБОЧИЙ_SHA
CLIENT_VERSION=ghcr.io/dev-vbs/vbios-clients:sha-ВАШ_РАБОЧИЙ_SHA
ADMIN_VERSION=ghcr.io/dev-vbs/vbios-admin:sha-ВАШ_РАБОЧИЙ_SHA
```

После возврата тегов:

```sh
docker compose config --quiet
docker compose pull core spool api client admin
docker compose up -d --no-deps --force-recreate core spool api client admin
docker compose ps
```

Не откатывайте код после необратимой SQL-миграции без совместимой процедуры rollback. Сначала остановите дальнейшую обработку платежей только по вашему регламенту и проверьте совместимость схемы.

## Если контейнер не запускается

```sh
docker compose ps -a
docker compose logs --tail=200 ИМЯ_СЕРВИСА
docker compose config
```

Сначала исправьте причину в `.env`, образе или healthcheck. Не удаляйте volumes и не запускайте `down -v` для «починки».
