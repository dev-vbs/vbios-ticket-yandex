# Уведомления о публикации образов

После успешной сборки и публикации образов из ветки `main` GitHub Actions отправляет сообщение в Telegram. В нём указаны коммит, изменённые файлы, опубликованные образы и команды обновления.

В репозитории откройте **Settings → Secrets and variables → Actions** и добавьте следующие значения.

| Имя | Где указать | Значение |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | Repository secret | Токен бота от BotFather |
| `TELEGRAM_CHAT_ID` | Repository secret или variable | Числовой ID группы, например `-1001234567890` |
| `TELEGRAM_MESSAGE_THREAD_ID` | Repository secret или variable | Числовой ID темы форума, например `42`. Необязательный параметр |
| `UPDATE_SERVICES` | Repository variable | Имена сервисов Compose через пробел. По умолчанию `core spool client` |

Добавьте бота в группу и разрешите ему отправлять сообщения. Для форума включите темы в настройках группы и создайте тему для обновлений. ID группы и темы можно получить из ссылки на сообщение внутри темы. В ссылке вида `https://t.me/c/1234567890/42/100` ID группы будет `-1001234567890`, а ID темы — `42`. Для проверки можно отправить сообщение в нужную тему и посмотреть `message.chat.id` и `message.message_thread_id` в ответе Telegram Bot API `getUpdates`, если у бота не установлен webhook. Не публикуйте токен бота.

По умолчанию сообщение содержит следующие команды.

```bash
cd /opt/shm
docker compose pull core spool client
docker compose up -d --no-deps --force-recreate core spool client
docker compose ps
```

Если на сервере установлены и другие опубликованные сервисы, добавьте их имена в `UPDATE_SERVICES`, например `core spool client push`. Указывайте только сервисы, существующие в вашем `docker-compose.yml` и использующие нужные образы. Список опубликованных образов в сообщении относится к сборке GitHub Actions и не означает, что каждый из них используется на сервере.

Проверьте работу через **Actions → Build and publish vBios images → Run workflow**, выбрав ветку `main`. После успешной сборки откройте запуск **Notify about published vBios images**. При отсутствии токена или ID чата отправка пропускается. Ошибки отправки и неверный ID темы видны в журнале этого запуска.
