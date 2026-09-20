import { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  X,
  Loader2,
  DollarSign,
  Banknote,
  Users,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Archive,
} from 'lucide-react';
import { fetchDailyClosures, type DailyClosure } from '@/lib/dailyClosuresDb';

export default function DailyClosuresView() {
  const [closures, setClosures] = useState<DailyClosure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedClosure, setSelectedClosure] = useState<DailyClosure | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDailyClosures();
      setClosures(data);
    } catch {
      setError('No se pudieron cargar los cierres diarios.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredClosures = dateFilter
    ? closures.filter((c) => c.closure_date === dateFilter)
    : closures;

  const totalUSDBreakdown = closures.reduce((sum, c) => sum + (c.total_usd || 0), 0);
  const totalAllDiners = closures.reduce((sum, c) => sum + (c.total_diners || 0), 0);
  const totalAllOrders = closures.reduce((sum, c) => sum + (c.total_orders || 0), 0);

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto text-rose-400 hover:text-rose-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
            <DollarSign className="h-5 w-5" />
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-800">${totalUSDBreakdown.toFixed(2)}</p>
          <p className="mt-1 text-sm text-slate-500">Total acumulado (USD)</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
            <Users className="h-5 w-5" />
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-800">{totalAllDiners}</p>
          <p className="mt-1 text-sm text-slate-500">Comensales totales</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
            <Receipt className="h-5 w-5" />
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-800">{totalAllOrders}</p>
          <p className="mt-1 text-sm text-slate-500">Órdenes totales</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
          />
        </div>
        {dateFilter && (
          <button
            onClick={() => setDateFilter('')}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Limpiar filtro
          </button>
        )}
        <span className="ml-auto text-xs text-slate-500">
          {filteredClosures.length} {filteredClosures.length === 1 ? 'registro' : 'registros'}
        </span>
      </div>

      {/* Closures table (expediente) */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : filteredClosures.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Archive className="h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">
              {dateFilter ? `No hay cierre registrado para ${dateFilter}` : 'No hay cierres diarios registrados'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3 text-left">Fecha</th>
                  <th className="px-6 py-3 text-right">Total USD</th>
                  <th className="px-6 py-3 text-right">Total VES</th>
                  <th className="px-6 py-3 text-right">Órdenes</th>
                  <th className="px-6 py-3 text-right">Comensales</th>
                  <th className="px-6 py-3 text-left">Cerrado por</th>
                  <th className="px-6 py-3 text-center">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredClosures.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-700">
                      {new Date(c.closure_date + 'T00:00:00').toLocaleDateString('es-VE', { dateStyle: 'long' })}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-emerald-700">${(c.total_usd || 0).toFixed(2)}</td>
                    <td className="px-6 py-3 text-right font-semibold text-amber-700">
                      Bs {(c.total_ves || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3 text-right text-slate-600">{c.total_orders || 0}</td>
                    <td className="px-6 py-3 text-right text-slate-600">{c.total_diners || 0}</td>
                    <td className="px-6 py-3 text-slate-500">{c.closed_by ?? '--'}</td>
                    <td className="px-6 py-3 text-center">
                      <button
                        onClick={() => setSelectedClosure(c)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedClosure && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setSelectedClosure(null)} aria-hidden="true" />
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-white">
                  <Archive className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Expediente de cierre</h3>
                  <p className="text-xs text-slate-500">
                    {new Date(selectedClosure.closure_date + 'T00:00:00').toLocaleDateString('es-VE', { dateStyle: 'long' })}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedClosure(null)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-emerald-50 px-4 py-3">
                  <p className="text-xs text-emerald-600">Total USD</p>
                  <p className="mt-1 text-xl font-bold text-emerald-700">${(selectedClosure.total_usd || 0).toFixed(2)}</p>
                </div>
                <div className="rounded-xl bg-amber-50 px-4 py-3">
                  <p className="text-xs text-amber-600">Total VES</p>
                  <p className="mt-1 text-xl font-bold text-amber-700">
                    Bs {(selectedClosure.total_ves || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-xl bg-sky-50 px-4 py-3">
                  <p className="text-xs text-sky-600">Comensales</p>
                  <p className="mt-1 text-xl font-bold text-sky-700">{selectedClosure.total_diners || 0}</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-500">Órdenes</p>
                  <p className="mt-1 text-xl font-bold text-slate-700">{selectedClosure.total_orders || 0}</p>
                </div>
              </div>

              {selectedClosure.accounts_breakdown && Object.keys(selectedClosure.accounts_breakdown).length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Desglose por cuenta</p>
                  <div className="space-y-2">
                    {Object.entries(selectedClosure.accounts_breakdown).map(([name, amount]) => (
                      <div key={name} className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-2.5">
                        <span className="text-sm text-slate-600">{name}</span>
                        <span className="text-sm font-semibold text-slate-700">${(amount as number).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-2.5 text-xs text-slate-500">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Cerrado por: {selectedClosure.closed_by ?? 'admin'} · {new Date(selectedClosure.created_at).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
