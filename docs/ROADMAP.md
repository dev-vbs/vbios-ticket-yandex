# Roadmap vBios Enterprise

Roadmap отражает фактические зависимости и не объявляет незавершённые возможности готовыми.

## Фаза 1 — Foundation и безопасность

- Разделить admin permissions на backend-enforced capabilities.
- Добавить mutation audit log с actor, target, operation, result, request id и timestamp.
- Заменить browser `Math.random()` для секретов на Web Crypto и добавить backend генерацию для чувствительных ключей.
- Зафиксировать Docker image versions/digests в production override, добавить rollback checklist.
- Проверить CSRF/CORS/session/Telegram/OIDC/file upload boundaries и расширить security tests.

## Фаза 2 — Dashboard PRO

- Согласовать определения MRR, ARR, ARPU, LTV, CAC, churn, renewal и conversion.
- Добавить backend агрегаты с диапазоном дат, timezone и пагинацией.
- Убрать клиентские лимиты 5000/9999 из аналитического запроса.
- Добавить реальные источники расходов, возвратов и инфраструктурных затрат или явно показывать unavailable.

## Фаза 3 — CRM PRO

- Карточка клиента с единым backend контрактом и вкладками.
- Поиск, фильтры, сортировка, server-side pagination.
- CSV export с permission check и redaction.
- Segments и массовые операции через preview, confirmation и idempotency key.

## Фаза 4 — Server Intelligence

- Сохранение snapshots Remnawave node health.
- Метрики CPU/RAM/disk/network только если API реально их отдаёт.
- Thresholds, deduplication, incident acknowledgement и recovery.
- Telegram notifications через существующий transport с rate limiting.

## Фаза 5 — AI Assistant

- Read-only tool registry: analytics, tickets, services, health.
- Минимизация персональных данных, redaction и tenant/role checks.
- Запрет произвольного SQL и мутаций.
- Audit каждого запроса и ответа.

## Фаза 6 — Multi-admin и tenant design

- RBAC capability matrix.
- Tenant threat model, data ownership, migration and rollback.
- Isolation tests на API, queries, cache keys, storage, events and background jobs.
- Только после этого — tenant-aware schema migration.

## Release gate

Production release возможен после frontend/backend builds, integration tests, security regression suite, Docker config validation, migration rollback rehearsal и проверки платежного/Remnawave flow на staging.
