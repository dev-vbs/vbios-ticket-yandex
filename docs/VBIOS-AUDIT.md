# Аудит vBios

Дата аудита: 20 ноября 2026 года. Репозиторий: `vbios-ticket-yandex`, ветка `main`.

## Архитектура

- `server/` — существующий Perl SHM backend, CGI API, Core-модули, MySQL и Redis интеграции.
- `client/` — пользовательский React/TypeScript/Vite кабинет, Mantine, PWA, AJAX API-клиент.
- `admin/` — отдельная React/Vite административная панель с аналитикой, пользователями, услугами, платежами, серверами, spool, шаблонами и конфигурацией.
- `docker-compose.yml` — api, core, spool, admin, client, mysql, redis и phpMyAdmin.
- Remnawave — серверный модуль `Core::Remnawave`, отдельный кабинетный модуль, подписанные SHM-заказы расширений и независимый ledger.
- Авторизация — SHM-сессии, OTP/Passkey/Telegram OIDC в клиенте; admin хранит сессию в Zustand persist и отправляет её как `session-id`.

## Уже реализовано

### Кабинет и Remnawave

- AJAX-вход, светлая/тёмная тема, адаптивная навигация.
- Услуги, баланс, операции, платежи, тикеты, профиль, уведомления.
- Ссылка подписки, QR, импорт в приложение, центр устройств.
- Диагностика Remnawave, график трафика, история запросов подписки.
- Замена скомпрометированной ссылки с ограничением и восстановлением после неопределённого ответа.
- Покупка расширений устройств, трафика и Internal Squad через SHM после проверки `is_paid`.
- HMAC-подпись заказа, SQL ledger, идемпотентная выдача и блокировка параллельных изменений.
- Смена основного тарифа через существующий SHM flow. Пользовательский блок больше не показывает общий выбор серверов и сброс всех HWID.

### Админка

- Dashboard и Analytics уже используют реальные backend API и `Core::Analytics`.
- Есть страницы Users, UserServices, Services, Withdraws, Pays, PaymentSystems, Servers, ServerGroups, Templates, Events, Spool, SpoolHistory, Configuration, Profiles, Bonuses, Promo, Topology.
- Есть базовые admin boundary checks в SHM API: `/admin/*` требует `is_admin`.

### Проверки

- Перл-тесты репозитория и Remnawave cabinet suite запускались ранее; последняя проверка Remnawave дала 70 проверок.
- Клиентская production-сборка проходит.
- Playwright QA для кабинета проверяет обе темы, desktop/mobile, смену тарифа, замену ссылки и отсутствие горизонтального overflow.

## Найденные ограничения и риски

1. Admin frontend фактически различает только `gid === 1` в `authStore`; полноценной backend RBAC-модели с ролями Owner/Finance/Support/Infrastructure нет.
2. Админские API имеют общий `admin_mode`, но granular permission checks для отдельных операций в проверенных маршрутах не представлены. Скрытие раздела в интерфейсе не заменяет permission enforcement.
3. Multi-tenant изоляция отсутствует: схема `users`, `services`, `pays_history`, `user_services` и другие таблицы не содержат tenant scope. Внедрять tenant поверх текущей базы без миграционного дизайна опасно.
4. Server Intelligence ограничен Remnawave status/nodes и кабинетным HTTP/TCP измерением. История CPU/RAM/disk/network, инциденты, пороги и Telegram alerts не реализованы как единая серверная подсистема.
5. Финансовая аналитика уже есть, но отдельные показатели из запроса (expenses, CAC, ARPU, ARR, MRR в строгом определении, refunds и инфраструктурные расходы) требуют подтверждённых источников данных. Нельзя рассчитывать их из фиктивных значений.
6. AI-интеграция существует для поддержки, но безопасного read-only admin assistant с allowlist инструментов и аудитом действий не выделено.
7. Docker содержит плавающие `latest`/`lts` для admin/client/mysql/redis/phpmyadmin по умолчанию. Для production необходимы зафиксированные digest/version overrides и проверенный rollback.
8. Admin analytics frontend делает запросы с лимитами до 5000/9999. Это работает для небольших баз, но требует server-side агрегатов и пагинации для роста.
9. Runtime admin config generator использует `Math.random()` для генерации bot secret. Это не подходит для криптографических секретов; нужен `crypto.getRandomValues` либо генерация на backend.
10. Реальные production payments, Telegram/OIDC credentials, Remnawave token, MySQL/Redis и Docker daemon в этом окружении не проверялись.

## Приоритеты

P0: granular backend authorization и security regression coverage для admin mutation routes; криптографическая генерация секретов; фиксация production image versions.

P1: отдельный server-side analytics contract с пагинацией и периодами, финансовыми источниками и timezone contract; серверная история Remnawave health/alerts.

P2: multi-admin roles and audit log; CRM export/segments/mass operations with confirmation; read-only AI tools.

P3: tenant architecture design and migration plan before schema changes. Реализацию tenant нельзя начинать добавлением необязательного `tenant_id` без полного threat model и isolation tests.

## Границы этого аудита

Аудит выполнен по исходникам и существующим тестам. Доступ к production окружению, базе, секретам, GitHub Actions и реальным API не выполнялся. Следующий этап должен подтверждаться тестами и review каждого изменённого контракта.
