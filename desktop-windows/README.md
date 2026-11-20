# vBios для Windows — интерфейс Flutter

Это прототип интерфейса с экраном входа и экраном подключения. Кнопки входа и подключения отключены до реализации интеграции с SHM и Xray.

Для запуска установите Flutter SDK и Visual Studio с компонентом «Разработка классических приложений на C++», затем выполните из этой папки:

```powershell
flutter doctor
flutter create --platforms=windows .
flutter pub get
flutter run -d windows
```

`runtime/` содержит отдельно загруженный Xray и исключён из Git. Flutter-интерфейс пока не запускает этот файл и не изменяет настройки сети Windows.
