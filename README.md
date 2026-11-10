# vBios: сервер и кабинет с S3-вложениями

Исходники server/ и client/ собираются GitHub Actions в три образа GHCR: vbios-core, vbios-api, vbios-client. Spool использует тот же vbios-core. MySQL, Redis, административный интерфейс остаются отдельными существующими образами.

Yandex Object Storage — внешнее хранилище. GitHub собирает код интеграции, а ключи Yandex задаются только на сервере. Создание репозитория само не создаёт бакет и не запускает облако.

## Новый репозиторий

В GitHub создайте пустой репозиторий, например dev-vbs/vbios-ticket-yandex. Это пример нового имени: если выбрали другое, замените URL. Не добавляйте автоматически README/.gitignore/LICENSE: они уже есть в комплекте или соответствующих исходниках. Лицензии исходных проектов сохраняются в server/ и client/.

Распакуйте весь GitHub-архив в новую папку. В Git Bash Here из корня, где README.md, server/ и client/:

```bash
set -e
test -f server/Dockerfile
test -f client/package.json
git init
git branch -M main
git add .
git diff --cached --stat
git commit -m "Добавлены сервер и кабинет vBios с S3-вложениями и Telegram Reply"
git remote add origin https://github.com/dev-vbs/vbios-ticket-yandex.git
git push -u origin main
```

Перед git add убедитесь, что не добавляли свои ключи/пароли. В скачанном комплекте нет рабочего .env. Если Git просит identity: задайте свой user.name/user.email. При HTTPS-входе используйте поддерживаемый GitHub способ авторизации, не пароль аккаунта и не секреты Yandex.

Если используете существующий репозиторий, сначала клонируйте его, сохраните изменения и перенесите нужные файлы. Не применяйте git push --force для обхода конфликта истории.

## Публикация образов

Откройте Actions → Build and publish vBios images. Дождитесь успеха всех трёх задач. При отключённых Actions разрешите их в настройках репозитория; политика организации должна разрешать запись packages. Workflow использует встроенный GITHUB_TOKEN, отдельный токен сборки вручную не нужен.

Для владельца dev-vbs публикуются:

```text
ghcr.io/dev-vbs/vbios-core:latest
ghcr.io/dev-vbs/vbios-api:latest
ghcr.io/dev-vbs/vbios-client:latest
```

Имя пакета определяется владельцем и matrix.image, не именем репозитория. Если у dev-vbs уже есть пакет vbios-client или vbios-core от другого проекта, возможен конфликт прав или перезапись latest! До первого push выберите: либо намеренно обновлять эти пакеты, либо измените имена matrix.image (например vbios-yandex-core/api/client) и соответствующие image в Compose. Изменение имён должно быть согласовано в обоих местах. Для вашего приведённого Compose используются именно vbios-core/api/client.

По умолчанию новый GHCR-пакет может быть private. Для публичного скачивания откройте настройки каждого пакета в GitHub Packages и измените visibility на Public, если это допустимо. Иначе сервер должен выполнить docker login ghcr.io аккаунтом с доступом и токеном read:packages.

## Развёртывание на существующем сервере

1. Сохраните текущий /opt/shm/.env, Compose, образы и резервную копию БД. Не заменяйте существующие пароли MySQL примерами: это не меняет пароль уже созданной базы и сломает подключение приложения.
2. Примените дополнительный server/app/sql/ticket-3.7.0.sql из исходников согласно INSTALL-SOURCE.md. Если схема уже обновлена, повторное выполнение не очищает данные. Не меняйте _shm ради миграции.
3. Используйте корневой docker-compose.yml из этого репозитория в /opt/shm. Для registry-режима больше не добавляйте compose.ticket-storage.yml: он переключает образы обратно на локальную сборку. Проверьте также, не подхватывается ли автоматически ваш docker-compose.override.yml.
4. В существующем /opt/shm/.env измените только нужные поля:

```dotenv
SHM_REPO=ghcr.io/dev-vbs
CORE_VERSION=latest
CLIENT_VERSION=ghcr.io/dev-vbs/vbios-client:latest
TICKET_S3_ACCESS_KEY=ВАШ_ACCESS_KEY_ID
TICKET_S3_SECRET_KEY=ВАШ_SECRET_ACCESS_KEY
```

5. Сохраните текущие TZ, пароли, MYSQL_* и порты. Значения ADMIN_VERSION также оставьте совместимыми с вашей установкой.
6. После успешной публикации всех образов:

```bash
cd /opt/shm
docker compose config --quiet
docker compose pull core spool api client
docker compose up -d --no-deps --force-recreate core spool api client
docker compose ps
docker compose logs --tail=80 core api
```

Контейнеры core/spool получают S3-ключи из environment. API/client обновляются вместе с ними. Нельзя обновить только кабинет: контракт скачивания вложений изменён. Эти команды не обновляют MySQL/Redis и не удаляют тома.

В SHM config.ticket добавьте storage: {"provider":"yandex","bucket":"ВАШ_БАКЕТ"}, сохранив AI и Telegram. Настройка приватного бакета — docs/S3.md. Инструкция по Reply — docs/REPLY.md. Во внешнем Nginx лимит client_max_body_size 10m.

## Версионирование

latest меняется после push main. Для согласованного выпуска лучше тег:

```bash
git tag v3.7.0-s3.1
git push origin v3.7.0-s3.1
```

После сборки всех трёх образов:

```dotenv
CORE_VERSION=v3.7.0-s3.1
CLIENT_VERSION=ghcr.io/dev-vbs/vbios-client:v3.7.0-s3.1
```

Штатная версия SHM остаётся 3.7.0: тег Docker v3.7.0-s3.1 не меняет schema version автоматически. Не смешивайте образы разных выпусков. Для отката храните предыдущие теги и резервные копии; старая версия кабинета может не понимать облачные вложения.

## Последующие обновления

```bash
git add server client .github docker-compose.yml README.md
git commit -m "Обновлены тикеты и хранение вложений vBios"
git push origin main
```

Дождитесь Actions, затем выполните pull/up на сервере. Без отдельной настроенной системы развёртывания GitHub не перезапускает сервер автоматически.

Клиент ранее собран, модуль S3 и Reply проверены локальными тестами. Workflow и настоящий запуск Docker/GHCR здесь ещё не выполнялись. Сборка зависит от доступности исходного базового образа danuk/shm-core-base:latest. Возможности отсутствующих расширений сервера не появляются от публикации образов — ограничения описаны в INSTALL-SOURCE.md.
