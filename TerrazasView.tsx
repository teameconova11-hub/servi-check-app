import { useState, useEffect, useCallback } from 'react';
import { Plus, Users, Store, Trash2, Loader2, AlertCircle } from 'lucide-react';
import AddModal, { type AddMode } from '@/components/AddModal';
import {
  type Terraza,
  type Mesa,
  fetchTerrazas,
  fetchMesas,
  createTerraza,
  createMesa,
  toggleMesaEnabled,
  deleteMesa,
} from '@/lib/db';

export default function TerrazasView() {
  const [terrazas, setTerrazas] = useState<Terraza[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [activeTerrazaId, setActiveTerrazaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<AddMode>('mesa');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadMesas = useCallback(async (terrazaId: string) => {
    const data = await fetchMesas(terrazaId);
    setMesas(data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const t = await fetchTerrazas();
        if (cancelled) return;
        setTerrazas(t);
        if (t.length > 0) {
          setActiveTerrazaId(t[0].id);
          const m = await fetchMesas(t[0].id);
          if (cancelled) return;
          setMesas(m);
        } else {
          setMesas([]);
        }
      } catch {
        if (!cancelled) setError('No se pudieron cargar los datos.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (activeTerrazaId) {
      loadMesas(activeTerrazaId);
    } else {
      setMesas([]);
    }
  }, [activeTerrazaId, loadMesas]);

  const handleSelectTerraza = (id: string) => {
    setActiveTerrazaId(id);
  };

  const handleToggleMesa = async (mesa: Mesa) => {
    setTogglingId(mesa.id);
    const newEnabled = !mesa.is_active;
    setMesas((prev) =>
      prev.map((m) => (m.id === mesa.id ? { ...m, is_active: newEnabled } : m))
    );
    try {
      await toggleMesaEnabled(mesa.id, newEnabled);
    } catch {
      setMesas((prev) =>
        prev.map((m) => (m.id === mesa.id ? { ...m, is_active: !newEnabled } : m))
      );
      setError('No se pudo actualizar la mesa.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteMesa = async (id: string) => {
    setMesas((prev) => prev.filter((m) => m.id !== id));
    try {
      await deleteMesa(id);
    } catch {
      setError('No se pudo eliminar la mesa.');
      loadMesas(activeTerrazaId!);
    }
  };

  const openAddMesa = () => {
    setModalMode('mesa');
    setModalOpen(true);
  };

  const openAddTerraza = () => {
    setModalMode('terraza');
    setModalOpen(true);
  };

  const handleAddTerraza = async (name: string) => {
    const newTerraza = await createTerraza(name);
    setTerrazas((prev) => [...prev, newTerraza]);
    setActiveTerrazaId(newTerraza.id);
    setMesas([]);
  };

  const handleAddMesa = async (number: number, seats: number) => {
    if (!activeTerrazaId) return;
    const newMesa = await createMesa(activeTerrazaId, number, seats);
    setMesas((prev) =>
      [...prev, newMesa].sort((a, b) => parseInt(a.table_number) - parseInt(b.table_number))
    );
  };

  const activeTerraza = terrazas.find((t) => t.id === activeTerrazaId);
  const enabledCount = mesas.filter((m) => m.is_active).length;
  const disabledCount = mesas.filter((m) => !m.is_active).length;
  const totalSeats = mesas.filter((m) => m.is_active).reduce((sum, m) => sum + m.capacity, 0);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error && terrazas.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <AlertCircle className="h-10 w-10 text-rose-400" />
        <p className="text-sm text-slate-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Terrace tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {terrazas.map((t) => {
          const isActive = t.id === activeTerrazaId;
          return (
            <button
              key={t.id}
              onClick={() => handleSelectTerraza(t.id)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <Store className={`h-4 w-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              {t.name}
            </button>
          );
        })}
        <button
          onClick={openAddTerraza}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:border-emerald-400 hover:text-emerald-600"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nueva terraza</span>
        </button>
      </div>

      {/* Summary cards for active terrace */}
      {activeTerraza && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-2xl font-bold text-slate-800">{mesas.length}</p>
            <p className="text-xs text-slate-500">Mesas totales</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-2xl font-bold text-emerald-600">{enabledCount}</p>
            <p className="text-xs text-slate-500">Habilitadas</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-2xl font-bold text-slate-400">{disabledCount}</p>
            <p className="text-xs text-slate-500">Deshabilitadas</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-2xl font-bold text-slate-800">{totalSeats}</p>
            <p className="text-xs text-slate-500">Comensales disponibles</p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-700">
            {activeTerraza ? activeTerraza.name : 'Selecciona una terraza'}
          </h3>
          {activeTerraza && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              {mesas.length} {mesas.length === 1 ? 'mesa' : 'mesas'}
            </span>
          )}
        </div>
        {activeTerraza && (
          <button
            onClick={openAddMesa}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Añadir mesa</span>
          </button>
        )}
      </div>

      {/* Table grid */}
      {activeTerraza && mesas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 text-center">
          <Store className="h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">No hay mesas en esta terraza todavía</p>
          <button
            onClick={openAddMesa}
            className="mt-4 flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Añadir la primera mesa
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {mesas.map((mesa) => (
            <div
              key={mesa.id}
              className={`group rounded-2xl border bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md
                ${mesa.is_active
                  ? 'border-slate-200'
                  : 'border-slate-200 opacity-50'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold transition-colors
                      ${mesa.is_active
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                        : 'bg-slate-100 text-slate-400'}`}
                  >
                    {mesa.table_number}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Mesa {mesa.table_number}</p>
                    <p className="flex items-center gap-1 text-xs text-slate-500">
                      <Users className="h-3 w-3" />
                      {mesa.capacity} comensales
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteMesa(mesa.id)}
                  className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                  aria-label="Eliminar mesa"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Switch */}
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className={`text-xs font-medium ${mesa.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {mesa.is_active ? 'Habilitada' : 'Deshabilitada'}
                </span>
                <button
                  onClick={() => handleToggleMesa(mesa)}
                  disabled={togglingId === mesa.id}
                  className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 disabled:cursor-wait"
                  style={{
                    backgroundColor: mesa.is_active ? '#10b981' : '#cbd5e1',
                  }}
                  role="switch"
                  aria-checked={mesa.is_active}
                  aria-label={`Mesa ${mesa.table_number} ${mesa.is_active ? 'habilitada' : 'deshabilitada'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200
                      ${mesa.is_active ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <AddModal
        open={modalOpen}
        mode={modalMode}
        terrazaName={activeTerraza?.name}
        terrazaCount={mesas.length}
        onClose={() => setModalOpen(false)}
        onAddTerraza={handleAddTerraza}
        onAddMesa={handleAddMesa}
      />
    </div>
  );
}
