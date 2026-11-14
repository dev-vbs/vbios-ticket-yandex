import { useEffect } from 'react';

function Swagger() {
  useEffect(() => {
    // Загружаем SwaggerUI стили и скрипты динамически
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/swagger-ui-dist@5.24.1/swagger-ui.css';
    document.head.appendChild(link);

    const script1 = document.createElement('script');
    script1.src = 'https://unpkg.com/swagger-ui-dist@5.24.1/swagger-ui-bundle.js';
    script1.crossOrigin = 'anonymous';

    const script2 = document.createElement('script');
    script2.src = 'https://unpkg.com/swagger-ui-dist@5.24.1/swagger-ui-standalone-preset.js';
    script2.crossOrigin = 'anonymous';

    script2.onload = () => {
      // Инициализируем SwaggerUI после загрузки скриптов
      const SwaggerUIBundle = (window as any).SwaggerUIBundle;
      const SwaggerUIStandalonePreset = (window as any).SwaggerUIStandalonePreset;

      if (SwaggerUIBundle && SwaggerUIStandalonePreset) {
        (window as any).ui = SwaggerUIBundle({
          urls: [
            { url: 'shm/v1/swagger.json', name: 'Client API' },
            { url: 'shm/v1/swagger_admin.json', name: 'Admin API' },
          ],
          'urls.primaryName': 'Client API',
          dom_id: '#swagger-ui',
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIStandalonePreset
          ],
          layout: 'StandaloneLayout',
        });
      }
    };

    document.body.appendChild(script1);
    document.body.appendChild(script2);

    // Cleanup при размонтировании
    return () => {
      document.head.removeChild(link);
      document.body.removeChild(script1);
      document.body.removeChild(script2);
    };
  }, []);

  return (
    <div className="h-screen w-full overflow-auto">
      <div id="swagger-ui"></div>
    </div>
  );
}

export default Swagger;
