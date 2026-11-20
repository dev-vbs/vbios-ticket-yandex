# Security: текущее состояние и границы проверки

Статус на 20 ноября 2026: review в процессе. Это не сертификат безопасности и не завершённый полный аудит.

## Действующие границы

- SHM `/admin/*` проверяет `is_admin` до выбора контроллера.
- Кабинетные Remnawave методы проверяют владельца основной услуги; внешний пользователь не выбирается по клиентскому storage.
- Расширения требуют оплаченный заказ SHM и HMAC подпись условий; ledger защищает от двойного начисления при retry.
- Авторизация, origin/CORS, Telegram/OIDC и приватные вложения имеют отдельные regression suites.

## Изменение Foundation

Browser bot-secret generator заменён с Math.random на crypto.getRandomValues. Используется rejection sampling для 62-символьного алфавита, длина остаётся 50. При отсутствии Web Crypto нет fallback на слабый генератор. Требуется HTTPS либо доверенный local context браузера.

## Незакрытые задачи

- Восемь enterprise ролей не реализованы. Существующий gid/is_admin не равнозначен granular RBAC.
- Tenant isolation не реализована; см. MULTI-TENANT.md.
- Нужна полная проверка backend mutation routes, webhook replay, upload/image pipeline, SSRF и секретов.
- Admin сессия в persist требует отдельного threat analysis XSS/session lifetime; перед изменением хранения нужна совместимость SHM.
- Production config, реальные провайдеры и Docker runtime этим проходом не проверены.

## Security workbench

Scan ID: a9420cbe-299e-45d8-bca0-6c5d49d2d946. Сохранён незавершённый threat-model draft, без финальных findings. Пустой список findings в draft не означает отсутствие уязвимостей. Продолжение должно использовать тот же scan ID и учитывать snapshot scan, а не смешивать изменённый код с исходным target.

## Проверки

Backend regression suites: 249 успешных проверок. Mock UI smoke и успешная сборка не доказывают, что все атаки заблокированы. Full penetration/integration testing требует отдельного staging окружения и разрешённого scope.
