# vBios — личный кабинет для SHM

Услуги, подписки, устройства, оплата и поддержка в одном интерфейсе. Светлая и тёмная темы, адаптивная мобильная версия и AJAX-форма входа.

[Обновление контейнеров](docs/PRODUCTION-UPDATE-RU.md) · [Мониторинг серверов](docs/MONITORING.md) · [Аудит и статус модернизации](docs/IMPLEMENTATION-STATUS.md) · [Полный мануал SHM и расширений](docs/SHM-REMNAWAVE-MANUAL-RU.md) · [Полный конфиг и применение](docs/cabinet-full-config.md) · [Remnawave: серверы и расширения](docs/remnawave-cabinet.md) · [Выбор серверов — шаблон local](docs/remnawave-servers-config-local.txt) · [Полная установка на чистый сервер](docs/INSTALLATION-RU.md) · [Галерея скриншотов](docs/screenshots/README.md)

[Готовый шаблон новой страницы — config.main](docs/main-config-template.txt) · [Как применить через local](docs/main-config.md)

[Обновить только заголовок и карточки Login через local](docs/login-design-local.txt) — сохраняет существующие тарифы и мониторинг.

## Превью личного кабинета

Компактный мониторинг на стартовой странице и главной кабинета (демонстрационные данные):

| Компьютер | Телефон |
| --- | --- |
| ![Мини-виджет — светлая тема](docs/screenshots/monitor-widget-desktop-light.png) | ![Мини-виджет — тёмная тема](docs/screenshots/monitor-widget-mobile-dark.png) |

Отдельная публичная страница **`/status`** — состояние нод Remnawave, задержка и история проверок за 60 минут. [Как включить непрерывный сбор](docs/MONITORING.md#отдельная-страница-статуса-status).

| Состояние сети · компьютер | Телефон |
| --- | --- |
| ![Статус нод — тёмная тема](docs/screenshots/status-desktop-dark.png) | ![Статус нод — светлая тема](docs/screenshots/status-mobile-light.png) |

На снимках страницы статуса используются демонстрационные проверки.

| Новая стартовая страница · светлая тема | Тёмная тема |
| --- | --- |
| ![Новая стартовая страница — светлая тема](docs/screenshots/showcase-hero-light.png) | ![Новая стартовая страница — тёмная тема](docs/screenshots/showcase-hero-dark.png) |

Снимки обновлены 20 ноября 2026 года. Компьютер: 1440 × 1000 px, телефон: 390 × 844 px; длинные страницы сняты целиком. Данные аккаунта, платежей, сообщений и мониторинга демонстрационные. История и расширения показаны в состоянии без записей и настроенных предложений. Снимки не подтверждают работу внешней авторизации, платежей или доступность реальных серверов.

| Обновлённые услуги | Обновлённый профиль |
| --- | --- |
| ![Услуги — тёмная тема](docs/screenshots/current-services-desktop-dark.png) | ![Профиль — светлая тема](docs/screenshots/current-profile-desktop-light.png) |

Вся галерея — ниже. Раскройте раздел и нажмите на изображение для просмотра в полном размере.

<details>
<summary><strong>Основные разделы</strong></summary>

**Компьютер**

| Экран | Тёмная тема | Светлая тема |
| --- | --- | --- |
| Главная | ![Главная — тёмная тема](docs/screenshots/current-dashboard-desktop-dark.png) | ![Главная — светлая тема](docs/screenshots/current-dashboard-desktop-light.png) |
| Мои услуги | ![Мои услуги — тёмная тема](docs/screenshots/current-services-desktop-dark.png) | ![Мои услуги — светлая тема](docs/screenshots/current-services-desktop-light.png) |
| Карточка услуги | ![Карточка услуги — тёмная тема](docs/screenshots/current-service-desktop-dark.png) | ![Карточка услуги — светлая тема](docs/screenshots/current-service-desktop-light.png) |
| Профиль | ![Профиль — тёмная тема](docs/screenshots/current-profile-desktop-dark.png) | ![Профиль — светлая тема](docs/screenshots/current-profile-desktop-light.png) |
| Баланс | ![Баланс — тёмная тема](docs/screenshots/current-balance-desktop-dark.png) | ![Баланс — светлая тема](docs/screenshots/current-balance-desktop-light.png) |
| История операций | ![История операций — тёмная тема](docs/screenshots/current-operations-desktop-dark.png) | ![История операций — светлая тема](docs/screenshots/current-operations-desktop-light.png) |
| Уведомления | ![Уведомления — тёмная тема](docs/screenshots/current-notifications-desktop-dark.png) | ![Уведомления — светлая тема](docs/screenshots/current-notifications-desktop-light.png) |
| Помощь | ![Помощь — тёмная тема](docs/screenshots/current-help-desktop-dark.png) | ![Помощь — светлая тема](docs/screenshots/current-help-desktop-light.png) |

**Телефон**

| Экран | Тёмная тема | Светлая тема |
| --- | --- | --- |
| Главная | ![Главная — тёмная тема](docs/screenshots/current-dashboard-mobile-dark.png) | ![Главная — светлая тема](docs/screenshots/current-dashboard-mobile-light.png) |
| Мои услуги | ![Мои услуги — тёмная тема](docs/screenshots/current-services-mobile-dark.png) | ![Мои услуги — светлая тема](docs/screenshots/current-services-mobile-light.png) |
| Карточка услуги | ![Карточка услуги — тёмная тема](docs/screenshots/current-service-mobile-dark.png) | ![Карточка услуги — светлая тема](docs/screenshots/current-service-mobile-light.png) |
| Профиль | ![Профиль — тёмная тема](docs/screenshots/current-profile-mobile-dark.png) | ![Профиль — светлая тема](docs/screenshots/current-profile-mobile-light.png) |
| Баланс | ![Баланс — тёмная тема](docs/screenshots/current-balance-mobile-dark.png) | ![Баланс — светлая тема](docs/screenshots/current-balance-mobile-light.png) |
| История операций | ![История операций — тёмная тема](docs/screenshots/current-operations-mobile-dark.png) | ![История операций — светлая тема](docs/screenshots/current-operations-mobile-light.png) |
| Уведомления | ![Уведомления — тёмная тема](docs/screenshots/current-notifications-mobile-dark.png) | ![Уведомления — светлая тема](docs/screenshots/current-notifications-mobile-light.png) |
| Помощь | ![Помощь — тёмная тема](docs/screenshots/current-help-mobile-dark.png) | ![Помощь — светлая тема](docs/screenshots/current-help-mobile-light.png) |

</details>

<details>
<summary><strong>Вход и регистрация</strong></summary>

**Компьютер**

| Экран | Тёмная тема | Светлая тема |
| --- | --- | --- |
| Стартовая страница | ![Стартовая страница — тёмная тема](docs/screenshots/current-landing-desktop-dark.png) | ![Стартовая страница — светлая тема](docs/screenshots/current-landing-desktop-light.png) |
| AJAX-вход | ![AJAX-вход — тёмная тема](docs/screenshots/current-login-desktop-dark.png) | ![AJAX-вход — светлая тема](docs/screenshots/current-login-desktop-light.png) |
| Регистрация | ![Регистрация — тёмная тема](docs/screenshots/current-register-desktop-dark.png) | ![Регистрация — светлая тема](docs/screenshots/current-register-desktop-light.png) |
| Восстановление пароля | ![Восстановление пароля — тёмная тема](docs/screenshots/current-reset-desktop-dark.png) | ![Восстановление пароля — светлая тема](docs/screenshots/current-reset-desktop-light.png) |

**Телефон**

| Экран | Тёмная тема | Светлая тема |
| --- | --- | --- |
| Стартовая страница | ![Стартовая страница — тёмная тема](docs/screenshots/current-landing-mobile-dark.png) | ![Стартовая страница — светлая тема](docs/screenshots/current-landing-mobile-light.png) |
| AJAX-вход | ![AJAX-вход — тёмная тема](docs/screenshots/current-login-mobile-dark.png) | ![AJAX-вход — светлая тема](docs/screenshots/current-login-mobile-light.png) |
| Регистрация | ![Регистрация — тёмная тема](docs/screenshots/current-register-mobile-dark.png) | ![Регистрация — светлая тема](docs/screenshots/current-register-mobile-light.png) |
| Восстановление пароля | ![Восстановление пароля — тёмная тема](docs/screenshots/current-reset-mobile-dark.png) | ![Восстановление пароля — светлая тема](docs/screenshots/current-reset-mobile-light.png) |

</details>

<details>
<summary><strong>Подписка и подключение</strong></summary>

**Компьютер**

| Экран | Тёмная тема | Светлая тема |
| --- | --- | --- |
| Параметры подключения | ![Параметры подключения — тёмная тема](docs/screenshots/current-connection-desktop-dark.png) | ![Параметры подключения — светлая тема](docs/screenshots/current-connection-desktop-light.png) |
| QR-код | ![QR-код — тёмная тема](docs/screenshots/current-qr-desktop-dark.png) | ![QR-код — светлая тема](docs/screenshots/current-qr-desktop-light.png) |
| Центр устройств | ![Центр устройств — тёмная тема](docs/screenshots/current-devices-desktop-dark.png) | ![Центр устройств — светлая тема](docs/screenshots/current-devices-desktop-light.png) |
| Диагностика | ![Диагностика — тёмная тема](docs/screenshots/current-diagnostics-desktop-dark.png) | ![Диагностика — светлая тема](docs/screenshots/current-diagnostics-desktop-light.png) |
| Трафик | ![Трафик — тёмная тема](docs/screenshots/current-traffic-desktop-dark.png) | ![Трафик — светлая тема](docs/screenshots/current-traffic-desktop-light.png) |
| Обновления подписки | ![Обновления подписки — тёмная тема](docs/screenshots/current-history-desktop-dark.png) | ![Обновления подписки — светлая тема](docs/screenshots/current-history-desktop-light.png) |
| Расширения | ![Расширения — тёмная тема](docs/screenshots/current-addons-desktop-dark.png) | ![Расширения — светлая тема](docs/screenshots/current-addons-desktop-light.png) |
| Смена тарифа через SHM | ![Смена тарифа через SHM — тёмная тема](docs/screenshots/current-tariff-desktop-dark.png) | ![Смена тарифа через SHM — светлая тема](docs/screenshots/current-tariff-desktop-light.png) |

**Телефон**

| Экран | Тёмная тема | Светлая тема |
| --- | --- | --- |
| Параметры подключения | ![Параметры подключения — тёмная тема](docs/screenshots/current-connection-mobile-dark.png) | ![Параметры подключения — светлая тема](docs/screenshots/current-connection-mobile-light.png) |
| QR-код | ![QR-код — тёмная тема](docs/screenshots/current-qr-mobile-dark.png) | ![QR-код — светлая тема](docs/screenshots/current-qr-mobile-light.png) |
| Центр устройств | ![Центр устройств — тёмная тема](docs/screenshots/current-devices-mobile-dark.png) | ![Центр устройств — светлая тема](docs/screenshots/current-devices-mobile-light.png) |
| Диагностика | ![Диагностика — тёмная тема](docs/screenshots/current-diagnostics-mobile-dark.png) | ![Диагностика — светлая тема](docs/screenshots/current-diagnostics-mobile-light.png) |
| Трафик | ![Трафик — тёмная тема](docs/screenshots/current-traffic-mobile-dark.png) | ![Трафик — светлая тема](docs/screenshots/current-traffic-mobile-light.png) |
| Обновления подписки | ![Обновления подписки — тёмная тема](docs/screenshots/current-history-mobile-dark.png) | ![Обновления подписки — светлая тема](docs/screenshots/current-history-mobile-light.png) |
| Расширения | ![Расширения — тёмная тема](docs/screenshots/current-addons-mobile-dark.png) | ![Расширения — светлая тема](docs/screenshots/current-addons-mobile-light.png) |
| Смена тарифа через SHM | ![Смена тарифа через SHM — тёмная тема](docs/screenshots/current-tariff-mobile-dark.png) | ![Смена тарифа через SHM — светлая тема](docs/screenshots/current-tariff-mobile-light.png) |

</details>

<details>
<summary><strong>Оплата и безопасность</strong></summary>

**Компьютер**

| Экран | Тёмная тема | Светлая тема |
| --- | --- | --- |
| Выбор тарифа | ![Выбор тарифа — тёмная тема](docs/screenshots/current-order-desktop-dark.png) | ![Выбор тарифа — светлая тема](docs/screenshots/current-order-desktop-light.png) |
| Пополнение через SHM | ![Пополнение через SHM — тёмная тема](docs/screenshots/current-payment-desktop-dark.png) | ![Пополнение через SHM — светлая тема](docs/screenshots/current-payment-desktop-light.png) |
| Промокод | ![Промокод — тёмная тема](docs/screenshots/current-promo-desktop-dark.png) | ![Промокод — светлая тема](docs/screenshots/current-promo-desktop-light.png) |
| Смена пароля | ![Смена пароля — тёмная тема](docs/screenshots/current-password-desktop-dark.png) | ![Смена пароля — светлая тема](docs/screenshots/current-password-desktop-light.png) |
| Настройка 2FA | ![Настройка 2FA — тёмная тема](docs/screenshots/current-2fa-desktop-dark.png) | ![Настройка 2FA — светлая тема](docs/screenshots/current-2fa-desktop-light.png) |
| Ключи входа | ![Ключи входа — тёмная тема](docs/screenshots/current-passkey-desktop-dark.png) | ![Ключи входа — светлая тема](docs/screenshots/current-passkey-desktop-light.png) |

**Телефон**

| Экран | Тёмная тема | Светлая тема |
| --- | --- | --- |
| Выбор тарифа | ![Выбор тарифа — тёмная тема](docs/screenshots/current-order-mobile-dark.png) | ![Выбор тарифа — светлая тема](docs/screenshots/current-order-mobile-light.png) |
| Пополнение через SHM | ![Пополнение через SHM — тёмная тема](docs/screenshots/current-payment-mobile-dark.png) | ![Пополнение через SHM — светлая тема](docs/screenshots/current-payment-mobile-light.png) |
| Промокод | ![Промокод — тёмная тема](docs/screenshots/current-promo-mobile-dark.png) | ![Промокод — светлая тема](docs/screenshots/current-promo-mobile-light.png) |
| Смена пароля | ![Смена пароля — тёмная тема](docs/screenshots/current-password-mobile-dark.png) | ![Смена пароля — светлая тема](docs/screenshots/current-password-mobile-light.png) |
| Настройка 2FA | ![Настройка 2FA — тёмная тема](docs/screenshots/current-2fa-mobile-dark.png) | ![Настройка 2FA — светлая тема](docs/screenshots/current-2fa-mobile-light.png) |
| Ключи входа | ![Ключи входа — тёмная тема](docs/screenshots/current-passkey-mobile-dark.png) | ![Ключи входа — светлая тема](docs/screenshots/current-passkey-mobile-light.png) |

</details>

<details>
<summary><strong>Поддержка</strong></summary>

**Компьютер**

| Экран | Тёмная тема | Светлая тема |
| --- | --- | --- |
| Обращения | ![Обращения — тёмная тема](docs/screenshots/current-tickets-desktop-dark.png) | ![Обращения — светлая тема](docs/screenshots/current-tickets-desktop-light.png) |
| Новый вопрос | ![Новый вопрос — тёмная тема](docs/screenshots/current-ticket-create-desktop-dark.png) | ![Новый вопрос — светлая тема](docs/screenshots/current-ticket-create-desktop-light.png) |
| Переписка | ![Переписка — тёмная тема](docs/screenshots/current-ticket-chat-desktop-dark.png) | ![Переписка — светлая тема](docs/screenshots/current-ticket-chat-desktop-light.png) |

**Телефон**

| Экран | Тёмная тема | Светлая тема |
| --- | --- | --- |
| Обращения | ![Обращения — тёмная тема](docs/screenshots/current-tickets-mobile-dark.png) | ![Обращения — светлая тема](docs/screenshots/current-tickets-mobile-light.png) |
| Новый вопрос | ![Новый вопрос — тёмная тема](docs/screenshots/current-ticket-create-mobile-dark.png) | ![Новый вопрос — светлая тема](docs/screenshots/current-ticket-create-mobile-light.png) |
| Переписка | ![Переписка — тёмная тема](docs/screenshots/current-ticket-chat-mobile-dark.png) | ![Переписка — светлая тема](docs/screenshots/current-ticket-chat-mobile-light.png) |

</details>

<details>
<summary><strong>Мобильная навигация</strong></summary>

| Тёмная тема | Светлая тема |
| --- | --- |
| ![Все разделы — тёмная тема](docs/screenshots/current-menu-mobile-dark.png) | ![Все разделы — светлая тема](docs/screenshots/current-menu-mobile-light.png) |

</details>

---

## Установка на чистый сервер

**[Полный пошаговый мануал установки и эксплуатации →](docs/INSTALLATION-RU.md)**

Ubuntu, Docker, первоначальная база и пароль администратора, HTTPS, конфигурация SHM, тарифы и расширения Remnawave, оплата, Telegram, мониторинг, обновления, резервные копии и восстановление. Выполняйте шаги последовательно; перед продажами пройдите приёмочные проверки из руководства.

## Настройка страницы помощи

Страница `/help` получает приложения и инструкции из конфигурации SHM с ключом `apps`. [Инструкция и форматы](docs/help-apps.md), [готовый пример JSON](docs/apps-config.example.json).
