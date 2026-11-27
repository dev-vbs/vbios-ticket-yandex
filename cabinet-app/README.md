# vBios для Windows, Android и iOS

Приложение открывает действующий личный кабинет vBios на `https://pbalka.ru` в системном WebView. Кабинет использует существующий сервер, аккаунты и права доступа. В приложении доступны кнопки возврата и обновления, индикатор загрузки и повтор при сетевой ошибке.

## Сборка

Потребуется Flutter 3.32.8 и PowerShell 7. Из корня репозитория выполните:

```powershell
./cabinet-app/bootstrap.ps1
Set-Location cabinet-app
flutter analyze
```

| Платформа | Команда | Требования и результат |
| --- | --- | --- |
| Windows | `flutter build windows --release` | Visual Studio с компонентами Desktop development with C++ и Microsoft Edge WebView2 Runtime. Запускайте EXE вместе со всей папкой `build/windows/x64/runner/Release`. |
| Android | `flutter build apk --debug` | Android SDK и принятые лицензии. APK для проверки находится в `build/app/outputs/flutter-apk/app-debug.apk`. Для публикации настройте подпись и соберите `flutter build appbundle --release`. |
| iOS | `flutter build ios --release --no-codesign` | macOS, Xcode и CocoaPods. Команда создаёт неподписанную сборку. Для установки через TestFlight выберите команду Apple Developer и настройте подпись в `ios/Runner.xcworkspace`, затем выполните `flutter build ipa`. |

Для своего сервера добавьте к команде сборки параметр `--dart-define=CABINET_ORIGIN=https://cabinet.example.com`. Укажите только HTTPS-домен кабинета. В GitHub Actions сборки трёх платформ публикуются в артефактах запуска после успешной проверки.

## Проверка на устройствах

Перед выпуском проверьте вход по паролю и через Telegram, оплату и возврат из браузера, подписку и QR-код, новости и реакции, тикеты с вложениями, профиль, мониторинг и уведомления. Полный сценарий на каждой платформе пока требует проверки. Внешние HTTPS-ссылки и поддерживаемые ссылки VPN-клиентов передаются операционной системе. Системный push отдельно не подключён.

Указанная версия [Xray-core v26.11.9](https://github.com/XTLS/Xray-core/releases/tag/v26.11.9) пока не встроена. Встроенное VPN-подключение потребует платформенной интеграции и отдельных проверок.

## Публикация в GitHub Releases

Отправьте тег вида `cabinet-v0.1.0` для нужного коммита. После успешной сборки трёх платформ GitHub Actions создаст предварительный выпуск в [Releases](https://github.com/dev-vbs/vbios-ticket-yandex/releases) с ZIP для Windows, тестовым APK для Android и неподписанным архивом для iOS.
