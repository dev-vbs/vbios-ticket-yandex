import { shm_request, normalizeListResponse } from './shm_request';

export interface DashboardAnalytics {
  counts: {
    totalUsers: number;
    activeUserServices: number;
    totalRevenue: number;
  };
  payments: {
    timeline: { date: string; value: number; label?: string }[];
  };
  services: {
    byStatus: { name: string; value: number; color?: string }[];
  };
}

export async function fetchDashboardAnalytics(period: number = 7): Promise<DashboardAnalytics> {
  try {
    // Вычисляем даты для периода
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    const start = formatDate(startDate);
    const stop = formatDate(endDate);

    // Параллельные запросы к API - только данные за период
    const results = await Promise.allSettled([
      shm_request('shm/v1/admin/user?limit=1'),
      shm_request(`shm/v1/admin/user/service?start=${start}&stop=${stop}&field=created&limit=5000`),
      shm_request(`shm/v1/admin/user/pay?start=${start}&stop=${stop}&field=date&limit=9999`),
    ]);

    const [
      usersCountRes,
      userServicesNewRes,
      paymentsRes,
    ] = results.map((result) => (result.status === 'fulfilled' ? result.value : null));

    // Нормализация данных
    const totalUsersCount = usersCountRes?.items || usersCountRes?.total || 0;
    const userServicesNew = userServicesNewRes ? normalizeListResponse(userServicesNewRes).data : [];
    const payments = paymentsRes ? normalizeListResponse(paymentsRes).data : [];

    // Фильтрация "реальных" платежей (без manual)
    const realPayments = payments.filter((p: any) =>
      p.pay_system_id &&
      p.pay_system_id !== '' &&
      p.pay_system_id !== '0' &&
      p.pay_system_id.toLowerCase() !== 'manual'
    );

    // Подсчеты
    const totalRevenue = realPayments.reduce((sum: number, p: any) => sum + parseFloat(p.money || 0), 0);
    const activeUserServices = userServicesNew.filter((us: any) => us.status === 'ACTIVE').length;

    // Группировка платежей по датам
    const paymentsByDate: Record<string, number> = {};
    realPayments.forEach((p: any) => {
      const date = p.date.split('T')[0];
      paymentsByDate[date] = (paymentsByDate[date] || 0) + parseFloat(p.money || 0);
    });

    // Статистика по статусам сервисов
    const servicesByStatus: Record<string, number> = {};
    userServicesNew.forEach((us: any) => {
      servicesByStatus[us.status] = (servicesByStatus[us.status] || 0) + 1;
    });

    const result: DashboardAnalytics = {
      counts: {
        totalUsers: totalUsersCount,
        activeUserServices: activeUserServices,
        totalRevenue: totalRevenue,
      },
      payments: {
        timeline: Object.entries(paymentsByDate).map(([date, value]) => ({ date, value })),
      },
      services: {
        byStatus: Object.entries(servicesByStatus).map(([name, value]) => ({ name, value })),
      },
    };
    return result;

  } catch (error) {
    throw error;
  }
}
