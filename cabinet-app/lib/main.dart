import 'package:flutter/material.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:url_launcher/url_launcher.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  const configured = String.fromEnvironment(
    'CABINET_ORIGIN',
    defaultValue: 'https://pbalka.ru',
  );
  final origin = Uri.tryParse(configured);
  runApp(CabinetApp(
    origin: origin != null &&
            origin.scheme == 'https' &&
            origin.host.isNotEmpty &&
            origin.userInfo.isEmpty &&
            !origin.hasQuery &&
            !origin.hasFragment &&
            (origin.path.isEmpty || origin.path == '/')
        ? origin
        : null,
  ));
}

class CabinetApp extends StatelessWidget {
  const CabinetApp({super.key, required this.origin});

  final Uri? origin;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'vBios',
      debugShowCheckedModeBanner: false,
      darkTheme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xff37c6de),
          brightness: Brightness.dark,
        ),
      ),
      theme: ThemeData(colorSchemeSeed: const Color(0xff147c90)),
      home: origin == null
          ? const Scaffold(
              body: Center(child: Text('Укажите HTTPS-домен кабинета в CABINET_ORIGIN.')),
            )
          : CabinetView(origin: origin!),
    );
  }
}

class CabinetView extends StatefulWidget {
  const CabinetView({super.key, required this.origin});

  final Uri origin;

  @override
  State<CabinetView> createState() => _CabinetViewState();
}

class _CabinetViewState extends State<CabinetView> {
  InAppWebViewController? _controller;
  double _progress = 0;
  bool _failed = false;

  static const _appSchemes = {
    'happ', 'incy', 'v2rayng', 'v2rayn', 'hiddify', 'sing-box', 'tunnelfox',
  };

  bool _isCabinet(Uri uri) =>
      uri.scheme == 'https' && uri.origin == widget.origin.origin &&
      uri.userInfo.isEmpty;

  Future<void> _openExternal(Uri uri) async {
    var opened = false;
    try {
      opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      // The operating system may have no app registered for this link.
    }
    if (!opened && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Не удалось открыть ссылку на устройстве.')),
      );
    }
  }

  Future<void> _back() async {
    final controller = _controller;
    if (controller == null) return;
    if (await controller.canGoBack()) {
      await controller.goBack();
    } else {
      await controller.loadUrl(urlRequest: URLRequest(url: WebUri(widget.origin.toString())));
    }
  }

  Future<void> _retry() async {
    setState(() => _failed = false);
    await _controller?.reload();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          tooltip: 'Назад',
          onPressed: _back,
          icon: const Icon(Icons.arrow_back),
        ),
        title: const Text('vBios'),
        actions: [
          IconButton(
            tooltip: 'Обновить кабинет',
            onPressed: _retry,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: Stack(
          fit: StackFit.expand,
          children: [
            InAppWebView(
              initialUrlRequest: URLRequest(url: WebUri(widget.origin.toString())),
              initialSettings: InAppWebViewSettings(
                useShouldOverrideUrlLoading: true,
                supportMultipleWindows: true,
                allowFileAccessFromFileURLs: false,
                allowUniversalAccessFromFileURLs: false,
              ),
              onWebViewCreated: (controller) => _controller = controller,
              onLoadStart: (_, __) => setState(() {
                _failed = false;
                _progress = 0;
              }),
              onProgressChanged: (_, progress) => setState(() => _progress = progress / 100),
              onReceivedError: (_, request, __) {
                if (request.isForMainFrame == true) setState(() => _failed = true);
              },
              shouldOverrideUrlLoading: (_, action) async {
                final uri = action.request.url?.uriValue;
                if (action.isForMainFrame == false) return NavigationActionPolicy.ALLOW;
                if (uri != null && _isCabinet(uri)) return NavigationActionPolicy.ALLOW;
                if (uri != null && (uri.scheme == 'https' || _appSchemes.contains(uri.scheme))) {
                  await _openExternal(uri);
                }
                return NavigationActionPolicy.CANCEL;
              },
              onCreateWindow: (_, action) async {
                final uri = action.request.url?.uriValue;
                if (uri != null && _isCabinet(uri)) {
                  await _controller?.loadUrl(urlRequest: URLRequest(url: action.request.url));
                } else if (uri != null && uri.scheme == 'https') {
                  await _openExternal(uri);
                }
                return false;
              },
            ),
            if (_failed)
              ColoredBox(
                color: Theme.of(context).colorScheme.surface,
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.cloud_off_outlined, size: 36),
                        const SizedBox(height: 14),
                        Text('Кабинет недоступен', style: Theme.of(context).textTheme.titleLarge),
                        const SizedBox(height: 8),
                        const Text('Проверьте подключение к интернету и попробуйте снова.',
                            textAlign: TextAlign.center),
                        const SizedBox(height: 18),
                        FilledButton(onPressed: _retry, child: const Text('Повторить')),
                      ],
                    ),
                  ),
                ),
              )
            else if (_progress < 1)
              Align(
                alignment: Alignment.topCenter,
                child: LinearProgressIndicator(value: _progress == 0 ? null : _progress),
              ),
          ],
        ),
      ),
    );
  }
}
