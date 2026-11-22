const test = require('node:test');
const assert = require('node:assert/strict');
const { buildPayload } = require('./notify.cjs');

const env = {
  TELEGRAM_CHAT_ID: '-1001234567890',
  REPOSITORY: 'dev-vbs/example',
  BRANCH: 'main',
  COMMIT_SHA: '1234567890',
  COMMIT_URL: 'https://github.com/example/commit/123',
  BUILD_URL: 'https://github.com/example/actions/runs/123',
};

test('направляет сообщение в тему и показывает команды для выбранных сервисов', () => {
  const payload = buildPayload({ ...env, TELEGRAM_MESSAGE_THREAD_ID: '42', UPDATE_SERVICES: 'core spool client push' }, '<обновление>', 'Автор', 'client/file');
  assert.equal(payload.message_thread_id, 42);
  assert.equal(payload.chat_id, env.TELEGRAM_CHAT_ID);
  assert.match(payload.text, /docker compose pull core spool client push/);
  assert.match(payload.text, /docker compose up -d --no-deps --force-recreate core spool client push/);
  assert.match(payload.text, /&lt;обновление&gt;/);
});

test('работает без темы и использует стандартный список сервисов', () => {
  const payload = buildPayload(env, 'Обновление', 'Автор', '');
  assert.equal(payload.message_thread_id, undefined);
  assert.match(payload.text, /docker compose pull core spool client/);
});

test('отклоняет некорректные настройки темы и сервисов', () => {
  assert.throws(() => buildPayload({ ...env, TELEGRAM_MESSAGE_THREAD_ID: 'abc' }, '', '', ''));
  assert.throws(() => buildPayload({ ...env, UPDATE_SERVICES: 'client;reboot' }, '', '', ''));
});
