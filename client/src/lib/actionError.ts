import { isAxiosError } from 'axios';
export function actionError(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const body = error.response?.data;
    const detail = body?.error || body?.msg_ru || body?.message || body?.errors?.[0]?.message || body?.errors?.[0];
    if (detail === 'INVALID_OLD_PASSWORD') return 'Текущий пароль указан неверно.';
    if (detail === 'OLD_PASSWORD_REQUIRED') return 'Введите текущий пароль.';
    if (detail === 'PASSWORD_SAVE_NOT_CONFIRMED') return 'Сервер не подтвердил сохранение пароля. Проверьте вход перед повторной попыткой.';
    if (typeof detail === 'string') return detail.replace(/ at \/app\/[^\n]+/g, '').slice(0, 400);
    if (!error.response) return 'Ответ сервера не получен. Проверьте результат операции перед повтором, чтобы не выполнить её дважды.';
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
