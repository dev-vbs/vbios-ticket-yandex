import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Collapse,
  Divider,
  FileButton,
  Group,
  Loader,
  Modal,
  ScrollArea,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  UnstyledButton,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import './Tickets.css';
import {
  IconMessageCircle,
  IconChevronUp,
  IconChevronDown,
  IconPaperclip,
  IconPlus,
  IconSend,
  IconTrash,
} from '@tabler/icons-react';
import { ticketApi, userApi, type TicketItem, type TicketMedia } from '../api/client';
import { useStore } from '../store/useStore';

function MediaPreview({ media, onPreview, onDownload }: { media: TicketMedia; onPreview: (m: TicketMedia, url: string) => void; onDownload: (m: TicketMedia) => void }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const imageTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const mime = media.mime_type ?? '';
  const isImage = mime.startsWith('image/');
  const isVideo = mime.startsWith('video/');
  const isPreviewable = isImage || isVideo;

  useEffect(() => {
    if (!isPreviewable) return;
    let url: string | undefined;
    let cancelled = false;
    setFailed(false);
    setObjectUrl(null);
    let timer: ReturnType<typeof setTimeout> | undefined;
    ticketApi.mediaSource(media.id, attempt >= 2)
      .then((source) => {
        if (cancelled) { if (source.temporary) URL.revokeObjectURL(source.url); return; }
        if (source.temporary) url = source.url;
        imageTimer.current = setTimeout(() => {
          if (!cancelled) {
            if (attempt < 2) setAttempt((value) => value + 1);
            else setFailed(true);
          }
        }, 20_000);
        setObjectUrl(source.url);
      })
      .catch(() => {
        if (cancelled) return;
        if (attempt < 2) timer = setTimeout(() => setAttempt((value) => value + 1), 800 * (attempt + 1));
        else setFailed(true);
      });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearTimeout(imageTimer.current);
      if (url) URL.revokeObjectURL(url);
    };
  }, [media.id, isPreviewable, attempt]);

  const onMediaError = () => {
    clearTimeout(imageTimer.current);
    if (attempt < 2) setAttempt((value) => value + 1);
    else setFailed(true);
  };

  if (failed) {
    return <Stack gap={4}><Text size="xs" c="dimmed">Не удалось загрузить {media.name}</Text><Group gap="xs">
      <Button size="xs" variant="light" onClick={() => { setFailed(false); setAttempt(0); }}>Повторить загрузку</Button>
      <Button size="xs" variant="subtle" onClick={() => onDownload(media)}>Скачать файл</Button>
    </Group></Stack>;
  }
  if (!isPreviewable) {
    return (
      <Button
        variant="subtle"
        justify="flex-start"
        leftSection={<IconPaperclip size={14} />}
        onClick={() => onDownload(media)}
      >
        {media.name}
      </Button>
    );
  }

  if (!objectUrl) {
    return <Loader size="xs" />;
  }

  if (isImage) {
    return (
      <img
        src={objectUrl}
        alt={media.name}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={onMediaError}
        onLoad={() => clearTimeout(imageTimer.current)}
        style={{ maxWidth: '100%', maxHeight: 320, borderRadius: 8, display: 'block', cursor: 'pointer' }}
        onClick={() => onPreview(media, objectUrl)}
      />
    );
  }

  return (
    <video
      src={objectUrl}
      controls
      onError={onMediaError}
      onLoadedData={() => clearTimeout(imageTimer.current)}
      style={{ maxWidth: '100%', maxHeight: 320, borderRadius: 8, display: 'block', cursor: 'pointer' }}
      onClick={(e) => { e.preventDefault(); onPreview(media, objectUrl); }}
    />
  );
}

interface UserServiceItem {
  user_service_id: number;
  name?: string;
  service?: { name?: string };
}

interface PaymentItem {
  id: number;
  money: number;
  date?: string;
  pay_system_id?: string;
}

const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
const MAX_MESSAGE_LENGTH = 2000;
const KNOWN_STATUSES = new Set(['open', 'in_progress', 'waiting', 'closed', 'archived']);

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('file_read_failed'));
        return;
      }
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('file_read_failed'));
    reader.readAsDataURL(file);
  });
}

function formatDate(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function apiErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: { error?: unknown; errors?: unknown } } })?.response?.data;
  if (typeof data?.error === 'string' && data.error.trim()) return data.error;
  if (Array.isArray(data?.errors)) {
    const message = data.errors.find((item): item is string => typeof item === 'string' && item.trim().length > 0);
    if (message) return message;
  }
  return fallback;
}
function normalizeStatus(status?: string): string {
  return status && KNOWN_STATUSES.has(status) ? status : 'unknown';
}

function statusColor(status?: string): string {
  const normalized = normalizeStatus(status);
  if (normalized === 'open') return 'blue';
  if (normalized === 'in_progress') return 'yellow';
  if (normalized === 'waiting') return 'grape';
  if (normalized === 'closed') return 'gray';
  if (normalized === 'archived') return 'dark';
  return 'gray';
}

export default function Tickets() {
  const { t } = useTranslation();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const setHasNewTicketMessages = useStore((s) => s.setHasNewTicketMessages);

  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<TicketItem[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [services, setServices] = useState<UserServiceItem[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newPriority, setNewPriority] = useState<string>('normal');
  const [newType, setNewType] = useState<string>('other');
  const [newResponder, setNewResponder] = useState<'ai' | 'human'>('human');
  const [aiAvailable, setAiAvailable] = useState(false);
  const [changingResponder, setChangingResponder] = useState(false);
  const [newServiceId, setNewServiceId] = useState<string | null>(null);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [newPaymentId, setNewPaymentId] = useState<string | null>(null);

  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<{ media: TicketMedia; url: string } | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [closedExpanded, setClosedExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const ticketButtonRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const messagesViewportRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesViewportRef.current) {
      messagesViewportRef.current.scrollTo({ top: messagesViewportRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  const latestMessageId = selectedTicket?.messages?.[selectedTicket.messages.length - 1]?.message_id;

  useEffect(() => {
    if (latestMessageId) scrollToBottom();
  }, [latestMessageId]);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await ticketApi.list();
      const data = response.data?.data;
      const list = Array.isArray(data) ? data : [];
      setTickets(list);
      const hasWaiting = list.some((ticket) => ticket.status === 'waiting');
      setHasNewTicketMessages(hasWaiting);
    } catch (error) {
      notifications.show({
        title: t('common.error'),
        message: apiErrorMessage(error, t('tickets.createError')),
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    let cancelled = false;
    ticketApi.options().then((response) => {
      const raw = response.data?.data;
      const options = Array.isArray(raw) ? raw[0] : raw;
      if (!cancelled) setAiAvailable(Number(options?.ai_available) === 1);
    }).catch(() => { if (!cancelled) setAiAvailable(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) void loadTickets();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [loadTickets]);

  useEffect(() => {
    const ticketId = selectedTicket?.ticket_id;
    if (!ticketId) return;

    let inFlight = false;
    const refreshConversation = async () => {
      if (document.hidden || inFlight) return;
      inFlight = true;
      try {
        const response = await ticketApi.get(ticketId);
        const data = response.data?.data;
        const nextTicket = Array.isArray(data) ? data[0] : undefined;
        if (!nextTicket) return;

        setSelectedTicket((current) => current?.ticket_id === ticketId ? nextTicket : current);
        setTickets((current) => current.map((ticket) => (
          ticket.ticket_id === ticketId
            ? { ...ticket, status: nextTicket.status, updated: nextTicket.updated, messages: nextTicket.messages }
            : ticket
        )));
        setHasNewTicketMessages(nextTicket.status === 'waiting');
      } catch {
        // A short background refresh must never interrupt the conversation.
      } finally {
        inFlight = false;
      }
    };

    const onVisibilityChange = () => {
      if (!document.hidden) void refreshConversation();
    };
    void refreshConversation();
    const timer = window.setInterval(refreshConversation, 3_000);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [selectedTicket?.ticket_id, setHasNewTicketMessages]);

  const loadServices = async () => {
    if (services.length > 0 || servicesLoading) return;
    setServicesLoading(true);
    try {
      const response = await userApi.getServices();
      const data = response.data?.data;
      const list = Array.isArray(data) ? data : [];
      setServices(list);
    } catch {
      setServices([]);
    } finally {
      setServicesLoading(false);
    }
  };

  const loadPayments = async () => {
    if (payments.length > 0 || paymentsLoading) return;
    setPaymentsLoading(true);
    try {
      const response = await userApi.getPayments({ limit: 5, sort_field: 'id', sort_direction: 'desc' });
      const data = response.data?.data;
      const list = Array.isArray(data) ? data : [];
      setPayments(list);
    } catch {
      setPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  };

  const openCreate = () => {
    setCreateOpen(true);
    loadServices();
  };

  const createTicket = async () => {
    if (!newSubject.trim() || (!newMessage.trim() && newFiles.length === 0)) {
      notifications.show({
        title: t('common.error'),
        message: t('tickets.fillRequired'),
        color: 'red',
      });
      return;
    }

    if (newMessage.trim().length > MAX_MESSAGE_LENGTH) {
      notifications.show({
        title: t('common.error'),
        message: t('tickets.messageTooLong'),
        color: 'red',
      });
      return;
    }

    setCreating(true);
    try {
      const mediaIds: number[] = [];
      for (const file of newFiles) {
        const base64 = await toBase64(file);
        const response = await ticketApi.uploadMedia({
          name: file.name,
          mime_type: file.type || 'application/octet-stream',
          data: base64,
        });
        const raw = response.data?.data;
        const media = Array.isArray(raw) ? raw[0] : raw;
        if (!media?.id) throw new Error('Не удалось сохранить изображение');
        mediaIds.push(media.id);
      }
      await ticketApi.create({
        subject: newSubject.trim(),
        responder: newResponder,
        message: newMessage.trim() || 'Прикреплено изображение',
        priority: newPriority as 'low' | 'normal' | 'high' | 'urgent',
        ticket_type: newType as 'service' | 'payment' | 'other',
        ...(newType === 'service' && newServiceId ? { user_service_id: Number(newServiceId) } : {}),
        ...(mediaIds.length > 0 ? { media_ids: mediaIds } : {}),
      });

      notifications.show({
        title: t('common.success'),
        message: t('tickets.ticketCreated'),
        color: 'green',
      });

      setCreateOpen(false);
      setNewSubject('');
      setNewMessage('');
      setNewPriority('normal');
      setNewResponder('human');
      setNewType('other');
      setNewServiceId(null);
      setNewPaymentId(null);
      setNewFiles([]);
      await loadTickets();
    } catch (error) {
      notifications.show({
        title: t('common.error'),
        message: apiErrorMessage(error, t('tickets.createError')),
        color: 'red',
      });
    } finally {
      setCreating(false);
    }
  };

  const openTicket = async (ticket: TicketItem) => {
    if (isMobile) {
      setTicketOpen(true);
    }
    setSelectedTicket(ticket);
    setReplyMessage('');
    setReplyFiles([]);
    setTicketLoading(true);

    if (ticketIsClosed(ticket.status)) {
      setClosedExpanded(true);
      requestAnimationFrame(() => {
        ticketButtonRefs.current[ticket.ticket_id]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      });
    }

    try {
      const response = await ticketApi.get(ticket.ticket_id);
      const data = response.data?.data;
      if (Array.isArray(data) && data.length > 0) {
        setSelectedTicket(data[0]);
      }
    } catch {
      notifications.show({
        title: t('common.error'),
        message: t('tickets.sendError'),
        color: 'red',
      });
    } finally {
      setTicketLoading(false);
    }
  };

  const downloadMedia = async (media: TicketMedia) => {
    try {
      const response = await ticketApi.downloadMedia(media.id);
      const blob = response.data;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = media.name || `file_${media.id}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      notifications.show({
        title: t('common.error'),
        message: t('tickets.sendError'),
        color: 'red',
      });
    }
  };

  const onPickFiles = (files: File[] | null) => {
    if (!files || files.length === 0) return;

    const accepted: File[] = [];
    for (const file of files) {
      if (!IMAGE_TYPES.has(file.type)) {
        notifications.show({ title: 'Формат изображения', message: 'Выберите JPEG, PNG, WebP или GIF до 5 МБ.', color: 'red' });
        continue;
      }
      if (file.size > MAX_ATTACHMENT_SIZE) {
        notifications.show({
          title: t('common.error'),
          message: t('tickets.fileTooLarge', { name: file.name }),
          color: 'red',
        });
        continue;
      }
      accepted.push(file);
    }

    if (accepted.length > 0) {
      setReplyFiles((prev) => [...prev, ...accepted]);
    }
  };

  const onPickNewFiles = (files: File[] | null) => {
    if (!files || files.length === 0) return;
    const accepted = files.filter((file) => {
      if (!IMAGE_TYPES.has(file.type)) {
        notifications.show({ title: 'Формат изображения', message: 'Выберите JPEG, PNG, WebP или GIF до 5 МБ.', color: 'red' });
        return false;
      }
      if (file.size <= MAX_ATTACHMENT_SIZE) return true;
      notifications.show({
        title: t('common.error'),
        message: t('tickets.fileTooLarge', { name: file.name }),
        color: 'red',
      });
      return false;
    });
    if (accepted.length) setNewFiles((current) => [...current, ...accepted]);
  };

  const removeNewFile = (index: number) => {
    setNewFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const removeReplyFile = (index: number) => {
    setReplyFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async () => {
    if (!selectedTicket) return;
    if (!replyMessage.trim() && replyFiles.length === 0) {
      notifications.show({
        title: t('common.error'),
        message: t('tickets.fillRequired'),
        color: 'red',
      });
      return;
    }

    if (replyMessage.trim().length > MAX_MESSAGE_LENGTH) {
      notifications.show({
        title: t('common.error'),
        message: t('tickets.messageTooLong'),
        color: 'red',
      });
      return;
    }

    setSending(true);
    try {
      const mediaIds: number[] = [];
      for (const file of replyFiles) {
        const base64 = await toBase64(file);
        const response = await ticketApi.uploadMedia({
          name: file.name,
          mime_type: file.type || 'application/octet-stream',
          data: base64,
        });
        const raw = response.data?.data;
        const media = Array.isArray(raw) ? raw[0] : raw;
        if (!media?.id) throw new Error('Не удалось сохранить изображение');
        mediaIds.push(media.id);
      }

      await ticketApi.sendMessage(selectedTicket.ticket_id, {
        message: replyMessage.trim() || 'Прикреплено изображение',
        ...(mediaIds.length > 0 ? { media_ids: mediaIds } : {}),
      });

      setReplyMessage('');
      setReplyFiles([]);

      const response = await ticketApi.get(selectedTicket.ticket_id);
      const data = response.data?.data;
      if (Array.isArray(data) && data.length > 0) {
        setSelectedTicket(data[0]);
      }

      await loadTickets();
    } catch (error) {
      notifications.show({
        title: t('common.error'),
        message: apiErrorMessage(error, t('tickets.sendError')),
        color: 'red',
      });
    } finally {
      setSending(false);
    }
  };

  const closeTicket = async () => {
    if (!selectedTicket) return;

    setClosing(true);
    try {
      await ticketApi.close(selectedTicket.ticket_id);
      notifications.show({
        title: t('common.success'),
        message: t('tickets.ticketClosed'),
        color: 'green',
      });

      const response = await ticketApi.get(selectedTicket.ticket_id);
      const data = response.data?.data;
      if (Array.isArray(data) && data.length > 0) {
        setSelectedTicket(data[0]);
      }

      await loadTickets();
    } catch {
      notifications.show({
        title: t('common.error'),
        message: t('tickets.closeError'),
        color: 'red',
      });
    } finally {
      setClosing(false);
    }
  };

  const changeResponder = async (value: string | null) => {
    if (!selectedTicket || (value !== 'ai' && value !== 'human')) return;
    const ticketId = selectedTicket.ticket_id;
    setChangingResponder(true);
    try {
      await ticketApi.setResponder(ticketId, value);
      const response = await ticketApi.get(ticketId);
      const updated = response.data?.data?.[0];
      if (updated) setSelectedTicket((current) => current?.ticket_id === ticketId ? updated : current);
      const deliveryFailed = value === 'human' && updated?.telegram_error;
      notifications.show({ message: deliveryFailed ? 'ИИ отключён. Обращение сохранено, но уведомить группу пока не удалось. Попробуйте выбрать сотрудника ещё раз.' : value === 'human' ? 'Обращение передано сотруднику. ИИ больше не отвечает в этом тикете.' : 'Выбран ИИ-помощник. Напишите следующий вопрос.', color: deliveryFailed ? 'yellow' : 'green' });
    } catch (error) {
      notifications.show({ title: t('common.error'), message: apiErrorMessage(error, 'Не удалось изменить выбор. Если сотрудник уже ответил, продолжайте общение с поддержкой.'), color: 'red' });
    } finally { setChangingResponder(false); }
  };

  const ticketIsClosed = (status?: string) => status === 'closed' || status === 'archived';

  const filterTickets = (list: TicketItem[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.trim().toLowerCase();
    return list.filter((ticket) =>
      ticket.subject?.toLowerCase().includes(q) ||
      ticket.messages?.some((m) => m.message?.toLowerCase().includes(q)),
    );
  };

  const activeTickets = useMemo(
    () => filterTickets(tickets.filter((ticket) => !ticketIsClosed(ticket.status))),
    [tickets, searchQuery],
  );

  const closedTickets = useMemo(
    () => filterTickets(tickets.filter((ticket) => ticketIsClosed(ticket.status))),
    [tickets, searchQuery],
  );

  const getTicketSubject = (ticket?: Pick<TicketItem, 'subject'> | null, maxLength = 30) => {
    const subject = ticket?.subject?.trim() || t('tickets.noSubject');
    return subject.length > maxLength ? `${subject.slice(0, maxLength)}…` : subject;
  };
  const getTicketStatusLabel = (status?: string) => {
    const normalized = normalizeStatus(status);
    if (normalized === 'unknown') {
      return t('tickets.status.unknown');
    }
    return t(`tickets.status.${normalized}`);
  };
  const getTicketIdText = (ticket?: Pick<TicketItem, 'ticket_id'> | null) => {
    if (typeof ticket?.ticket_id === 'number') {
      return `#${ticket.ticket_id}`;
    }
      return t('tickets.ticket');
  };

  const renderTicketCard = (ticket: TicketItem) => {
    const isSelected = selectedTicket?.ticket_id === ticket.ticket_id;
    const isWaiting = ticket.status === 'waiting';
    const lastMessage = ticket.messages && ticket.messages.length > 0
      ? ticket.messages[ticket.messages.length - 1]
      : null;

    return (
      <UnstyledButton
        key={ticket.ticket_id}
        onClick={() => openTicket(ticket)}
        ref={(node) => {
          ticketButtonRefs.current[ticket.ticket_id] = node;
        }}
      >
        <Card
          className={`ticket-list-item ${isSelected ? 'ticket-list-item--selected' : ''} ${isWaiting ? 'ticket-list-item--waiting' : ''}`}
          withBorder
          radius={0}
          p="xs"
          style={{
            textAlign: 'left',
            position: 'relative',
            borderColor: isSelected ? 'var(--ui-accent)' : undefined,
            background: isSelected ? 'var(--ui-accent-soft)' : undefined,
          }}
        >
          {isWaiting && (
            <Box
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: 'var(--ui-accent)',
              }}
            />
          )}
          <Stack gap={4}>
            <Text fw={600} size="sm" lineClamp={1}>{getTicketSubject(ticket)}</Text>
            {lastMessage?.message && (
              <Text size="xs" c="dimmed" lineClamp={2}>
                {lastMessage.message}
              </Text>
            )}
            <Text size="xs" c="dimmed">{getTicketIdText(ticket)} • {formatDate(ticket.updated || ticket.created)}</Text>
          </Stack>
        </Card>
      </UnstyledButton>
    );
  };

  const renderChatContent = () => {
    if (ticketLoading || !selectedTicket) {
      return (
        <Center py="xl" style={{ flex: 1 }}>
          <Loader size="md" />
        </Center>
      );
    }

    return (
      <Stack gap="sm" className="ticket-conversation" style={{ height: '100%', overflow: 'hidden' }}>
        <Group justify="space-between" align="center" className="ticket-conversation__header">
          <Group gap="xs" style={{ minWidth: 0 }}>
            <Text fw={600} size="sm" lineClamp={1}>{getTicketIdText(selectedTicket)} {getTicketSubject(selectedTicket)}</Text>
            <Badge size="sm" color={statusColor(selectedTicket.status)}>{getTicketStatusLabel(selectedTicket.status)}</Badge>
          </Group>

          {!ticketIsClosed(selectedTicket.status) && (
            <Button
              size="xs"
              color="red"
              variant="light"
              onClick={closeTicket}
              loading={closing}
            >
              {t('tickets.closeTicket')}
            </Button>
          )}
        </Group>

        {!ticketIsClosed(selectedTicket.status) && <Select
          label="Кто отвечает на обращение"
          description={selectedTicket.responder === 'ai' ? 'ИИ помогает с вопросами. Для проверки оплаты и действий с услугой выберите сотрудника.' : 'Сотрудник отвечает через группу поддержки. Мгновенный ответ не гарантируется.'}
          value={selectedTicket.responder || null}
          placeholder="Выберите ИИ или сотрудника"
          onChange={changeResponder}
          disabled={changingResponder || sending}
          data={[{ value: 'human', label: 'Техподдержка — сотрудник' }, { value: 'ai', label: aiAvailable ? 'ИИ-помощник' : 'ИИ-помощник недоступен', disabled: !aiAvailable }]}
        />}
        <Divider />

        <ScrollArea style={{ flex: 1 }} offsetScrollbars viewportRef={messagesViewportRef}>
          <Stack gap="sm" pr="xs">
            {(selectedTicket.messages || []).map((message) => {
              const isAdmin = String(message.is_admin) === 'true' || String(message.is_admin) === '1';
              return (
                <Card
                  key={message.message_id}
                  className={`ticket-message ${isAdmin ? 'ticket-message--admin' : 'ticket-message--user'}`}
                  withBorder
                  p="sm"
                  radius="md"
                  style={{
                    alignSelf: isAdmin ? 'flex-start' : 'flex-end',
                    maxWidth: '72%',
                    background: isAdmin ? 'var(--ui-surface-soft)' : 'var(--ui-accent-soft)',
                  }}
                >
                  <Group gap={6} mb={6}>
                    <ThemeIcon
                      size="sm"
                      variant="transparent"
                      color={isAdmin ? 'gray' : 'blue'}
                    >
                      <IconMessageCircle size={14} />
                    </ThemeIcon>
                    <Text size="xs" fw={600}>{isAdmin ? t('tickets.supportAuthor', { defaultValue: 'Поддержка' }) : t('tickets.youAuthor', { defaultValue: 'Вы' })}</Text><Text size="xs" c="dimmed">{formatDate(message.created)}</Text>
                  </Group>

                  <Text size="sm" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{message.message}</Text>

                  {message.media && message.media.length > 0 && (
                    <Stack gap={6} mt="sm">
                      {message.media.map((media) => (
                        <MediaPreview
                          key={media.id}
                          media={media}
                          onPreview={(m, url) => setMediaPreview({ media: m, url })}
                          onDownload={downloadMedia}
                        />
                      ))}
                    </Stack>
                  )}
                </Card>
              );
            })}
          </Stack>
        </ScrollArea>

        {ticketIsClosed(selectedTicket.status) ? (
          <Text size="sm" c="dimmed" ta="center" py="xs">{t('tickets.ticketClosedNote')}</Text>
        ) : (
          <Stack gap="xs" className="ticket-reply-box">
            {replyFiles.length > 0 && (
              <Stack gap={4}>
                {replyFiles.map((file, index) => (
                  <Group key={`${file.name}_${index}`} justify="space-between" wrap="nowrap">
                    <Text size="sm" lineClamp={1}>{file.name}</Text>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      aria-label="Удалить вложение"
                      disabled={sending}
                      onClick={() => removeReplyFile(index)}
                      size="sm"
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                ))}
              </Stack>
            )}

            <Box style={{ position: 'relative' }}>
              <Textarea
                placeholder={t('tickets.messagePlaceholder')}
                value={replyMessage}
                onChange={(event) => setReplyMessage(event.currentTarget.value.slice(0, MAX_MESSAGE_LENGTH))}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
                  event.preventDefault();
                  if (!sending) void sendMessage();
                }}
                aria-label={t('tickets.messagePlaceholder')}
                maxLength={MAX_MESSAGE_LENGTH}
                autosize
                minRows={1}
                styles={{ input: { paddingRight: 68 } }}
              />
              <Group gap={4} style={{ position: 'absolute', bottom: 7, right: 8 }}>
                <FileButton onChange={onPickFiles} accept={IMAGE_ACCEPT} multiple>
                  {(props) => (
                    <ActionIcon {...props} disabled={sending} variant="subtle" color="gray" size="sm" aria-label="Прикрепить изображение">
                      <IconPaperclip size={16} />
                    </ActionIcon>
                  )}
                </FileButton>
                <ActionIcon
                  onClick={sendMessage}
                  loading={sending}
                  disabled={!replyMessage.trim() && replyFiles.length === 0}
                  variant="subtle"
                  color="blue"
                  size="sm"
                  aria-label="Отправить сообщение"
                >
                  <IconSend size={16} />
                </ActionIcon>
              </Group>
            </Box>
          </Stack>
        )}
      </Stack>
    );
  };

  return (
    <Stack
      className="tickets-page"
      gap="md"
      pb={isMobile ? 100 : 0}
      style={!isMobile ? {
        overflow: 'hidden',
      } : undefined}
    >
      <Group className="page-header" justify="space-between" align="center" wrap="nowrap">
        <div><span className="cabinet-breadcrumb">Личный кабинет</span><Text className="page-header__title" fw={700}>{t('tickets.title')}</Text><p className="page-header__description">Здесь можно задать вопрос и отслеживать ответы поддержки.</p></div>
        <Button leftSection={<IconPlus size={16} />} radius="xl" onClick={openCreate}>
          {t('tickets.createTicket')}
        </Button>
      </Group>

      {!loading && activeTickets.length === 0 && closedTickets.length === 0 ? (
        <Card withBorder radius="lg" p="xl">
          <Stack align="center" gap="md" py={48}>
            <ThemeIcon size={56} radius="xl" variant="light"><IconMessageCircle size={28} /></ThemeIcon>
            <Text fw={700} size="xl" ta="center">Как мы можем помочь?</Text>
            <Text c="dimmed" size="sm" ta="center" maw={430}>Опишите вопрос и укажите услугу. Можно приложить скриншот, видео или файл — вся переписка останется в обращении.</Text>
            <Button leftSection={<IconPlus size={17} />} onClick={openCreate} size="md">Создать первое обращение</Button>
          </Stack>
        </Card>
      ) : isMobile ? (
        loading ? (
          <Center py="xl">
            <Loader size="md" />
          </Center>
        ) : activeTickets.length === 0 && closedTickets.length === 0 ? (
          <Card withBorder radius="lg" p="lg">
            <Text ta="center" c="dimmed">{t('tickets.noTickets')}</Text>
          </Card>
        ) : (
          <Stack gap="md" className="ticket-mobile-list">
            {activeTickets.length > 0 && (
              <Stack gap={0}>
                {activeTickets.map(renderTicketCard)}
              </Stack>
            )}
            {closedTickets.length > 0 && (
              <>
                <Divider label={t('tickets.closedAndArchived')} labelPosition="center" />
                <Stack gap={0}>
                  {closedTickets.map(renderTicketCard)}
                </Stack>
              </>
            )}
          </Stack>
        )
      ) : (
        <Group className="ticket-layout" align="stretch" grow={false} wrap="nowrap" style={{ height: 'calc(100dvh - 226px)', minHeight: 520 }}>
          <Card className="ticket-list-panel" withBorder radius="lg" p={0} style={{ width: 320, display: 'flex', flexDirection: 'column' }}>
            <Stack gap="0" style={{ height: '100%' }}>
              <TextInput
                placeholder={t('tickets.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                size="sm"
                styles={{
                  input: {
                    borderRadius: 'var(--mantine-radius-lg) var(--mantine-radius-lg) 0 0',
                    border: 'none',
                    borderBottom: '1px solid var(--mantine-color-default-border)',
                  },
                }}
              />
              {loading ? (
                <Center py="xl" style={{ flex: 1 }}>
                  <Loader size="md" />
                </Center>
              ) : activeTickets.length === 0 && closedTickets.length === 0 ? (
                <Card withBorder radius="lg" p="lg">
                  <Text ta="center" c="dimmed">{t('tickets.noTickets')}</Text>
                </Card>
              ) : (
                <>
                  <ScrollArea style={{ flex: 1 }}>
                    <Stack gap={0}>
                      {activeTickets.map(renderTicketCard)}
                    </Stack>
                  </ScrollArea>

                  {closedTickets.length > 0 && (
                    <Box style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
                      <UnstyledButton
                        onClick={() => setClosedExpanded((v) => !v)}
                        style={{ width: '100%', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                      >
                        <Text size="xs" c="dimmed" fw={500}>{t('tickets.closedAndArchived')} ({closedTickets.length})</Text>
                        {closedExpanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                      </UnstyledButton>
                      <Collapse in={closedExpanded}>
                        <ScrollArea mah="40vh">
                          <Stack gap={0}>
                            {closedTickets.map(renderTicketCard)}
                          </Stack>
                        </ScrollArea>
                      </Collapse>
                    </Box>
                  )}
                </>
              )}
            </Stack>
          </Card>

          <Card className="ticket-chat-panel" withBorder radius="lg" p="md" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {selectedTicket ? renderChatContent() : (
              <Center style={{ flex: 1 }}>
                <Stack gap={6} align="center">
                  <IconMessageCircle size={28} />
                  <Text c="dimmed">{t('tickets.selectTicket')}</Text>
                </Stack>
              </Center>
            )}
          </Card>
        </Group>
      )}

      <Modal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('tickets.createTicket')}
        fullScreen={!!isMobile}
        size="lg"
      >
        <Stack gap="md">
          <Select
            label="Кто должен ответить"
            description="ИИ помогает с общими вопросами. Сотрудник проверяет оплату и решает вопросы с услугами."
            value={newResponder}
            onChange={(value) => setNewResponder(value === 'ai' ? 'ai' : 'human')}
            disabled={creating}
            data={[{ value: 'human', label: 'Техподдержка — сотрудник' }, { value: 'ai', label: aiAvailable ? 'ИИ-помощник' : 'ИИ-помощник недоступен', disabled: !aiAvailable }]}
          />
          <TextInput
            label={t('tickets.subject')}
            placeholder={t('tickets.subjectPlaceholder')}
            value={newSubject}
            onChange={(event) => setNewSubject(event.currentTarget.value)}
            withAsterisk
          />

          <Select
            label={t('tickets.ticketTypeLabel')}
            value={newType}
            onChange={(value) => {
              const type = value || 'other';
              setNewType(type);
              if (type === 'service') { setNewPaymentId(null); loadServices(); }
              if (type === 'payment') { setNewServiceId(null); loadPayments(); }
              if (type === 'other') { setNewServiceId(null); setNewPaymentId(null); }
            }}
            data={[
              { value: 'service', label: t('tickets.ticketType.service') },
              { value: 'payment', label: t('tickets.ticketType.payment') },
              { value: 'other', label: t('tickets.ticketType.other') },
            ]}
          />

          <Select
            label={t('tickets.priorityLabel')}
            value={newPriority}
            onChange={(value) => setNewPriority(value || 'normal')}
            data={[
              { value: 'low', label: t('tickets.priority.low') },
              { value: 'normal', label: t('tickets.priority.normal') },
              { value: 'high', label: t('tickets.priority.high') },
              { value: 'urgent', label: t('tickets.priority.urgent') },
            ]}
          />

          {newType === 'service' && (
            servicesLoading ? (
              <Center py="xs"><Loader size="sm" /></Center>
            ) : services.length === 0 ? (
              <Text size="sm" c="dimmed" ta="center" py="xs">{t('tickets.noServices')}</Text>
            ) : (
              <Select
                label={t('tickets.selectService')}
                placeholder={t('tickets.selectServicePlaceholder')}
                value={newServiceId}
                onChange={setNewServiceId}
                clearable
                data={services.map((service) => ({
                  value: String(service.user_service_id),
                  label: `${service.service?.name || service.name || 'Service'} #${service.user_service_id}`,
                }))}
              />
            )
          )}

          {newType === 'payment' && (
            paymentsLoading ? (
              <Center py="xs"><Loader size="sm" /></Center>
            ) : payments.length === 0 ? (
              <Text size="sm" c="dimmed" ta="center" py="xs">{t('tickets.noPayments')}</Text>
            ) : (
              <Select
                label={t('tickets.selectPayment')}
                placeholder={t('tickets.selectPaymentPlaceholder')}
                value={newPaymentId}
                onChange={(value) => {
                  setNewPaymentId(value);
                  if (value && !newSubject.trim()) {
                    const pay = payments.find((p) => String(p.id) === value);
                    if (pay) {
                      setNewSubject(`${t('tickets.ticketType.payment')} #${pay.id} — ${pay.money}₽${pay.date ? ` · ${formatDate(pay.date)}` : ''}`);
                    }
                  }
                }}
                clearable
                data={payments.map((pay) => ({
                  value: String(pay.id),
                  label: `#${pay.id} — ${pay.money}₽${pay.date ? ` · ${formatDate(pay.date)}` : ''}`,
                }))}
              />
            )
          )}

          <Textarea
            label={t('tickets.message')}
            placeholder={t('tickets.messagePlaceholder')}
            value={newMessage}
            onChange={(event) => setNewMessage(event.currentTarget.value.slice(0, MAX_MESSAGE_LENGTH))}
            maxLength={MAX_MESSAGE_LENGTH}
            autosize
            minRows={5}
          />

          <Stack gap={4}>
            <Text size="xs" c="dimmed">JPEG, PNG, WebP или GIF — до 5 МБ на изображение.</Text>
            {newFiles.map((file, index) => (
              <Group key={`${file.name}_${index}`} justify="space-between" wrap="nowrap">
                <Text size="sm" lineClamp={1}>{file.name}</Text>
                <ActionIcon variant="subtle" color="red" onClick={() => removeNewFile(index)} aria-label="Удалить вложение">
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            ))}
            <FileButton onChange={onPickNewFiles} accept={IMAGE_ACCEPT} multiple>
              {(props) => <Button {...props} variant="light" leftSection={<IconPaperclip size={16} />}>Прикрепить изображения</Button>}
            </FileButton>
          </Stack>

          <Group justify="flex-end">
            <Button variant="light" onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={createTicket} loading={creating}>{t('tickets.send')}</Button>
          </Group>
        </Stack>
      </Modal>

      {isMobile && (
        <Modal
          opened={ticketOpen}
          onClose={() => setTicketOpen(false)}
          title={selectedTicket ? `${getTicketIdText(selectedTicket)} ${getTicketSubject(selectedTicket)}` : t('tickets.title')}
          fullScreen
          size="xl"
        >
          {renderChatContent()}
        </Modal>
      )}

      <Modal
        opened={!!mediaPreview}
        onClose={() => setMediaPreview(null)}
        title={mediaPreview?.media.name || ''}
        size="xl"
        centered
      >
        {mediaPreview && (
          mediaPreview.media.mime_type?.startsWith('video/') ? (
            <video
              src={mediaPreview.url}
              controls
              autoPlay
              style={{ width: '100%', maxHeight: '80vh', borderRadius: 8 }}
            />
          ) : (
            <img
              src={mediaPreview.url}
              alt={mediaPreview.media.name}
              style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8 }}
            />
          )
        )}
      </Modal>
    </Stack>
  );
}

import './Pages.css';
