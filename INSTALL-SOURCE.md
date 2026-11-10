# Полные исходники для /opt/vbios-ticket-yandex

Архив vbios-ticket-yandex-full.zip содержит папки server/ и client/. Server основан на присланном vbios-3.7.0, client — на vbios-client-main (2).zip.

Включены приватные S3-вложения тикетов, обновлённый контракт скачивания в кабинете, исправленный Telegram Reply с JSON Boolean и снятием клавиатуры после ответа, диагностическая версия TicketAI с int(max_tokens), дополнительная SQL-схема 3.7.0. Настройки и ключи вашего сервера не включены.

## Распаковка

Загрузите архив на сервер, например в /root. Для первой установки:

```bash
sudo mkdir -p /opt/vbios-ticket-yandex
sudo unzip /root/vbios-ticket-yandex-full.zip -d /opt/vbios-ticket-yandex
test -f /opt/vbios-ticket-yandex/server/Dockerfile
test -f /opt/vbios-ticket-yandex/client/package.json
```

Если исходники в этих папках уже есть и вы меняли их вручную, сначала сохраните копию и сравните изменения. Не распаковывайте с автоматической перезаписью поверх несохранённой работы.

В /opt/shm/.env сохраните все текущие параметры и добавьте:

```dotenv
VBIOS_SOURCE_DIR=/opt/vbios-ticket-yandex/server
VBIOS_CLIENT_SOURCE_DIR=/opt/vbios-ticket-yandex/client
TICKET_S3_ACCESS_KEY=ВАШ_ACCESS_KEY_ID
TICKET_S3_SECRET_KEY=ВАШ_SECRET_ACCESS_KEY
```

## База

Сначала сделайте резервную копию базы. На время миграции остановите core/spool, mysql должен работать. Скопируйте SQL:

```bash
cd /opt/shm
cp /opt/vbios-ticket-yandex/server/app/sql/ticket-3.7.0.sql ./3.7.0.sql
docker compose stop core spool
docker compose cp ./3.7.0.sql mysql:/tmp/vbios-3.7.0.sql
docker compose exec mysql mysql -u root -p webface -e 'SOURCE /tmp/vbios-3.7.0.sql;'
```

При ERROR не продолжайте до выяснения причины. SQL рассчитан на существующую БД SHM, не создаёт всю базу с нуля и не меняет её конфигурацию. Даже если версия БД уже 3.7.0, выполните дополнительный SQL вручную: штатный init.pl пропустит миграцию с уже применённым номером. Он повторно не удаляет данные. Переписывать _shm или понижать версию не нужно.

## Сборка

В архив включён compose.ticket-storage.yml. Скопируйте его рядом с вашим основным Compose:

```bash
cp /opt/vbios-ticket-yandex/compose.ticket-storage.yml /opt/shm/
cd /opt/shm
docker compose -f docker-compose.yml -f compose.ticket-storage.yml config --quiet
docker compose -f docker-compose.yml -f compose.ticket-storage.yml build core api client
docker compose -f docker-compose.yml -f compose.ticket-storage.yml \
  up -d --no-deps --force-recreate core spool api client
docker compose -f docker-compose.yml -f compose.ticket-storage.yml ps
```

Все дальнейшие команды управления выполняйте с обоими -f. Основной Compose использует registry-образы; override переключает core/spool/api/client на локальные сборки. Одни переменные VBIOS_SOURCE_DIR не включают сборку без override.

Сборка сервера использует базовый danuk/shm-core-base:latest из исходного Dockerfile и требует доступа к registry. Новые образы не опубликованы нами в GitHub/GHCR. Совместимость актуального базового образа проверяется при сборке и запуске на вашем сервере.

## Конфигурация

В config.ticket сохраните Telegram/AI и задайте storage.provider=yandex, storage.bucket=настоящее имя приватного бакета. Ключи передаются из окружения. AI инструкции: ticket.ai.instructions либо /app/data/ticket-ai-prompt.txt. Включение AI не гарантирует доступность Timeweb: HTTP 500 провайдера этим архивом не исправляется.

Config.telegram.server — ваш Telegram API proxy, если требуется. Webhook должен принимать message и callback_query, профиль бота должен совпадать с привязкой аккаунта.

Кнопка «Нужен сотрудник» в некоторых ранее выданных шаблонах вызывает api_request_human: в исходном Ticket.pm вашего 3.7.0 этот метод отсутствует. Таблица handoffs в SQL не добавляет серверный метод автоматически. Не считайте все возможности старого большого Telegram-шаблона реализованными в этих исходниках.

## Приёмка

1. Проверить /shm API и вход в кабинет.
2. Загрузить PNG в тикет, открыть после перезагрузки, проверить объект в бакете.
3. Ответить из темы поддержки. Нажать «Ответить» в новом уведомлении пользователя, отправить текст, проверить кабинет и снятие ForceReply.
4. Проверить старые вложения из MySQL.
5. Отправить новое сообщение ИИ и посмотреть status/error в ticket_ai_jobs.

Старые Telegram-уведомления до установки не имеют связи message_id с тикетом. Для Reply проверяйте новое уведомление. Фото через Telegram Reply не загружаются — используйте кабинет. Автоматический перенос BLOB в S3 и очистка сирот не добавлены.

Перед сборкой сохранены исполняемые права .cgi/.pl/.sh в ZIP; распаковывайте на Linux через unzip. В сборочный архив не включены node_modules, dist и рабочие .env; используйте npm ci при локальной сборке клиента.

## Проверено и ограничения

Сборка клиента TypeScript/Vite прошла ранее; 27 проверок S3 и 15 проверок Reply с подставными сетью/БД прошли. Диагностический TicketAI проверен на синтаксис с подставными зависимостями. Полная сборка/запуск Docker, настоящая БД, Yandex и Telegram на сервере здесь не выполнялись. Подробные инструкции S3 и Reply лежат в docs/ архива.
