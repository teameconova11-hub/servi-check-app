import { LayoutDashboard, Store, UtensilsCrossed, X, ChevronLeft, LogOut, ChefHat, ClipboardList, Settings, Wallet, Clock, Archive } from 'lucide-react';
import type { UserRole } from '@/lib/auth';

export type ViewId = 'dashboard' | 'terrazas' | 'menus' | 'kds' | 'orders' | 'settings' | 'payment-accounts' | 'accounts-receivable' | 'daily-closures';

interface SidebarProps {
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  role: UserRole;
  userName: string;
  userEmail: string;
  onSignOut: () => void;
}

interface MenuItem {
  id: ViewId;
  label: string;
  description: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[];
}

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard Financiero y Operativo',
    description: 'Métricas, ingresos y KPIs',
    icon: LayoutDashboard,
    roles: ['admin'],
  },
  {
    id: 'terrazas',
    label: 'Gestión de Terrazas y Mesas',
    description: 'Estado y disposición de mesas',
    icon: Store,
    roles: ['admin'],
  },
  {
    id: 'menus',
    label: 'Gestión de Menús y Platos',
    description: 'Carta, precios y disponibilidad',
    icon: UtensilsCrossed,
    roles: ['admin'],
  },
  {
    id: 'orders',
    label: 'Tomar Pedidos',
    description: 'Registrar pedidos de las mesas',
    icon: ClipboardList,
    roles: ['waiter'],
  },
  {
    id: 'kds',
    label: 'Cocina (KDS)',
    description: 'Vista de pedidos en cocina',
    icon: ChefHat,
    roles: ['kitchen'],
  },
  {
    id: 'settings',
    label: 'Datos del Restaurante',
    description: 'Información fiscal para tickets',
    icon: Settings,
    roles: ['admin'],
  },
  {
    id: 'payment-accounts',
    label: 'Cuentas de Pago',
    description: 'Cuentas financieras para cobros',
    icon: Wallet,
    roles: ['admin'],
  },
  {
    id: 'accounts-receivable',
    label: 'Cuentas por Cobrar',
    description: 'Créditos pendientes y cobranza',
    icon: Clock,
    roles: ['admin'],
  },
  {
    id: 'daily-closures',
    label: 'Cierres Diarios',
    description: 'Expediente de cierres históricos',
    icon: Archive,
    roles: ['admin'],
  },
];

const roleLabels: Record<UserRole, string> = {
  admin: 'Panel de Administración',
  waiter: 'Panel de Mesonero',
  kitchen: 'Panel de Cocina',
};

export default function Sidebar({
  activeView,
  onNavigate,
  mobileOpen,
  onCloseMobile,
  collapsed,
  onToggleCollapse,
  role,
  userName,
  userEmail,
  onSignOut,
}: SidebarProps) {
  const visibleItems = menuItems.filter((item) => item.roles.includes(role));
  const initials = userName.charAt(0).toUpperCase() || userEmail.charAt(0).toUpperCase() || '?';

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-slate-900 text-slate-300 transition-all duration-300 ease-in-out
          ${collapsed ? 'w-20' : 'w-72'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand header */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-900/40">
            <UtensilsCrossed className="h-5 w-5 text-white" strokeWidth={2.2} />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="truncate text-sm font-bold tracking-tight text-white">
                Servi Check
              </h1>
              <p className="truncate text-xs text-slate-500">Sistema de Gestión</p>
            </div>
          )}
          <button
            onClick={onCloseMobile}
            className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto scrollbar-thin px-3 py-5">
          {!collapsed && (
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-600">
              {roleLabels[role]}
            </p>
          )}
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-200
                  ${isActive
                    ? 'bg-gradient-to-r from-emerald-500/15 to-teal-500/5 text-white'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}
                  ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-200
                    ${isActive
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-900/50'
                      : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'}`}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                </span>
                {!collapsed && (
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium leading-tight">
                      {item.label}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {item.description}
                    </span>
                  </span>
                )}
                {isActive && !collapsed && (
                  <span className="h-7 w-1 rounded-full bg-emerald-400" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Collapse toggle (desktop) */}
        <div className="hidden border-t border-slate-800 p-3 lg:block">
          <button
            onClick={onToggleCollapse}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
          >
            <ChevronLeft
              className={`h-4 w-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
            />
            {!collapsed && <span>Contraer</span>}
          </button>
        </div>

        {/* User footer + sign out */}
        <div className={`flex items-center gap-3 border-t border-slate-800 p-4 ${collapsed ? 'flex-col gap-2' : ''}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-white">
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-200">{userName}</p>
              <p className="truncate text-xs text-slate-500">{userEmail}</p>
            </div>
          )}
          <button
            onClick={onSignOut}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-500/20 hover:text-rose-400"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>
    </>
  );
}
