#!/usr/bin/env bash
set -euo pipefail

# Удаляет закрытые тикеты старше указанного количества дней.
# Использование:
#   ./scripts/purge-tickets.sh 3 --dry-run
#   ./scripts/purge-tickets.sh 3

DAYS="${1:-3}"
MODE="${2:-}"
[[ "$DAYS" =~ ^[0-9]+$ ]] || { echo "Использование: $0 [дни] [--dry-run]" >&2; exit 2; }

MYSQL_SERVICE="${MYSQL_SERVICE:-mysql}"
MYSQL_USER_VALUE="${MYSQL_USER:-webface}"
MYSQL_DATABASE_VALUE="${MYSQL_DATABASE:-webface}"
MYSQL_PASSWORD_VALUE="${MYSQL_PASS:-}"
S3_BUCKET_VALUE="${TICKET_S3_BUCKET:-}"
S3_ENDPOINT_VALUE="${TICKET_S3_ENDPOINT:-https://storage.yandexcloud.net}"
S3_REGION_VALUE="${TICKET_S3_REGION:-ru-central1}"

mysql_exec() {
  if [[ -n "$MYSQL_PASSWORD_VALUE" ]]; then
    docker compose exec -T "$MYSQL_SERVICE" env MYSQL_PWD="$MYSQL_PASSWORD_VALUE" \
      mysql -u "$MYSQL_USER_VALUE" "$MYSQL_DATABASE_VALUE" "$@"
  else
    docker compose exec -T "$MYSQL_SERVICE" mysql -u "$MYSQL_USER_VALUE" -p "$MYSQL_DATABASE_VALUE" "$@"
  fi
}

ROWS="$(mysql_exec --batch --skip-column-names -e "
SELECT DISTINCT o.bucket, o.object_key
FROM ticket_media_objects o
JOIN ticket_message_media mm ON mm.media_id=o.media_id
JOIN ticket_messages m ON m.message_id=mm.message_id
JOIN tickets t ON t.ticket_id=m.ticket_id
WHERE t.status IN ('closed','archived')
  AND t.closed_at IS NOT NULL
  AND t.closed_at < DATE_SUB(NOW(), INTERVAL ${DAYS} DAY);")"

TICKETS="$(mysql_exec --batch --skip-column-names -e "
SELECT ticket_id
FROM tickets
WHERE status IN ('closed','archived')
  AND closed_at IS NOT NULL
  AND closed_at < DATE_SUB(NOW(), INTERVAL ${DAYS} DAY)
ORDER BY ticket_id;")"

echo "Тикеты к удалению (старше ${DAYS} дн.):"
printf '%s\n' "$TICKETS"
[[ "$MODE" == "--dry-run" ]] && { echo "DRY RUN: удаление не выполнялось"; exit 0; }

if [[ -n "$S3_BUCKET_VALUE" && -n "$ROWS" && -x "$(command -v aws || true)" ]]; then
  while IFS=$'\t' read -r bucket key; do
    [[ -n "$bucket" && -n "$key" ]] || continue
    aws --region "$S3_REGION_VALUE" --endpoint-url "$S3_ENDPOINT_VALUE" \
      s3api delete-object --bucket "$bucket" --key "$key" >/dev/null
  done <<< "$ROWS"
else
  echo "S3 очистка пропущена: задайте TICKET_S3_BUCKET и установите aws CLI" >&2
fi

mysql_exec -e "
DELETE t FROM tickets t
WHERE t.status IN ('closed','archived')
  AND t.closed_at IS NOT NULL
  AND t.closed_at < DATE_SUB(NOW(), INTERVAL ${DAYS} DAY);"

echo "Очистка завершена."
