import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Group, Loader, Stack, Switch, Text, Title } from '@mantine/core';
import { api } from '../api/client';

type Session = { ref: string; ip?: string; user_agent?: string; updated?: string };
const labels: Record<string,string> = {service_expiry:'Окончание подписки',low_balance:'Низкий баланс',payments:'Платежи',ticket_replies:'Ответы поддержки'};
const unwrap = (body: any) => body?.data ?? body;
export default function AccountProfilePanel() {
  const [prefs,setPrefs]=useState<Record<string,number>>({});
  const [sessions,setSessions]=useState<Session[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  useEffect(()=>{ let active=true; void Promise.all([api.get('/user/profile'),api.get('/user/profile/sessions')]).then(([p,s])=>{
    if(!active)return; const raw=unwrap(p.data); const profile=Array.isArray(raw)?raw[0]:raw;
    if(!profile?.notifications)throw new Error('Серверный API профиля не установлен.');
    setPrefs(profile.notifications);
    const list=unwrap(s.data); if(!Array.isArray(list))throw new Error('Некорректный ответ списка сессий'); setSessions(list);
  }).catch(()=>{if(active)setError('Не удалось загрузить настройки аккаунта. Проверьте установку серверного API.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
  const save=async()=>{setBusy(true);setError('');setMessage('');try{await api.post('/user/profile/notifications',prefs);setMessage('Предпочтения сохранены.');}catch{setError('Не удалось сохранить настройки.');}finally{setBusy(false);}};
  const revoke=async(ref:string)=>{if(!window.confirm('Завершить эту сессию? Если это ваш текущий вход, потребуется авторизоваться заново.'))return;setBusy(true);try{await api.delete('/user/profile/sessions',{data:{ref}});setSessions(items=>items.filter(item=>item.ref!==ref));}catch{setError('Не удалось завершить сессию.');}finally{setBusy(false);}};
  return <Stack gap="lg">
    {error&&<Alert color="red" role="alert">{error}</Alert>}{message&&<Alert color="green" role="status">{message}</Alert>}
    {loading?<Loader size="sm"/>:<>
    <Card withBorder radius="lg" p="lg"><Group justify="space-between"><Title order={3} size="h4">Уведомления</Title><Badge variant="light">Предпочтения</Badge></Group><Text size="sm" c="dimmed" mt={6}>Выберите события для уведомлений. Доставка требует подключения этих настроек к серверным шаблонам отправки.</Text><Stack gap="md" mt="lg">{Object.entries(labels).map(([key,label])=><Switch key={key} label={label} checked={Boolean(prefs[key])} disabled={busy||!Object.keys(prefs).length} onChange={e=>setPrefs({...prefs,[key]:e.currentTarget.checked?1:0})}/>)}</Stack><Button mt="lg" onClick={save} loading={busy} disabled={!Object.keys(prefs).length}>Сохранить настройки</Button></Card>
    <Card withBorder radius="lg" p="lg"><Title order={3} size="h4">Активные сессии</Title><Text size="sm" c="dimmed" mt={6}>Завершайте входы на устройствах, которыми больше не пользуетесь.</Text><Stack mt="lg">{sessions.length?sessions.map(s=><Group key={s.ref} justify="space-between" style={{borderTop:'1px solid var(--mantine-color-default-border)',paddingTop:12}}><div style={{minWidth:0,flex:1}}><Text size="sm" fw={600} style={{overflowWrap:'anywhere'}}>{s.user_agent||'Устройство не определено'}</Text><Text size="xs" c="dimmed">{s.ip||'IP не указан'} · {s.updated||'Дата неизвестна'}</Text></div><Button size="xs" color="red" variant="light" disabled={busy} onClick={()=>void revoke(s.ref)}>Завершить</Button></Group>):<Text size="sm" c="dimmed">Сессии не загружены.</Text>}</Stack></Card>
    </>}
  </Stack>;
}
