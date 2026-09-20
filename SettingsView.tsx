import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, Check, Building2, Phone, MapPin, FileText, Save } from 'lucide-react';
import {
  type RestaurantSettings,
  fetchRestaurantSettings,
  upsertRestaurantSettings,
} from '@/lib/settingsDb';

export default function SettingsView() {
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [name, setName] = useState('');
  const [rif, setRif] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchRestaurantSettings();
      setSettings(data);
      if (data) {
        setName(data.name);
        setRif(data.rif);
        setPhone(data.phone);
        setAddress(data.address);
      }
    } catch {
      setError('No se pudieron cargar los datos del restaurante.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !rif.trim() || !phone.trim() || !address.trim()) {
      setError('Todos los campos son obligatorios.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const updated = await upsertRestaurantSettings({
        name: name.trim(),
        rif: rif.trim(),
        phone: phone.trim(),
        address: address.trim(),
      });
      setSettings(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('No se pudieron guardar los datos. Verifica tu conexión e inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
          <Building2 className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Datos del Restaurante</h2>
          <p className="text-sm text-slate-500">
            Información fiscal que aparece en los tickets de cobro
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto text-rose-400 hover:text-rose-600">
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <Check className="h-4 w-4 shrink-0" />
          Datos guardados correctamente.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Restaurant Name */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            Nombre del Restaurante
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Restaurante La Casona"
            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-800 transition-colors placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        {/* RIF */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            RIF
          </label>
          <input
            type="text"
            value={rif}
            onChange={(e) => setRif(e.target.value)}
            placeholder="Ej. J-12345678-9"
            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-800 transition-colors placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <Phone className="h-3.5 w-3.5 text-slate-400" />
            Teléfono
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ej. +58 212-1234567"
            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-800 transition-colors placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        {/* Address */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            Dirección
          </label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Ej. Av. Principal, Edificio Centro, Local 1, Caracas"
            rows={3}
            className="w-full resize-none rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-800 transition-colors placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-5">
          {settings?.updated_at && (
            <p className="text-xs text-slate-400">
              Última actualización: {new Date(settings.updated_at).toLocaleDateString('es-VE', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="ml-auto flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}
