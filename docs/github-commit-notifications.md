# Уведомления о новых коммитах

Workflow `.github/workflows/publish.yml` отправляет уведомление в Telegram после успешной сборки и публикации образов из ветки `main`.

Добавьте в настройках репозитория GitHub → **Settings → Secrets and variables → Actions** два Repository secrets:

- `TELEGRAM_BOT_TOKEN` — токен бота от BotFather;
- `TELEGRAM_CHAT_ID` — ID личного чата, группы или канала, куда отправлять уведомления. Для группы обычно используется отрицательный ID вида `-1001234567890`.

Бота нужно добавить в группу или канал и дать ему право отправлять сообщения. Узнать ID группы можно через служебного бота Telegram или по обновлениям Bot API. Не указывайте ID с кавычками и не добавляйте пробелы.

Для разового запуска через **Actions → Build and publish vBios images → Run workflow** можно указать `telegram_chat_id` прямо в форме запуска. Для постоянных уведомлений используйте Repository secret `TELEGRAM_CHAT_ID` или Repository variable с таким же именем.

Уведомление содержит репозиторий, ветку, короткий SHA коммита, автора, сообщение коммита, список изменённых файлов и команды обновления:

```bash
docker compose pull client admin core api
docker compose up -d --no-deps --force-recreate client admin core api
docker compose ps
docker compose logs --tail=50 client admin core api
```

Если секреты не настроены, workflow продолжит работу без отправки сообщения.
