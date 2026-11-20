import 'package:flutter/material.dart';

void main() => runApp(const VBiosApp());

const background = Color(0xff090f1b);
const surface = Color(0xff121d2e);
const border = Color(0xff25364d);
const muted = Color(0xffa2b2ca);
const blue = Color(0xff7ca4ff);

class VBiosApp extends StatelessWidget {
  const VBiosApp({super.key});

  @override
  Widget build(BuildContext context) {
    final scheme = ColorScheme.fromSeed(
      seedColor: blue,
      brightness: Brightness.dark,
      surface: surface,
    );
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'vBios',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: scheme,
        scaffoldBackgroundColor: background,
        fontFamily: 'Segoe UI',
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: const Color(0xff0b1422),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: border)),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: border)),
        ),
      ),
      home: const LoginPage(),
    );
  }
}

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});
  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final login = TextEditingController();
  final password = TextEditingController();
  bool hidden = true;

  @override
  void dispose() {
    login.dispose();
    password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1020),
          child: LayoutBuilder(builder: (context, constraints) {
            final wide = constraints.maxWidth >= 720;
            final intro = Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Brand(),
              const SizedBox(height: 64),
              Text('Ваш доступ.\nПод вашим контролем.', style: Theme.of(context).textTheme.displaySmall?.copyWith(fontWeight: FontWeight.w700, height: 1.15)),
              const SizedBox(height: 20),
              const Text('Войдите в личный кабинет, чтобы управлять подключением и услугами.', style: TextStyle(color: muted, fontSize: 16, height: 1.6)),
              const SizedBox(height: 30),
              const FeatureLine(icon: Icons.shield_outlined, text: 'Подписка и настройки в одном месте'),
              const SizedBox(height: 14),
              const FeatureLine(icon: Icons.devices_outlined, text: 'Удобно на ваших устройствах'),
            ]);
            final form = Panel(child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Text('С возвращением', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              const Text('Используйте данные личного кабинета', style: TextStyle(color: muted)),
              const SizedBox(height: 28),
              TextField(controller: login, decoration: const InputDecoration(labelText: 'Логин или почта', prefixIcon: Icon(Icons.person_outline)), autofillHints: const [AutofillHints.username]),
              const SizedBox(height: 16),
              TextField(controller: password, obscureText: hidden, decoration: InputDecoration(labelText: 'Пароль', prefixIcon: const Icon(Icons.lock_outline), suffixIcon: IconButton(tooltip: hidden ? 'Показать пароль' : 'Скрыть пароль', onPressed: () => setState(() => hidden = !hidden), icon: Icon(hidden ? Icons.visibility_outlined : Icons.visibility_off_outlined))), autofillHints: const [AutofillHints.password]),
              const SizedBox(height: 22),
              FilledButton(onPressed: null, style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)), child: const Text('Войти')),
              const SizedBox(height: 14),
              const Text('Вход будет доступен после подключения к SHM.', textAlign: TextAlign.center, style: TextStyle(color: muted, fontSize: 12)),
              const SizedBox(height: 18),
              OutlinedButton(onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => const ConnectionPage())), child: const Text('Посмотреть экран подключения')),
            ]));
            if (!wide) return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [intro, const SizedBox(height: 32), form]);
            return Row(crossAxisAlignment: CrossAxisAlignment.center, children: [Expanded(child: intro), const SizedBox(width: 72), SizedBox(width: 400, child: form)]);
          }),
        ),
      ),
    ),
  );
}

class ConnectionPage extends StatelessWidget {
  const ConnectionPage({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(backgroundColor: Colors.transparent, title: const Brand()),
    body: Center(child: SingleChildScrollView(padding: const EdgeInsets.all(24), child: ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 820),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text('Подключение', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        const Text('Управляйте доступом на этом устройстве.', style: TextStyle(color: muted, fontSize: 15)),
        const SizedBox(height: 28),
        Panel(child: Column(children: [
          Container(width: 104, height: 104, decoration: BoxDecoration(shape: BoxShape.circle, color: blue.withValues(alpha: .10), border: Border.all(color: blue.withValues(alpha: .30))), child: const Icon(Icons.power_settings_new_rounded, color: blue, size: 46)),
          const SizedBox(height: 22),
          Text('Нет подключения', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          const Text('Войдите в кабинет и выберите услугу.', textAlign: TextAlign.center, style: TextStyle(color: muted)),
          const SizedBox(height: 24),
          FilledButton.icon(onPressed: null, icon: const Icon(Icons.power_settings_new), label: const Text('Подключиться'), style: FilledButton.styleFrom(minimumSize: const Size(220, 50))),
        ])),
        const SizedBox(height: 18),
        const Panel(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Ваша услуга', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
          SizedBox(height: 14),
          FeatureLine(icon: Icons.layers_outlined, text: 'Услуги появятся после входа в кабинет'),
          SizedBox(height: 12),
          FeatureLine(icon: Icons.public_outlined, text: 'Доступные серверы определяются вашей подпиской'),
        ])),
      ]),
    ))),
  );
}

class Brand extends StatelessWidget {
  const Brand({super.key});
  @override
  Widget build(BuildContext context) => const Row(mainAxisSize: MainAxisSize.min, children: [
    Icon(Icons.shield_rounded, color: blue, size: 27), SizedBox(width: 9),
    Text('vBios', style: TextStyle(fontSize: 21, fontWeight: FontWeight.w800, letterSpacing: -.5)),
  ]);
}

class Panel extends StatelessWidget {
  const Panel({super.key, required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(28),
    decoration: BoxDecoration(color: surface, borderRadius: BorderRadius.circular(22), border: Border.all(color: border)),
    child: child,
  );
}

class FeatureLine extends StatelessWidget {
  const FeatureLine({super.key, required this.icon, required this.text});
  final IconData icon;
  final String text;
  @override
  Widget build(BuildContext context) => Row(children: [Icon(icon, color: blue, size: 20), const SizedBox(width: 12), Expanded(child: Text(text, style: const TextStyle(color: muted, height: 1.4)))]);
}
