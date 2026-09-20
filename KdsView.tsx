import { ChefHat, Clock, CheckCircle2, Loader2 } from 'lucide-react';

const mockOrders = [
  { id: '#1042', table: 'Terraza 4 - Mesa 7', items: ['Risotto de Setas', 'Solomillo a la Parrilla', 'Vino de la Casa'], status: 'preparing', elapsed: '8 min' },
  { id: '#1041', table: 'Interior 2 - Mesa 3', items: ['Ensalada Mediterránea', 'Crema de Calabaza', 'Tarta de Queso', 'Café', 'Agua'], status: 'preparing', elapsed: '12 min' },
  { id: '#1040', table: 'Terraza 1 - Mesa 2', items: ['Solomillo a la Parrilla', 'Patatas Trufadas'], status: 'ready', elapsed: '15 min' },
  { id: '#1039', table: 'Interior 7 - Mesa 5', items: ['Crema de Calabaza', 'Risotto de Setas', 'Tarta de Queso', 'Café'], status: 'ready', elapsed: '20 min' },
  { id: '#1038', table: 'Terraza 3 - Mesa 4', items: ['Ensalada Mediterránea', 'Solomillo a la Parrilla', 'Vino de la Casa', 'Tarta de Queso', 'Café', 'Agina'], status: 'preparing', elapsed: '5 min' },
];

export default function KdsView() {
  const preparing = mockOrders.filter((o) => o.status === 'preparing');
  const ready = mockOrders.filter((o) => o.status === 'ready');

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-2xl font-bold text-slate-800">{mockOrders.length}</p>
          <p className="text-xs text-slate-500">Pedidos activos</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-2xl font-bold text-amber-600">{preparing.length}</p>
          <p className="text-xs text-slate-500">En preparación</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-2xl font-bold text-emerald-600">{ready.length}</p>
          <p className="text-xs text-slate-500">Listos para servir</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-2xl font-bold text-slate-800">12 min</p>
          <p className="text-xs text-slate-500">Tiempo promedio</p>
        </div>
      </div>

      {/* KDS columns */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Preparing */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Loader2 className="h-5 w-5 text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-700">En Preparación</h3>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {preparing.length}
            </span>
          </div>
          <div className="space-y-3">
            {preparing.map((order) => (
              <div key={order.id} className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-800">{order.id}</span>
                  <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
                    <Clock className="h-3.5 w-3.5" />
                    {order.elapsed}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{order.table}</p>
                <ul className="mt-3 space-y-1">
                  {order.items.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      {item}
                    </li>
                  ))}
                </ul>
                <button className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Marcar como listo
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Ready */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <h3 className="text-sm font-semibold text-slate-700">Listos para Servir</h3>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              {ready.length}
            </span>
          </div>
          <div className="space-y-3">
            {ready.map((order) => (
              <div key={order.id} className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-800">{order.id}</span>
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                    <Clock className="h-3.5 w-3.5" />
                    {order.elapsed}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{order.table}</p>
                <ul className="mt-3 space-y-1">
                  {order.items.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
                <button className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">
                  Entregado
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {mockOrders.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 text-center">
          <ChefHat className="h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">No hay pedidos activos</p>
        </div>
      )}
    </div>
  );
}
