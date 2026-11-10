export type OfflineService = { user_service_id: number; service_id: number; status: string; expire: string | null; next: number | null; created: string; parent: number | null; service: { category: string; cost: number; name: string } };
type Connection = { category: 'proxy' | 'vpn'; value: string; updatedAt: number };
const servicesKey = 'shm_offline_services_v1';
const connectionKey = (id: number) => `shm_offline_connection_v1_${id}`;
export const saveOfflineServices = (services: OfflineService[]) => localStorage.setItem(servicesKey, JSON.stringify(services));
export function readOfflineServices(): OfflineService[] { try { const data = JSON.parse(localStorage.getItem(servicesKey) || '[]'); return Array.isArray(data) ? data : []; } catch { return []; } }
export const saveOfflineConnection = (id: number, category: 'proxy' | 'vpn', value: string) => localStorage.setItem(connectionKey(id), JSON.stringify({ category, value, updatedAt: Date.now() } satisfies Connection));
export function readOfflineConnection(id: number, category: 'proxy' | 'vpn'): Connection | null { try { const data = JSON.parse(localStorage.getItem(connectionKey(id)) || 'null') as Connection | null; return data?.category === category && typeof data.value === 'string' ? data : null; } catch { return null; } }
export function clearOfflineCabinet() { localStorage.removeItem(servicesKey); Object.keys(localStorage).filter((key) => key.startsWith('shm_offline_connection_v1_')).forEach((key) => localStorage.removeItem(key)); localStorage.removeItem('shm_offline_user_v1'); }
