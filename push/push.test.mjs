import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import webpush from 'web-push';
import { validSubscription, safePath, equalSecret, notification } from './validation.mjs';

const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/test', keys: { p256dh: Buffer.alloc(65, 4).toString('base64url'), auth: Buffer.alloc(16, 1).toString('base64url') } };
test('Push endpoints and navigation cannot target arbitrary hosts', () => {
  assert(validSubscription(sub));
  for (const endpoint of ['http://fcm.googleapis.com/x','https://127.0.0.1/x','https://fcm.googleapis.com.evil.test/x','https://user:pass@fcm.googleapis.com/x','https://fcm.googleapis.com:8443/x']) assert(!validSubscription({ ...sub, endpoint }));
  assert(!validSubscription({ ...sub, keys: {} }));
  for (const path of ['//evil.test','https://evil.test','/\\evil.test']) assert.equal(safePath(path), '/notifications');
  assert.equal(safePath('/services/6'), '/services/6');
  assert(!equalSecret('x', ''));
  assert(equalSecret('a'.repeat(40), 'a'.repeat(40)));
  assert.equal(notification({ body: 'x'.repeat(1000) }).body.length, 300);
});

test('Push subscriptions accept browser endpoint providers', () => {
  for (const host of ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com']) {
    assert(validSubscription({ ...sub, endpoint: `https://${host}/wpush/${'a'.repeat(20)}` }));
  }
});

test('SHM authentication, same-origin writes and subscription ownership', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'vbios-push-'));
  const shm = createServer((req, res) => { res.setHeader('Content-Type','application/json'); const validClient = req.headers['user-agent'] === 'test-browser' && req.headers['x-forwarded-for'] === '203.0.113.5'; res.end(JSON.stringify(validClient && req.headers.cookie === 'session_id=session-user-2' ? {data:[{user_id:2}]} : validClient && req.headers.cookie === 'session_id=session-user-3' ? {data:[{user_id:3}]} : {error:'unauthorized'})); });
  shm.listen(0, '127.0.0.1'); await once(shm, 'listening');
  const reservation = createServer(); reservation.listen(0, '127.0.0.1'); await once(reservation,'listening'); const port = reservation.address().port; await new Promise(r=>reservation.close(r));
  const keys=webpush.generateVAPIDKeys(), secret='b'.repeat(64), origin='https://bill.example.com';
  const child=spawn(process.execPath,['server.mjs'],{cwd:import.meta.dirname,env:{...process.env,WEB_PUSH_ENABLE:'true',PORT:String(port),PUSH_DATA_DIR:dir,SHM_URL:`http://127.0.0.1:${shm.address().port}`,PUSH_INTERNAL_TOKEN:secret,PUSH_PUBLIC_ORIGIN:origin,VAPID_PUBLIC_KEY:keys.publicKey,VAPID_PRIVATE_KEY:keys.privateKey,VAPID_SUBJECT:'mailto:test@example.com'},stdio:['ignore','pipe','pipe']});
  try {
    await Promise.race([once(child.stdout,'data'),once(child,'exit').then(()=>{throw Error('Push did not start')}),new Promise((_,reject)=>setTimeout(()=>reject(Error('Start timeout')),10000).unref())]);
    const call=(path,method='GET',body,session='session-user-2',requestOrigin=origin)=>fetch(`http://127.0.0.1:${port}${path}`,{method,headers:{session_id:session,Origin:requestOrigin,'Content-Type':'application/json','User-Agent':'test-browser','X-Real-IP':'203.0.113.5'},...(body?{body:JSON.stringify(body)}:{})});
    assert.equal((await call('/push/config')).status,200);
    assert.equal((await call('/push/subscriptions','POST',sub,'bad-session-1')).status,401);
    assert.equal((await call('/push/subscriptions','POST',sub,'session-user-2','https://evil.test')).status,403);
    assert.equal((await call('/push/subscriptions','POST',sub)).status,200);
    const status=`/push/subscriptions?endpoint=${encodeURIComponent(sub.endpoint)}`;
    assert.equal((await (await call(status)).json()).subscribed,true);
    assert.equal((await (await call(status,'GET',null,'session-user-3')).json()).subscribed,false);
    await call('/push/subscriptions','DELETE',{endpoint:sub.endpoint},'session-user-3');
    assert.equal((await (await call(status)).json()).subscribed,true);
    assert.equal((await call('/internal/send','POST',{user_id:2})).status,403);
    await call('/push/subscriptions','DELETE',{endpoint:sub.endpoint});
    assert.equal((await (await call(status)).json()).subscribed,false);
  } finally { child.kill(); await once(child,'exit'); await new Promise(r=>shm.close(r)); rmSync(dir,{recursive:true,force:true}); }
});
