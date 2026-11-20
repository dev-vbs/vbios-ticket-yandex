# Multi-tenant: проектирование до реализации

Статус: архитектурная подготовка, tenant isolation ещё не реализована.

## Безопасная начальная модель

Для нескольких независимых проектов предпочтительна изоляция развёртывания: отдельная база, отдельный Redis namespace/instance, bucket/prefix credentials, SHM config и Remnawave credentials на проект. Общая управляющая плоскость должна хранить только реестр проектов и маршрутизацию. Эта модель не требует немедленного изменения всех SHM SQL-запросов.

Shared-database tenant_id модель потребует tenant ownership для users, services, servers, payments, withdrawals, sessions, configs, templates, events, queues, file metadata, audit logs и cache keys. Добавление tenant_id только в users не обеспечивает изоляцию.

## Обратная совместимость

Существующая установка остаётся одиночной без schema mutation. Сначала инвентаризируются все query entry points и фоновые задания. Затем вводится явный tenant context на backend, который устанавливает сервер из проверенной сессии/host mapping; клиентский tenant_id не является authority.

## До первой миграции

1. Утвердить модель per-deployment или shared-database и правила data residency.
2. Сделать полную резервную копию и staging restore.
3. Составить foreign-key/ownership map всех таблиц и файлов.
4. Добавить fail-closed tenant context в HTTP, spool и scheduled jobs.
5. Написать cross-tenant tests для чтения, mutation, bulk/export, cache и файлов.
6. Выполнить additive migration с default tenant и сверкой counts/checksums.
7. Проверить rollback: возврат к предыдущей версии только до появления shared-tenant записей либо через изолированный экспорт по проектам.

До выполнения этих пунктов систему нельзя рекламировать как multi-tenant SaaS с общей базой.
