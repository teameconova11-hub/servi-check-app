import { useState, useEffect } from 'react';
import { X, Plus, Store, UtensilsCrossed } from 'lucide-react';

export type AddMode = 'terraza' | 'mesa';

interface AddModalProps {
  open: boolean;
  mode: AddMode;
  terrazaName?: string;
  terrazaCount: number;
  onClose: () => void;
  onAddTerraza: (name: string) => Promise<void>;
  onAddMesa: (number: number, seats: number) => Promise<void>;
}

export default function AddModal({
  open,
  mode,
  terrazaName,
  terrazaCount,
  onClose,
  onAddTerraza,
  onAddMesa,
}: AddModalProps) {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [seats, setSeats] = useState('4');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName('');
      setNumber(String(terrazaCount + 1));
      setSeats('4');
      setError('');
      setSaving(false);
    }
  }, [open, terrazaCount]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (mode === 'terraza') {
        if (!name.trim()) {
          setError('El nombre es obligatorio');
          setSaving(false);
          return;
        }
        await onAddTerraza(name.trim());
      } else {
        const num = parseInt(number, 10);
        const s = parseInt(seats, 10);
        if (isNaN(num) || num < 1) {
          setError('El número de mesa debe ser válido');
          setSaving(false);
          return;
        }
        if (isNaN(s) || s < 1) {
          setError('La capacidad debe ser válida');
          setSaving(false);
          return;
        }
        await onAddMesa(num, s);
      }
      onClose();
    } catch {
      setError('No se pudo guardar. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const isTerraza = mode === 'terraza';
  const Icon = isTerraza ? Store : UtensilsCrossed;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                {isTerraza ? 'Nueva terraza' : 'Nueva mesa'}
              </h3>
              <p className="text-xs text-slate-500">
                {isTerraza ? 'Añade una zona o terraza' : `En ${terrazaName ?? ''}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {isTerraza ? (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Nombre de la terraza
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Terraza Jardín"
                autoFocus
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 placeholder-slate-400 transition-all focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  Número de mesa
                </label>
                <input
                  type="number"
                  min={1}
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  autoFocus
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 placeholder-slate-400 transition-all focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  Capacidad (comensales)
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={seats}
                  onChange={(e) => setSeats(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 placeholder-slate-400 transition-all focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </>
          )}

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {saving ? 'Guardando...' : 'Añadir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
