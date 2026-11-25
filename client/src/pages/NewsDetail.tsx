import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, Group, Image, Loader, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft, IconThumbDown, IconThumbUp } from '@tabler/icons-react';
import { api } from '../api/client';

type NewsItem = {
  id: string;
  title?: string;
  body?: string;
  created?: string;
  image_url?: string;
  media_url?: string;
};

export default function NewsDetail() {
  const { id } = useParams<{ id: string }>();
  const [news, setNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reaction, setReaction] = useState<'like' | 'dislike' | null>(null);
  const [reacting, setReacting] = useState(false);
  const [reactionError, setReactionError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get('/user/notifications').then(response => {
      const data = response.data?.data;
      const payload = Array.isArray(data) ? data[0] : data;
      const item = payload?.notifications?.find((entry: NewsItem) => entry.id === id);
      if (!cancelled) { setNews(item || null); setError(!item); }
    }).catch(() => { if (!cancelled) setError(true); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const react = async (value: 'like' | 'dislike') => {
    if (!id || reacting) return;
    setReacting(true);
    setReactionError(false);
    try { await api.post('/user/news/reaction', { id, reaction: value }); setReaction(value); }
    catch { setReactionError(true); }
    finally { setReacting(false); }
  };

  if (loading) return <Stack align="center" py="xl"><Loader /></Stack>;
  if (error || !news) return <Stack gap="md"><Button component={Link} to="/notifications" variant="subtle" leftSection={<IconArrowLeft size={16} />}>К уведомлениям</Button><Alert color="orange">Новость больше недоступна или срок её хранения истёк.</Alert></Stack>;
  const image = news.image_url || news.media_url;
  return <Stack gap="lg" maw={760} mx="auto" w="100%">
    <Button component={Link} to="/notifications" variant="subtle" leftSection={<IconArrowLeft size={16} />} w="fit-content">Все уведомления</Button>
    <article className="vpn-finance-panel" style={{ padding: 'clamp(20px, 4vw, 36px)' }}>
      <Stack gap="md">
        <div><Title order={1}>{news.title || 'Новость vBios'}</Title><Text c="dimmed" size="sm" mt={6}>{news.created || ''}</Text></div>
        {image && <Image src={image} alt="" radius="md" maw={720} fit="cover" />}
        <Text style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{news.body || ''}</Text>
        <Group gap="sm" mt="sm">
          <Button variant={reaction === 'like' ? 'filled' : 'light'} color="green" leftSection={<IconThumbUp size={17} />} onClick={() => void react('like')} loading={reacting && reaction !== 'like'}>Нравится</Button>
          <Button variant={reaction === 'dislike' ? 'filled' : 'light'} color="red" leftSection={<IconThumbDown size={17} />} onClick={() => void react('dislike')} loading={reacting && reaction !== 'dislike'}>Не нравится</Button>
        </Group>
        {reactionError && <Text c="red" size="sm">Не удалось сохранить реакцию. Попробуйте ещё раз.</Text>}
      </Stack>
    </article>
  </Stack>;
}
