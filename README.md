# vBios — личный кабинет для SHM

Услуги, подписки, оплата и поддержка в одном кабинете. Адаптивный интерфейс для компьютера и телефона, светлая и тёмная темы, AJAX-форма входа и интеграция с Remnawave. **Платежи и тарифы обслуживает SHM.**

**[Полная инструкция установки на чистый сервер](docs/INSTALLATION-RU.md)** · [Обновление работающего сервера](docs/PRODUCTION-UPDATE-RU.md) · [Все скриншоты](docs/screenshots/README.md)

**Новое:** [Страница подписки в стиле кабинета](docs/SUBSCRIPTION-PAGE-RU.md) · [Push для iOS, Android и PC](docs/WEB-PUSH-RU.md)

## С чего начать

| Ваша задача | Что открыть |
| --- | --- |
| Установить проект впервые | [Ubuntu → Docker → база → HTTPS → настройка → проверка](docs/INSTALLATION-RU.md) |
| Обновить существующую установку | [Резервная копия и порядок обновления контейнеров](docs/PRODUCTION-UPDATE-RU.md) |
| Изменить название, тексты и тарифы на сайте | [Настройка config.main](docs/main-config.md) · [Готовый шаблон local](docs/main-config-template.txt) |
| Настроить Remnawave и платные расширения | [Полный мануал SHM и расширений](docs/SHM-REMNAWAVE-MANUAL-RU.md) · [Общий конфиг](docs/cabinet-full-config.md) |
| Включить статус серверов | [Ноды, замеры, история и страница /status](docs/MONITORING.md) |
| Настроить инструкции подключения | [Страница помощи и config.apps](docs/help-apps.md) |

## Как выглядит кабинет

Снимки актуальной production-сборки от 20 ноября 2026 года. Компьютер — 1440 × 1000, телефон — 390 × 844; длинные страницы показаны целиком. Все аккаунты, тарифы, платежи, ссылки и замеры демонстрационные. Снимки показывают интерфейс, но не подтверждают реальные оплаты и работу внешних сервисов.

| Стартовая страница | Главная кабинета |
| --- | --- |
| ![Стартовая страница](docs/screenshots/current-landing-desktop-light.png) | ![Главная кабинета](docs/screenshots/current-dashboard-desktop-dark.png) |

| Страница подписки на компьютере | Страница подписки на телефоне |
| --- | --- |
| ![Страница подписки — компьютер](docs/screenshots/subscription-page-desktop-dark.png) | ![Страница подписки — телефон](docs/screenshots/subscription-page-mobile-dark.png) |

| Подписка на компьютере | Подписка на телефоне |
| --- | --- |
| ![Новый график трафика](docs/screenshots/traffic-detail-desktop-light.png) | ![График трафика на телефоне](docs/screenshots/traffic-detail-mobile-dark.png) |

График показывает расход по дням, сумму за период, среднее значение и пиковый день. Нажатие на столбец раскрывает точное значение. Таблица доступна отдельно; на телефоне график прокручивается по горизонтали.

## Возможности

- Покупка и продление услуг, баланс, история операций и оплата через SHM.
- Ссылка подписки, QR-код, инструкции и управление устройствами.
- Диагностика, статистика трафика и разовые расширения после подтверждения оплаты.
- Публичный мониторинг нод и история фактических проверок на /status.
- Профиль, пароль, доступные способы входа и поддержка с вложениями.

Доступность функций зависит от конфигурации SHM, прав API и подключённых обработчиков. Проверка API Remnawave не заменяет настройку выдачи основной подписки: необходимые условия описаны в мануале установки.

## Установка и настройка

1. Подготовьте чистый Ubuntu Server, два домена и доступ SSH.
2. Выполните [установку по шагам](docs/INSTALLATION-RU.md): Docker, окружение, база, новый пароль admin, затем HTTPS.
3. Настройте тарифы и оплату SHM, интеграцию Remnawave и оформление сайта.
4. Включите мониторинг и поддержку, проверьте покупку тестовым клиентом.
5. Сделайте резервную копию и проверьте восстановление до открытия продаж.

Шаблоны с конструкциями <code>{{ ... }}</code> выполняются в SHM транспортом **local**, а не в терминале Linux. Полный шаблон заменяет конфигурацию; перед применением сохраните прежние значения. Для обновления только текстов Login есть [частичный шаблон](docs/login-design-local.txt).

## Обновить только дизайн кабинета

После успешной публикации образов в GitHub Actions:

~~~bash
cd /opt/shm
docker compose pull client
docker compose up -d --no-deps --force-recreate client
docker compose ps client
docker compose logs --tail=50 client
~~~

Если обновлялись backend, API или конфигурация контейнеров, используйте [полную инструкцию обновления](docs/PRODUCTION-UPDATE-RU.md). Обычный restart не загружает новый образ. Не удаляйте тома базы данных.

## Галерея экранов

Раскройте раздел и нажмите на снимок для просмотра в полном размере. В каждой группе есть обе темы и мобильная версия.

<details>
<summary><strong>Основные разделы</strong></summary>

**Компьютер**

| Экран | Светлая тема | Тёмная тема |
| --- | --- | --- |
| Главная | ![Главная — светлая тема](docs/screenshots/current-dashboard-desktop-light.png) | ![Главная — тёмная тема](docs/screenshots/current-dashboard-desktop-dark.png) |
| Мои услуги | ![Мои услуги — светлая тема](docs/screenshots/current-services-desktop-light.png) | ![Мои услуги — тёмная тема](docs/screenshots/current-services-desktop-dark.png) |
| Карточка услуги | ![Карточка услуги — светлая тема](docs/screenshots/current-service-desktop-light.png) | ![Карточка услуги — тёмная тема](docs/screenshots/current-service-desktop-dark.png) |
| Профиль | ![Профиль — светлая тема](docs/screenshots/current-profile-desktop-light.png) | ![Профиль — тёмная тема](docs/screenshots/current-profile-desktop-dark.png) |
| Баланс | ![Баланс — светлая тема](docs/screenshots/current-balance-desktop-light.png) | ![Баланс — тёмная тема](docs/screenshots/current-balance-desktop-dark.png) |
| История операций | ![История операций — светлая тема](docs/screenshots/current-operations-desktop-light.png) | ![История операций — тёмная тема](docs/screenshots/current-operations-desktop-dark.png) |
| Уведомления | ![Уведомления — светлая тема](docs/screenshots/current-notifications-desktop-light.png) | ![Уведомления — тёмная тема](docs/screenshots/current-notifications-desktop-dark.png) |
| Помощь | ![Помощь — светлая тема](docs/screenshots/current-help-desktop-light.png) | ![Помощь — тёмная тема](docs/screenshots/current-help-desktop-dark.png) |

**Телефон**

| Экран | Светлая тема | Тёмная тема |
| --- | --- | --- |
| Главная | ![Главная — светлая тема](docs/screenshots/current-dashboard-mobile-light.png) | ![Главная — тёмная тема](docs/screenshots/current-dashboard-mobile-dark.png) |
| Мои услуги | ![Мои услуги — светлая тема](docs/screenshots/current-services-mobile-light.png) | ![Мои услуги — тёмная тема](docs/screenshots/current-services-mobile-dark.png) |
| Карточка услуги | ![Карточка услуги — светлая тема](docs/screenshots/current-service-mobile-light.png) | ![Карточка услуги — тёмная тема](docs/screenshots/current-service-mobile-dark.png) |
| Профиль | ![Профиль — светлая тема](docs/screenshots/current-profile-mobile-light.png) | ![Профиль — тёмная тема](docs/screenshots/current-profile-mobile-dark.png) |
| Баланс | ![Баланс — светлая тема](docs/screenshots/current-balance-mobile-light.png) | ![Баланс — тёмная тема](docs/screenshots/current-balance-mobile-dark.png) |
| История операций | ![История операций — светлая тема](docs/screenshots/current-operations-mobile-light.png) | ![История операций — тёмная тема](docs/screenshots/current-operations-mobile-dark.png) |
| Уведомления | ![Уведомления — светлая тема](docs/screenshots/current-notifications-mobile-light.png) | ![Уведомления — тёмная тема](docs/screenshots/current-notifications-mobile-dark.png) |
| Помощь | ![Помощь — светлая тема](docs/screenshots/current-help-mobile-light.png) | ![Помощь — тёмная тема](docs/screenshots/current-help-mobile-dark.png) |

</details>

<details>
<summary><strong>Вход и регистрация</strong></summary>

**Компьютер**

| Экран | Светлая тема | Тёмная тема |
| --- | --- | --- |
| Стартовая страница | ![Стартовая страница — светлая тема](docs/screenshots/current-landing-desktop-light.png) | ![Стартовая страница — тёмная тема](docs/screenshots/current-landing-desktop-dark.png) |
| AJAX-вход | ![AJAX-вход — светлая тема](docs/screenshots/current-login-desktop-light.png) | ![AJAX-вход — тёмная тема](docs/screenshots/current-login-desktop-dark.png) |
| Регистрация | ![Регистрация — светлая тема](docs/screenshots/current-register-desktop-light.png) | ![Регистрация — тёмная тема](docs/screenshots/current-register-desktop-dark.png) |
| Восстановление пароля | ![Восстановление пароля — светлая тема](docs/screenshots/current-reset-desktop-light.png) | ![Восстановление пароля — тёмная тема](docs/screenshots/current-reset-desktop-dark.png) |

**Телефон**

| Экран | Светлая тема | Тёмная тема |
| --- | --- | --- |
| Стартовая страница | ![Стартовая страница — светлая тема](docs/screenshots/current-landing-mobile-light.png) | ![Стартовая страница — тёмная тема](docs/screenshots/current-landing-mobile-dark.png) |
| AJAX-вход | ![AJAX-вход — светлая тема](docs/screenshots/current-login-mobile-light.png) | ![AJAX-вход — тёмная тема](docs/screenshots/current-login-mobile-dark.png) |
| Регистрация | ![Регистрация — светлая тема](docs/screenshots/current-register-mobile-light.png) | ![Регистрация — тёмная тема](docs/screenshots/current-register-mobile-dark.png) |
| Восстановление пароля | ![Восстановление пароля — светлая тема](docs/screenshots/current-reset-mobile-light.png) | ![Восстановление пароля — тёмная тема](docs/screenshots/current-reset-mobile-dark.png) |

</details>

<details>
<summary><strong>Подписка и подключение</strong></summary>

**Компьютер**

| Экран | Светлая тема | Тёмная тема |
| --- | --- | --- |
| Параметры подключения | ![Параметры подключения — светлая тема](docs/screenshots/current-connection-desktop-light.png) | ![Параметры подключения — тёмная тема](docs/screenshots/current-connection-desktop-dark.png) |
| QR-код | ![QR-код — светлая тема](docs/screenshots/current-qr-desktop-light.png) | ![QR-код — тёмная тема](docs/screenshots/current-qr-desktop-dark.png) |
| Центр устройств | ![Центр устройств — светлая тема](docs/screenshots/current-devices-desktop-light.png) | ![Центр устройств — тёмная тема](docs/screenshots/current-devices-desktop-dark.png) |
| Диагностика | ![Диагностика — светлая тема](docs/screenshots/current-diagnostics-desktop-light.png) | ![Диагностика — тёмная тема](docs/screenshots/current-diagnostics-desktop-dark.png) |
| График трафика | ![График трафика — светлая тема](docs/screenshots/current-traffic-desktop-light.png) | ![График трафика — тёмная тема](docs/screenshots/current-traffic-desktop-dark.png) |
| Обновления подписки | ![Обновления подписки — светлая тема](docs/screenshots/current-history-desktop-light.png) | ![Обновления подписки — тёмная тема](docs/screenshots/current-history-desktop-dark.png) |
| Расширения | ![Расширения — светлая тема](docs/screenshots/current-addons-desktop-light.png) | ![Расширения — тёмная тема](docs/screenshots/current-addons-desktop-dark.png) |
| Смена тарифа через SHM | ![Смена тарифа через SHM — светлая тема](docs/screenshots/current-tariff-desktop-light.png) | ![Смена тарифа через SHM — тёмная тема](docs/screenshots/current-tariff-desktop-dark.png) |

**Телефон**

| Экран | Светлая тема | Тёмная тема |
| --- | --- | --- |
| Параметры подключения | ![Параметры подключения — светлая тема](docs/screenshots/current-connection-mobile-light.png) | ![Параметры подключения — тёмная тема](docs/screenshots/current-connection-mobile-dark.png) |
| QR-код | ![QR-код — светлая тема](docs/screenshots/current-qr-mobile-light.png) | ![QR-код — тёмная тема](docs/screenshots/current-qr-mobile-dark.png) |
| Центр устройств | ![Центр устройств — светлая тема](docs/screenshots/current-devices-mobile-light.png) | ![Центр устройств — тёмная тема](docs/screenshots/current-devices-mobile-dark.png) |
| Диагностика | ![Диагностика — светлая тема](docs/screenshots/current-diagnostics-mobile-light.png) | ![Диагностика — тёмная тема](docs/screenshots/current-diagnostics-mobile-dark.png) |
| График трафика | ![График трафика — светлая тема](docs/screenshots/current-traffic-mobile-light.png) | ![График трафика — тёмная тема](docs/screenshots/current-traffic-mobile-dark.png) |
| Обновления подписки | ![Обновления подписки — светлая тема](docs/screenshots/current-history-mobile-light.png) | ![Обновления подписки — тёмная тема](docs/screenshots/current-history-mobile-dark.png) |
| Расширения | ![Расширения — светлая тема](docs/screenshots/current-addons-mobile-light.png) | ![Расширения — тёмная тема](docs/screenshots/current-addons-mobile-dark.png) |
| Смена тарифа через SHM | ![Смена тарифа через SHM — светлая тема](docs/screenshots/current-tariff-mobile-light.png) | ![Смена тарифа через SHM — тёмная тема](docs/screenshots/current-tariff-mobile-dark.png) |

</details>

<details>
<summary><strong>Оплата и безопасность</strong></summary>

**Компьютер**

| Экран | Светлая тема | Тёмная тема |
| --- | --- | --- |
| Пополнение через SHM | ![Пополнение через SHM — светлая тема](docs/screenshots/current-payment-desktop-light.png) | ![Пополнение через SHM — тёмная тема](docs/screenshots/current-payment-desktop-dark.png) |
| Промокод | ![Промокод — светлая тема](docs/screenshots/current-promo-desktop-light.png) | ![Промокод — тёмная тема](docs/screenshots/current-promo-desktop-dark.png) |
| Смена пароля | ![Смена пароля — светлая тема](docs/screenshots/current-password-desktop-light.png) | ![Смена пароля — тёмная тема](docs/screenshots/current-password-desktop-dark.png) |
| Двухфакторная защита | ![Двухфакторная защита — светлая тема](docs/screenshots/current-2fa-desktop-light.png) | ![Двухфакторная защита — тёмная тема](docs/screenshots/current-2fa-desktop-dark.png) |
| Ключи входа | ![Ключи входа — светлая тема](docs/screenshots/current-passkey-desktop-light.png) | ![Ключи входа — тёмная тема](docs/screenshots/current-passkey-desktop-dark.png) |

**Телефон**

| Экран | Светлая тема | Тёмная тема |
| --- | --- | --- |
| Пополнение через SHM | ![Пополнение через SHM — светлая тема](docs/screenshots/current-payment-mobile-light.png) | ![Пополнение через SHM — тёмная тема](docs/screenshots/current-payment-mobile-dark.png) |
| Промокод | ![Промокод — светлая тема](docs/screenshots/current-promo-mobile-light.png) | ![Промокод — тёмная тема](docs/screenshots/current-promo-mobile-dark.png) |
| Смена пароля | ![Смена пароля — светлая тема](docs/screenshots/current-password-mobile-light.png) | ![Смена пароля — тёмная тема](docs/screenshots/current-password-mobile-dark.png) |
| Двухфакторная защита | ![Двухфакторная защита — светлая тема](docs/screenshots/current-2fa-mobile-light.png) | ![Двухфакторная защита — тёмная тема](docs/screenshots/current-2fa-mobile-dark.png) |
| Ключи входа | ![Ключи входа — светлая тема](docs/screenshots/current-passkey-mobile-light.png) | ![Ключи входа — тёмная тема](docs/screenshots/current-passkey-mobile-dark.png) |

</details>

<details>
<summary><strong>Поддержка</strong></summary>

**Компьютер**

| Экран | Светлая тема | Тёмная тема |
| --- | --- | --- |
| Обращения | ![Обращения — светлая тема](docs/screenshots/current-tickets-desktop-light.png) | ![Обращения — тёмная тема](docs/screenshots/current-tickets-desktop-dark.png) |
| Новый вопрос | ![Новый вопрос — светлая тема](docs/screenshots/current-ticket-create-desktop-light.png) | ![Новый вопрос — тёмная тема](docs/screenshots/current-ticket-create-desktop-dark.png) |
| Переписка | ![Переписка — светлая тема](docs/screenshots/current-ticket-chat-desktop-light.png) | ![Переписка — тёмная тема](docs/screenshots/current-ticket-chat-desktop-dark.png) |

**Телефон**

| Экран | Светлая тема | Тёмная тема |
| --- | --- | --- |
| Обращения | ![Обращения — светлая тема](docs/screenshots/current-tickets-mobile-light.png) | ![Обращения — тёмная тема](docs/screenshots/current-tickets-mobile-dark.png) |
| Новый вопрос | ![Новый вопрос — светлая тема](docs/screenshots/current-ticket-create-mobile-light.png) | ![Новый вопрос — тёмная тема](docs/screenshots/current-ticket-create-mobile-dark.png) |
| Переписка | ![Переписка — светлая тема](docs/screenshots/current-ticket-chat-mobile-light.png) | ![Переписка — тёмная тема](docs/screenshots/current-ticket-chat-mobile-dark.png) |

</details>

<details>
<summary><strong>Мониторинг</strong></summary>

**Компьютер**

| Экран | Светлая тема | Тёмная тема |
| --- | --- | --- |
| Публичная страница статуса | ![Публичная страница статуса — светлая тема](docs/screenshots/current-status-desktop-light.png) | ![Публичная страница статуса — тёмная тема](docs/screenshots/current-status-desktop-dark.png) |

**Телефон**

| Экран | Светлая тема | Тёмная тема |
| --- | --- | --- |
| Публичная страница статуса | ![Публичная страница статуса — светлая тема](docs/screenshots/current-status-mobile-light.png) | ![Публичная страница статуса — тёмная тема](docs/screenshots/current-status-mobile-dark.png) |

</details>

<details>
<summary><strong>Мобильное меню</strong></summary>

| Светлая тема | Тёмная тема |
| --- | --- |
| ![Мобильное меню](docs/screenshots/current-menu-mobile-light.png) | ![Мобильное меню](docs/screenshots/current-menu-mobile-dark.png) |

</details>


## Документация и шаблоны

| Раздел | Материалы |
| --- | --- |
| Установка и эксплуатация | [Полный мануал](docs/INSTALLATION-RU.md) · [Обновление](docs/PRODUCTION-UPDATE-RU.md) |
| Оформление сайта | [config.main](docs/main-config.md) · [Шаблон](docs/main-config-template.txt) · [Частичное обновление Login](docs/login-design-local.txt) |
| Remnawave | [Модуль API](docs/remnawave-module.md) · [Кабинет и расширения](docs/remnawave-cabinet.md) · [Настройка услуг и событий](docs/SHM-REMNAWAVE-MANUAL-RU.md) |
| Готовая конфигурация | [Описание](docs/cabinet-full-config.md) · [Полный шаблон local](docs/cabinet-full-config-local.txt) |
| Мониторинг | [Инструкция](docs/MONITORING.md) · [HTTPS endpoint на ноде](docs/node-ping-nginx.conf) |
| Поддержка | [Хранилище вложений Yandex Cloud](docs/new-server/YANDEX-CLOUD-TICKETS.md) · [Пример config.ticket](docs/new-server/ticket.example.json) |
| Помощь пользователю | [Настройка страницы /help](docs/help-apps.md) · [Пример config.apps](docs/apps-config.example.json) |
| Состояние проекта | [Реализованные функции и ограничения](docs/IMPLEMENTATION-STATUS.md) |

Секреты хранятся в закрытой конфигурации SHM и .env. Публичный config.main предназначен только для содержимого сайта и разрешённых настроек мониторинга.


## Отдельная страница подписки

Запускается рядом с Remnawave независимо от SHM: [инструкция и compose](docs/SUBSCRIPTION-PAGE-RU.md). Примеры ниже используют демонстрационную подписку.

| Светлая тема | Тёмная тема на телефоне |
| --- | --- |
| ![Страница подписки](docs/screenshots/subscription-page-desktop-light.png) | ![Страница подписки на телефоне](docs/screenshots/subscription-page-mobile-dark.png) |
