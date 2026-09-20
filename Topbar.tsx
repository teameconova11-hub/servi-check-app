import { Menu, Search, Bell, Calendar } from 'lucide-react';

interface TopbarProps {
  title: string;
  subtitle: string;
  onOpenMobileSidebar: () => void;
}

export default function Topbar({ title, subtitle, onOpenMobileSidebar }: TopbarProps) {
  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md lg:px-8">
      <button
        onClick={onOpenMobileSidebar}
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <h2 className="truncate text-base font-semibold text-slate-800 lg:text-lg">{title}</h2>
        <p className="hidden truncate text-xs text-slate-500 sm:block">{subtitle}</p>
      </div>

      <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 md:flex">
        <Calendar className="h-4 w-4" />
        <span className="capitalize">{today}</span>
      </div>

      <div className="relative hidden sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar..."
          className="w-40 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder-slate-400 transition-all focus:w-56 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
        />
      </div>

      <button
        className="relative rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
      </button>
    </header>
  );
}
