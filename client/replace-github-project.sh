#!/usr/bin/env bash
set -Eeuo pipefail

# Полная замена содержимого GitHub-репозитория содержимым локального проекта.
# Запускать из Git Bash на Windows.
#
# Пример:
#   bash replace-github-project.sh \
#     "https://github.com/USER/REPO.git" \
#     "C:/Users/root/Downloads/shm-client-2-main/shm-client-2-main" \
#     main
#
# Для приватного репозитория используйте уже настроенный SSH remote:
#   git@github.com:USER/REPO.git

REMOTE_URL="${1:-}"
SOURCE_DIR="${2:-}"
BRANCH="${3:-main}"
WORK_DIR="${4:-}"

if [[ -z "$REMOTE_URL" || -z "$SOURCE_DIR" ]]; then
  echo "Использование: $0 <git-url> <source-dir> [branch] [work-dir]"
  exit 2
fi

SOURCE_DIR="$(cd "$SOURCE_DIR" && pwd)"
if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Ошибка: исходная папка не найдена: $SOURCE_DIR" >&2
  exit 1
fi

if [[ -z "$WORK_DIR" ]]; then
  repo_name="$(basename "${REMOTE_URL%.git}")"
  WORK_DIR="$(pwd)/$repo_name"
fi

if [[ "$WORK_DIR" == "$SOURCE_DIR" ]]; then
  echo "Ошибка: исходная папка и папка репозитория совпадают." >&2
  exit 1
fi

if [[ -e "$WORK_DIR/.git" ]]; then
  echo "Используется существующий репозиторий: $WORK_DIR"
  git -C "$WORK_DIR" fetch origin || true
else
  if [[ -e "$WORK_DIR" && -n "$(find "$WORK_DIR" -mindepth 1 -maxdepth 1 -print -quit)" ]]; then
    echo "Ошибка: папка назначения уже существует и не пуста: $WORK_DIR" >&2
    echo "Передайте четвёртым аргументом пустую папку или удалите её вручную." >&2
    exit 1
  fi
  mkdir -p "$(dirname "$WORK_DIR")"
  git clone "$REMOTE_URL" "$WORK_DIR"
fi

# Проверяем, что remote действительно указывает на запрошенный проект.
git -C "$WORK_DIR" remote set-url origin "$REMOTE_URL"

echo "Ветка назначения: $BRANCH"
git -C "$WORK_DIR" checkout -B "$BRANCH"

# Полностью очищаем рабочее дерево, включая скрытые файлы, но сохраняем .git.
find "$WORK_DIR" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf -- {} +

# Копируем проект, исключая его локальную историю Git и типичные артефакты.
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete \
    --exclude '.git' \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude '.env' \
    --exclude '.env.*' \
    "$SOURCE_DIR/" "$WORK_DIR/"
elif command -v tar >/dev/null 2>&1; then
  # tar обычно доступен в Git Bash и корректно переносит скрытые файлы.
  find "$WORK_DIR" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf -- {} +
  tar -C "$SOURCE_DIR" \
    --exclude=.git \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=.env \
    --exclude='.env.*' \
    -cf - . | tar -C "$WORK_DIR" -xf -
else
  echo "Ошибка: нужен rsync или tar (оба входят в стандартные сборки Git Bash)." >&2
  exit 1
fi
git -C "$WORK_DIR" add -A
if git -C "$WORK_DIR" diff --cached --quiet; then
  echo "Изменений нет — содержимое уже совпадает."
  exit 0
fi

git -C "$WORK_DIR" commit -m "Replace project with updated client"
git -C "$WORK_DIR" push --set-upstream origin "$BRANCH" --force-with-lease

echo
echo "Готово: GitHub-проект заменён и отправлен в origin/$BRANCH"
echo "Локальная копия: $WORK_DIR"

