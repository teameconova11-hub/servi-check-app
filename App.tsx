import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from '@/lib/auth';
import Sidebar, { type ViewId } from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import LoginView from '@/views/LoginView';
import DashboardView from '@/views/DashboardView';
import TerrazasView from '@/views/TerrazasView';
import MenusView from '@/views/MenusView';
import KdsView from '@/views/KdsView';
import OrdersView from '@/views/OrdersView';
import SettingsView from '@/views/SettingsView';
import PaymentAccountsView from '@/views/PaymentAccountsView';
import AccountsReceivableView from '@/views/AccountsReceivableView';
import DailyClosuresView from '@/views/DailyClosuresView';

const viewMeta: Record<ViewId, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Dashboard Financiero y Operativo',
    subtitle: 'Resumen de ingresos, ocupación y rendimiento del día',
  },
  terrazas: {
    title: 'Gestión de Terrazas y Mesas',
    subtitle: 'Estado en tiempo real de las mesas por zona',
  },
  menus: {
    title: 'Gestión de Menús y Platos',
    subtitle: 'Carta, precios y disponibilidad de platos',
  },
  kds: {
    title: 'Cocina (KDS)',
    subtitle: 'Pedidos en preparación y listos para servir',
  },
  orders: {
    title: 'Tomar Pedidos',
    subtitle: 'Registra pedidos de las mesas asignadas',
  },
  settings: {
    title: 'Datos del Restaurante',
    subtitle: 'Información fiscal que aparece en los tickets de cobro',
  },
  'payment-accounts': {
    title: 'Cuentas de Pago',
    subtitle: 'Gestiona las cuentas financieras para recibir pagos',
  },
  'accounts-receivable': {
    title: 'Cuentas por Cobrar',
    subtitle: 'Créditos pendientes y gestión de cobranza',
  },
  'daily-closures': {
    title: 'Cierres Diarios',
    subtitle: 'Expediente de cierres históricos y control de jornada',
  },
};

const defaultViewByRole: Record<string, ViewId> = {
  admin: 'dashboard',
  waiter: 'orders',
  kitchen: 'kds',
};

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const [activeView, setActiveView] = useState<ViewId>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Set default view when user logs in
  useEffect(() => {
    if (user) {
      setActiveView(defaultViewByRole[user.role] ?? 'dashboard');
    }
  }, [user]);

  const handleNavigate = (view: ViewId) => {
    setActiveView(view);
    setMobileOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const meta = viewMeta[activeView];

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar
        activeView={activeView}
        onNavigate={handleNavigate}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        role={user.role}
        userName={user.fullName || user.email}
        userEmail={user.email}
        onSignOut={handleSignOut}
      />

      <div className={`transition-all duration-300 ${collapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
        <Topbar
          title={meta.title}
          subtitle={meta.subtitle}
          onOpenMobileSidebar={() => setMobileOpen(true)}
        />

        <main className="p-4 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {activeView === 'dashboard' && <DashboardView userEmail={user.email} />}
            {activeView === 'terrazas' && <TerrazasView />}
            {activeView === 'menus' && <MenusView />}
            {activeView === 'kds' && <KdsView />}
            {activeView === 'orders' && <OrdersView />}
          {activeView === 'settings' && <SettingsView />}
          {activeView === 'payment-accounts' && <PaymentAccountsView />}
          {activeView === 'accounts-receivable' && <AccountsReceivableView />}
          {activeView === 'daily-closures' && <DailyClosuresView />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
