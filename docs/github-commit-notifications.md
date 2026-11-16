# Уведомления о новых коммитах

Workflow `.github/workflows/publish.yml` отправляет уведомление в Telegram после успешной сборки и публикации образов из ветки `main`.

Добавьте в настройках репозитория GitHub → **Settings → Secrets and variables → Actions** два Repository secrets:

- `TELEGRAM_BOT_TOKEN` — токен бота от BotFather;
- `TELEGRAM_CHAT_ID` — ID личного чата, группы или канала, куда отправлять уведомления.

Уведомление содержит репозиторий, ветку, короткий SHA коммита, автора, сообщение коммита, список изменённых файлов и команды обновления:

```bash
docker compose pull client admin core api
docker compose up -d --no-deps --force-recreate client admin core api
docker compose ps
docker compose logs --tail=50 client admin core api
```

Если секреты не настроены, workflow продолжит работу без отправки сообщения.
