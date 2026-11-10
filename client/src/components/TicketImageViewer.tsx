import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Loader, Modal } from '@mantine/core';
import { IconArrowsMaximize, IconDownload, IconPhoto, IconPlus, IconMinus, IconX } from '@tabler/icons-react';
import { ticketApi, type TicketMedia } from '../api/client';
import './TicketImageViewer.css';

type Point = { x: number; y: number };
type View = Point & { scale: number };
type Gesture = { view: View; origin: Point; distance: number };
const INITIAL_VIEW: View = { x: 0, y: 0, scale: 1 };
const limit = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function TicketImageViewer({ media, onClose, onDownload }: {
  media: TicketMedia;
  onClose: () => void;
  onDownload: (media: TicketMedia) => Promise<void>;
}) {
  const [stageNode, setStageNode] = useState<HTMLDivElement | null>(null);
  const opener = useRef(document.activeElement instanceof HTMLElement ? document.activeElement : null);
  const mounted = useRef(false);
  const loadTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<Gesture | null>(null);
  const dragged = useRef(false);
  const backdropStart = useRef(false);
  const currentView = useRef<View>(INITIAL_VIEW);
  const [view, setView] = useState(INITIAL_VIEW);
  const [bounds, setBounds] = useState({ width: 1, height: 1 });
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [source, setSource] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const isVideo = media.mime_type?.startsWith('video/');
  const fit = useMemo(() => {
    const ratio = natural.width ? Math.min(bounds.width / natural.width, bounds.height / natural.height, 1) : 1;
    return { width: natural.width * ratio, height: natural.height * ratio };
  }, [bounds, natural]);

  const applyView = useCallback((next: View) => {
    const scale = limit(next.scale, 1, 5);
    const maxX = Math.max(0, (fit.width * scale - bounds.width) / 2);
    const maxY = Math.max(0, (fit.height * scale - bounds.height) / 2);
    const value = { scale, x: limit(next.x, -maxX, maxX), y: limit(next.y, -maxY, maxY) };
    currentView.current = value;
    setView(value);
  }, [bounds, fit]);

  const zoom = useCallback((factor: number, anchor: Point = { x: 0, y: 0 }) => {
    const previous = currentView.current;
    const scale = limit(previous.scale * factor, 1, 5);
    const ratio = scale / previous.scale;
    applyView({ scale, x: anchor.x - (anchor.x - previous.x) * ratio, y: anchor.y - (anchor.y - previous.y) * ratio });
  }, [applyView]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestAnimationFrame(() => {
        if (!mounted.current && opener.current?.isConnected) opener.current.focus({ preventScroll: true });
      });
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let ownedUrl: string | undefined;
    setLoading(true);
    setFailed(false);
    setSource('');
    loadTimeout.current = setTimeout(() => {
      if (cancelled) return;
      if (attempt < 2) setAttempt((value) => value + 1);
      else { setLoading(false); setFailed(true); }
    }, 50_000);
    ticketApi.mediaSource(media.id, attempt >= 1).then((result) => {
      if (cancelled) { if (result.temporary) URL.revokeObjectURL(result.url); return; }
      if (result.temporary) ownedUrl = result.url;
      setSource(result.url);
    }).catch(() => {
      if (cancelled) return;
      if (attempt < 2) setAttempt((value) => value + 1);
      else { setLoading(false); setFailed(true); }
    });
    return () => { cancelled = true; clearTimeout(loadTimeout.current); if (ownedUrl) URL.revokeObjectURL(ownedUrl); };
  }, [media.id, attempt]);

  // The portal stage appears after the modal mounts; ResizeObserver also covers
  // orientation changes and the mobile browser's changing viewport height.
  useEffect(() => {
    const node = stageNode;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setBounds({ width: entry.contentRect.width, height: entry.contentRect.height });
      currentView.current = INITIAL_VIEW;
      setView(INITIAL_VIEW);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [stageNode]);

  useEffect(() => {
    const node = stageNode;
    if (!node || isVideo) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      if (loading || failed) return;
      const rect = node.getBoundingClientRect();
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * rect.height : event.deltaY;
      zoom(Math.exp(-limit(delta, -100, 100) * 0.003), { x: event.clientX - rect.left - rect.width / 2, y: event.clientY - rect.top - rect.height / 2 });
    };
    node.addEventListener('wheel', wheel, { passive: false });
    return () => node.removeEventListener('wheel', wheel);
  }, [zoom, loading, failed, isVideo, stageNode]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (loading || failed || isVideo) return;
      if (event.key === '+' || event.key === '=') { event.preventDefault(); zoom(1.25); }
      if (event.key === '-') { event.preventDefault(); zoom(0.8); }
      if (event.key === '0') { event.preventDefault(); applyView(INITIAL_VIEW); }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [applyView, zoom, loading, failed, isVideo]);

  const localPoint = (event: ReactPointerEvent): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left - rect.width / 2, y: event.clientY - rect.top - rect.height / 2 };
  };
  const beginGesture = () => {
    const [a, b] = [...pointers.current.values()];
    if (!a) { gesture.current = null; return; }
    gesture.current = { view: currentView.current, origin: b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : a, distance: b ? Math.hypot(a.x - b.x, a.y - b.y) : 0 };
  };
  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isVideo || loading || failed || event.button !== 0) return;
    if (!pointers.current.size) { dragged.current = false; backdropStart.current = event.target === event.currentTarget; }
    pointers.current.set(event.pointerId, localPoint(event));
    if (pointers.current.size > 1) { backdropStart.current = false; dragged.current = true; }
    event.currentTarget.setPointerCapture(event.pointerId);
    setInteracting(true);
    beginGesture();
  };
  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId) || !gesture.current) return;
    pointers.current.set(event.pointerId, localPoint(event));
    const [a, b] = [...pointers.current.values()];
    const start = gesture.current;
    if (b && start.distance > 0) {
      const scale = limit(start.view.scale * Math.hypot(a.x - b.x, a.y - b.y) / start.distance, 1, 5);
      const ratio = scale / start.view.scale;
      applyView({ scale, x: (a.x + b.x) / 2 - (start.origin.x - start.view.x) * ratio, y: (a.y + b.y) / 2 - (start.origin.y - start.view.y) * ratio });
    } else {
      const x = a.x - start.origin.x;
      const y = a.y - start.origin.y;
      if (Math.hypot(x, y) > 5) dragged.current = true;
      applyView({ scale: start.view.scale, x: start.view.x + x, y: start.view.y + y });
    }
  };
  const pointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    beginGesture();
    if (!pointers.current.size) setInteracting(false);
  };
  const onImageError = () => {
    if (attempt < 2) setAttempt((value) => value + 1);
    else { setLoading(false); setFailed(true); }
  };
  const download = async () => {
    setDownloading(true);
    try { await onDownload(media); } finally { setDownloading(false); }
  };
  const size = media.size ? `${(media.size / 1024 / 1024).toFixed(1)} МБ` : '';

  return <Modal opened onClose={onClose} fullScreen title="Просмотр вложения" withCloseButton={false} returnFocus={false} zIndex={500}
    classNames={{ content: 'ticket-lightbox__content', body: 'ticket-lightbox__body', header: 'ticket-lightbox__sr-header' }}
    transitionProps={{ transition: 'fade', duration: 150 }}>
    <div className="ticket-lightbox">
      <header className="ticket-lightbox__toolbar">
        <div className="ticket-lightbox__file"><span className="ticket-lightbox__file-icon"><IconPhoto size={21} /></span><div><h2 title={media.name}>{media.name || 'Изображение'}</h2><p>{natural.width ? `${natural.width} × ${natural.height}` : 'Вложение к обращению'}{size && ` · ${size}`}</p></div></div>
        <div className="ticket-lightbox__actions">
          {!isVideo && <div className="ticket-lightbox__zoom" role="group" aria-label="Масштаб изображения">
            <button type="button" onClick={() => zoom(0.8)} disabled={view.scale <= 1 || loading || failed} aria-label="Уменьшить" title="Уменьшить (−)"><IconMinus size={19} /></button>
            <output aria-live="polite" aria-label="Текущий масштаб">{Math.round(view.scale * 100)}%</output>
            <button type="button" onClick={() => zoom(1.25)} disabled={view.scale >= 5 || loading || failed} aria-label="Увеличить" title="Увеличить (+)"><IconPlus size={19} /></button>
            <button type="button" className="ticket-lightbox__fit" onClick={() => applyView(INITIAL_VIEW)} disabled={loading || failed} aria-label="Вписать изображение" title="Вписать (0)"><IconArrowsMaximize size={19} /></button>
          </div>}
          <button type="button" className="ticket-lightbox__download" onClick={download} disabled={downloading} aria-label="Скачать изображение" title="Скачать оригинал">{downloading ? <Loader size={18} color="gray" /> : <IconDownload size={20} />}<span>Скачать</span></button>
          <button type="button" className="ticket-lightbox__close" onClick={onClose} aria-label="Закрыть просмотр" title="Закрыть (Esc)"><IconX size={22} /></button>
        </div>
      </header>
      <div ref={setStageNode} className={`ticket-lightbox__stage ${view.scale > 1 ? 'is-zoomed' : ''} ${interacting ? 'is-interacting' : ''}`}
        onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={(event) => { dragged.current = true; pointerEnd(event); }}
        onClick={(event) => { if (event.target === event.currentTarget && backdropStart.current && !dragged.current) onClose(); }}
        onDoubleClick={() => { if (!isVideo && !loading && !failed) applyView(view.scale > 1 ? INITIAL_VIEW : { scale: 2.5, x: 0, y: 0 }); }}>
        {loading && !failed && <div className="ticket-lightbox__status" role="status"><Loader color="gray" size="sm" /><span>Загружаем оригинал…</span></div>}
        {failed ? <div className="ticket-lightbox__status" role="alert"><IconPhoto size={32} /><strong>Изображение пока недоступно</strong><span>Проверьте соединение и попробуйте ещё раз.</span><button type="button" onClick={() => { setSource(''); setAttempt(0); }}>Повторить загрузку</button></div>
          : source && (isVideo ? <video src={source} controls playsInline className="ticket-lightbox__video" onLoadedData={() => { clearTimeout(loadTimeout.current); setLoading(false); }} onError={onImageError} />
            : <img src={source} alt={media.name} draggable={false} referrerPolicy="no-referrer" decoding="async" className="ticket-lightbox__image"
              style={{ width: fit.width || 'auto', height: fit.height || 'auto', opacity: loading ? 0 : 1, transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
              onLoad={(event) => { clearTimeout(loadTimeout.current); setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight }); setLoading(false); }} onError={onImageError} />)}
      </div>
      <footer className="ticket-lightbox__footer"><span className="ticket-lightbox__desktop-hint">Колесо мыши — масштаб · Потяните, чтобы переместить · Esc — закрыть</span><span className="ticket-lightbox__mobile-hint">Разведите пальцы для увеличения · Двойное нажатие — масштаб</span><span className="ticket-lightbox__original">Оригинал</span></footer>
    </div>
  </Modal>;
}
