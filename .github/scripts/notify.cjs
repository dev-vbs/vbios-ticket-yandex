const { execFileSync } = require('node:child_process');

const escapeHtml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function buildPayload(env, subject, author, files) {
  const services = (env.UPDATE_SERVICES || 'core spool client').trim().split(/\s+/);
  if (!services.length || services.some((name) => !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(name))) {
    throw new Error('UPDATE_SERVICES содержит недопустимое имя сервиса.');
  }
  if (env.TELEGRAM_MESSAGE_THREAD_ID && !/^[1-9]\d*$/.test(env.TELEGRAM_MESSAGE_THREAD_ID)) {
    throw new Error('TELEGRAM_MESSAGE_THREAD_ID должен быть положительным числом.');
  }
  const serviceList = services.join(' ');
  const text = `🔔 <b>Обновление личного кабинета</b>

📦 <b>Репозиторий:</b> ${escapeHtml(env.REPOSITORY)}
🌿 <b>Ветка:</b> ${escapeHtml(env.BRANCH)}
🔖 <b>Коммит:</b> <code>${escapeHtml(env.COMMIT_SHA.slice(0, 7))}</code>
👤 <b>Автор:</b> ${escapeHtml(author.slice(0, 120))}

📝 <b>Что изменилось:</b>
${escapeHtml(subject.slice(0, 400))}
${escapeHtml(files.slice(0, 1000) || 'Изменения опубликованы в Docker-образах.')}

📦 <b>Опубликованы образы</b>
vbios-core, vbios-api, vbios-clients, vbios-admin, vbios-push, vbios-subscription

🚀 <b>Как обновить кабинет на сервере</b>

Сборка и публикация Docker-образов в GitHub Actions успешно завершены.

<pre><code>cd /opt/shm
docker compose pull ${escapeHtml(serviceList)}
docker compose up -d --no-deps --force-recreate ${escapeHtml(serviceList)}
docker compose ps</code></pre>
Указанные сервисы должны существовать в вашем Docker Compose и использовать опубликованные образы.`;
  return {
    chat_id: env.TELEGRAM_CHAT_ID,
    ...(env.TELEGRAM_MESSAGE_THREAD_ID ? { message_thread_id: Number(env.TELEGRAM_MESSAGE_THREAD_ID) } : {}),
    text,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
    reply_markup: { inline_keyboard: [[
      { text: '📝 Изменения', url: env.COMMIT_URL },
      { text: '🔧 Проверить сборку', url: env.BUILD_URL },
    ]] },
  };
}

async function main() {
  const env = process.env;
  if (env.BUILD_CONCLUSION !== 'success' || env.BRANCH !== 'main' || !['push', 'workflow_dispatch'].includes(env.BUILD_EVENT)) {
    console.log('Сборка ветки main не завершилась успешно; уведомление пропущено.');
    return;
  }
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    console.log('Не заданы TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID; уведомление пропущено.');
    return;
  }
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
  const payload = buildPayload(env, git('log', '-1', '--pretty=%s'), git('log', '-1', '--pretty=%an'),
    git('diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD').split('\n').slice(0, 20).join('\n'));
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload), signal: AbortSignal.timeout(30000),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(`Telegram отклонил уведомление: ${result.error_code || response.status}`);
  }
  console.log('Уведомление о публикации отправлено.');
}

module.exports = { buildPayload };
if (require.main === module) main().catch((error) => {
  console.error(`Не удалось отправить уведомление Telegram: ${error.message}. Проверьте настройки и права бота.`);
  process.exitCode = 1;
});
