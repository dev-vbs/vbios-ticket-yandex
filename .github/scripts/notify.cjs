const { execFileSync } = require('node:child_process');

const escapeHtml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function buildPayload(env, subject, author, files) {
  const text = `🔔 <b>Обновление личного кабинета</b>

📦 <b>Репозиторий:</b> ${escapeHtml(env.REPOSITORY)}
🌿 <b>Ветка:</b> ${escapeHtml(env.BRANCH)}
🔖 <b>Коммит:</b> <code>${escapeHtml(env.COMMIT_SHA.slice(0, 7))}</code>
👤 <b>Автор:</b> ${escapeHtml(author.slice(0, 120))}

📝 <b>Что изменилось:</b>
${escapeHtml(subject.slice(0, 400))}
${escapeHtml(files.slice(0, 1000) || 'Изменения опубликованы в Docker-образах.')}

🚀 <b>Как обновить кабинет на сервере</b>

Сборка и публикация Docker-образов в GitHub Actions успешно завершены.

В папке с <code>docker-compose.yml</code> выполните:
<pre><code class="language-shell">docker compose pull client admin core api spool
docker compose stop spool
docker compose up -d --no-deps --force-recreate core
docker compose logs --tail=50 core</code></pre>
Убедитесь, что core запустился без ошибок миграции, затем выполните:
<pre><code class="language-shell">docker compose up -d --no-deps --force-recreate api admin client spool</code></pre>
🔎 <b>Проверить состояние:</b>
<pre><code class="language-shell">docker compose ps
docker compose logs --tail=50 client admin core api spool</code></pre>
Перед обновлением сохраните резервную копию. В <code>docker-compose.yml</code> должны использоваться образы и теги, опубликованные вашей сборкой.`;
  return {
    chat_id: env.TELEGRAM_CHAT_ID,
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
  if (env.BUILD_CONCLUSION !== 'success' || env.BRANCH !== 'main') {
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
if (require.main === module) main().catch(() => {
  console.error('Не удалось отправить уведомление Telegram. Проверьте токен, ID группы и права бота.');
  process.exitCode = 1;
});
