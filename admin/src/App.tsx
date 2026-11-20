import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
const Login = lazy(() => import('./pages/Login'));
const Users = lazy(() => import('./pages/Users'));
const Services = lazy(() => import('./pages/Services'));
const UserServices = lazy(() => import('./pages/UserServices'));
const Withdraws = lazy(() => import('./pages/Withdraws'));
const Spool = lazy(() => import('./pages/Spool'));
const Pays = lazy(() => import('./pages/Pays'));
const Servers = lazy(() => import('./pages/Servers'));
const Templates = lazy(() => import('./pages/Templates'));
const Promo = lazy(() => import('./pages/Promo'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Profiles = lazy(() => import('./pages/Profiles'));
const Bonuses = lazy(() => import('./pages/Bonuses'));
const Storage = lazy(() => import('./pages/Storage'));
const Events = lazy(() => import('./pages/Events'));
const ServerGroups = lazy(() => import('./pages/ServerGroups'));
const Identities = lazy(() => import('./pages/Identities'));
const SpoolHistory = lazy(() => import('./pages/SpoolHistory'));
const SHMCloud = lazy(() => import('./pages/SHMCloud'));
const Subscription = lazy(() => import('./pages/Subscription'));
const PaymentSystems = lazy(() => import('./pages/PaymentSystems'));
const CurrencyConverter = lazy(() => import('./pages/CurrencyConverter'));
const ConfigurationTabs = lazy(() => import('./pages/ConfigurationTabs'));
const Topology = lazy(() => import('./pages/Topology'));
const NotFound = lazy(() => import('./pages/NotFound'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  useEffect(() => {
    const handleToastClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const toastDiv = target.closest('.toast-with-close');
      if (toastDiv) {
        const rect = target.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        if (clickX > width - 40) {
          toast.dismiss();
        }
      }
    };

    document.addEventListener('click', handleToastClick);
    return () => document.removeEventListener('click', handleToastClick);
  }, []);

  const baseHref = document.querySelector('base')?.getAttribute('href') || '/';
  const basename = baseHref.endsWith('/') ? baseHref.slice(0, -1) : baseHref;

  return (
    <BrowserRouter basename={basename}>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #334155',
          },
          success: {
            iconTheme: {
              primary: '#22d3ee',
              secondary: '#1e293b',
            },
          },
          error: {
            iconTheme: {
              primary: '#f87171',
              secondary: '#1e293b',
            },
          },
          className: 'toast-with-close',
        }}
      />
      <Suspense fallback={<div role="status" aria-live="polite" style={{padding:24,color:"var(--theme-content-text-muted)"}}>Загружаем раздел…</div>}>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="topology" element={<Topology />} />
          <Route path="users" element={<Users />} />
          <Route path="profiles" element={<Profiles />} />
          <Route path="user-services" element={<UserServices />} />
          <Route path="withdraws" element={<Withdraws />} />
          <Route path="pays" element={<Pays />} />
          <Route path="bonuses" element={<Bonuses />} />
          <Route path="storage" element={<Storage />} />
          <Route path="promo" element={<Promo />} />
          <Route path="services" element={<Services />} />
          <Route path="events" element={<Events />} />
          <Route path="servers" element={<Servers />} />
          <Route path="server-groups" element={<ServerGroups />} />
          <Route path="identities" element={<Identities />} />
          <Route path="spool" element={<Spool />} />
          <Route path="spool-history" element={<SpoolHistory />} />
          <Route path="templates" element={<Templates />} />
          <Route path="cloud" element={<SHMCloud />} />
          <Route path="subscription" element={<Subscription />} />
          <Route path="payment-systems" element={<PaymentSystems />} />
          <Route path="currency-converter" element={<CurrencyConverter />} />
          <Route path="configuration" element={<ConfigurationTabs />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;

