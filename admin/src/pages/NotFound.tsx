import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-cyan-400 mb-4">404</h1>
          <h2 className="text-3xl font-semibold text-slate-200 mb-4">
            Страница не найдена
          </h2>
          <p className="text-slate-400 text-lg mb-8">
            К сожалению, запрашиваемая страница не существует или была перемещена.
          </p>
        </div>
        
        <div className="space-y-4">
          <Link
            to="/"
            className="inline-block px-8 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-lg transition-colors duration-200"
          >
            Вернуться на главную
          </Link>
          
          <div className="pt-4">
            <p className="text-slate-500 text-sm">
              Если вы считаете, что это ошибка, пожалуйста, свяжитесь с администратором.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
