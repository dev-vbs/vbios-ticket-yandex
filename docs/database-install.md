# Полная установка базы vBios SHM

`server/app/sql/vbios-full-install.sql` — единый SQL для **новой пустой базы MySQL 8.x**. Содержит текущую схему SHM, стандартные начальные записи SHM, тикеты, задания ИИ, Telegram-связи и вложения, Object Storage и аватары. Старые исторические миграции поверх актуальной структуры запускать не нужно.

Это не резервная копия вашего сервера. Пользователей, платежей, тарифов и секретов действующей установки здесь нет. Используется стандартная первоначальная учётная запись SHM: смените её пароль перед открытием кабинета в интернете. Начальные домены и платёжные реквизиты являются шаблонными; настройте их в админке.

## Импорт

Не запускайте импорт в действующую базу. Скрипт проверяет отсутствие таблиц и выдаёт ошибку, если база уже заполнена. Не используйте `mysql --force` и не включайте продолжение импорта после ошибок в phpMyAdmin. После неудачного импорта в новую базу исправьте причину и выберите другую пустую базу: DDL MySQL не откатывается транзакцией.

1. Создайте пустую базу в phpMyAdmin с кодировкой utf8mb4.
2. Выберите её → «Импорт» → `vbios-full-install.sql` → выполните импорт без продолжения после ошибок.
3. Либо используйте Docker (только когда база из MYSQL_DATABASE ещё пуста, до первого запуска core):

```bash
cd /opt/shm
mkdir -p sql
curl -fL https://raw.githubusercontent.com/dev-vbs/vbios-ticket-yandex/main/server/app/sql/vbios-full-install.sql -o sql/vbios-full-install.sql
docker compose up -d mysql
docker compose cp sql/vbios-full-install.sql mysql:/tmp/vbios-full-install.sql
docker compose exec -T mysql sh -lc 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql --default-character-set=utf8mb4 -u root "$MYSQL_DATABASE" < /tmp/vbios-full-install.sql'
```

Дождитесь готовности MySQL (`docker compose ps`). Если core уже запускался, он мог сам создать таблицы: используйте штатную установку и отдельные дополнительные миграции из README вместо этого файла.

После успешного импорта:

```bash
docker compose up -d
docker compose restart core api
docker compose ps
docker compose logs --since=5m core api
```

Настройте домен, почту, тарифы, Telegram/OIDC, ИИ, Remnawave и Object Storage. SQL не может автоматически получить токены и ключи этих сервисов. Изображения в бакете не входят в SQL; для переноса действующей установки нужны резервная копия БД и сами объекты хранилища.

Проверка таблиц:

```bash
docker compose exec mysql sh -lc 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -u root "$MYSQL_DATABASE" -e "SHOW TABLES; SELECT user_id,login FROM users;"'
```

Файл собран из SQL текущего репозитория. Выполнение на настоящем MySQL в среде подготовки не проверено: локальный Docker Engine недоступен. Перед продакшеном импортируйте в отдельную тестовую базу.