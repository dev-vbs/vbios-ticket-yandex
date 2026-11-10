# Обновление существующего репозитория GitHub

## 1. Склонируйте актуальную main в отдельную папку

```bash
git clone https://github.com/dev-vbs/vbios-client.git vbios-client-update
cd vbios-client-update
git switch main
git pull --ff-only origin main
```

Скопируйте содержимое папки project из архива в vbios-client-update с заменой совпадающих файлов, включая скрытые .github, .gitignore и .gitattributes. Не копируйте папку project как вложенный каталог. Архив не содержит .git, node_modules и .env. Существующие файлы, которых нет в пакете, не удаляйте автоматически: сначала проверьте их назначение.

Это сборка изменений из переписки, а не автоматически объединённая версия последней main. Если GitHub менялся после присланных исходников, сравните diff и сохраните более новые изменения перед коммитом.

## 2. Проверьте сборку

```bash
npm ci
npm run build
git status --short
git diff --stat
git diff --check
```

Не добавляйте токены и локальную .env. .env.example и .env.deploy.example содержат только примеры.

## 3. Создайте коммит

Рекомендуемый вариант с описанием:

```bash
git add .
git diff --cached --stat
git commit -F COMMIT_MESSAGE.txt
git push origin main
```

Короткий вариант:

```bash
git add .
git commit -m "feat: redesign VPN cabinet and clarify purchase flow"
git push origin main
```

Если требуется именно текст first commit, хотя это обновление существующего проекта:

```bash
git commit -m "first commit" -m "Redesign VPN cabinet, add balance and operations pages, improve mobile navigation and document deployment."
```

Выполните только один вариант git commit. Не выполняйте git init и git remote add origin повторно внутри клона. Не используйте git push --force. При конфликте с обновлённой main сначала получите и согласуйте изменения.

Если main защищена, используйте ветку:

```bash
git switch -c feature/vpn-cabinet-redesign
git add .
git commit -F COMMIT_MESSAGE.txt
git push -u origin feature/vpn-cabinet-redesign
```

Откройте Pull Request в main. Проверка сборки запустится на PR, публикация latest — после merge.

## 4. Дождитесь Actions

Откройте Actions → Build and publish image. После успешной публикации обновите сервер:

```bash
docker compose pull client
docker compose up -d --no-deps client
docker compose logs --tail=50 client
```

Команды предполагают сервис client и image ghcr.io/dev-vbs/vbios-client:latest. Если у вас другое имя сервиса, подставьте его. Один push в GitHub не обновляет уже запущенный сервер: pull и пересоздание выполняются отдельно.

## 5. Откат

Перед обновлением сохраните тег/идентификатор предыдущего образа. Укажите в Compose прежний тег вместо latest, затем выполните pull и up. Не удаляйте старые образы до проверки входа, услуг и оплаты.
