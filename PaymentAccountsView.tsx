import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  X,
  Wallet,
  DollarSign,
  Check,
  Building2,
  Banknote,
} from 'lucide-react';
import {
  type PaymentAccount,
  type PaymentAccountInput,
  fetchPaymentAccounts,
  createPaymentAccount,
  updatePaymentAccount,
  deletePaymentAccount,
} from '@/lib/paymentAccountsDb';

export default function PaymentAccountsView() {
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<PaymentAccount | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'VES'>('VES');
  const [details, setDetails] = useState('');
  const [isActive, setIsActive] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchPaymentAccounts();
      setAccounts(data);
    } catch {
      setError('No se pudieron cargar las cuentas de pago.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreateModal = () => {
    setEditingAccount(null);
    setName('');
    setCurrency('VES');
    setDetails('');
    setIsActive(true);
    setShowModal(true);
  };

  const openEditModal = (account: PaymentAccount) => {
    setEditingAccount(account);
    setName(account.name);
    setCurrency(account.currency);
    setDetails(account.details);
    setIsActive(account.is_active);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre de la cuenta es obligatorio.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const input: PaymentAccountInput = {
        name: name.trim(),
        currency,
        details: details.trim(),
        is_active: isActive,
      };
      if (editingAccount) {
        await updatePaymentAccount(editingAccount.id, input);
      } else {
        await createPaymentAccount(input);
      }
      setShowModal(false);
      await load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[PaymentAccountsView] handleSave error:', err);
      setError(`Error al guardar: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deletePaymentAccount(id);
      await load();
    } catch {
      setError('No se pudo eliminar la cuenta.');
    } finally {
      setDeletingId(null);
    }
  };

  const currencyIcon = (cur: string) =>
    cur === 'USD' ? DollarSign : Banknote;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600 ring-1 ring-teal-100">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Cuentas de Pago</h2>
            <p className="text-sm text-slate-500">
              Gestiona las cuentas financieras para recibir pagos
            </p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" />
          Nueva cuenta
        </button>
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

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 text-center">
          <Wallet className="h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-500">No hay cuentas de pago registradas</p>
          <p className="mt-1 text-xs text-slate-400">Crea tu primera cuenta para empezar a recibir pagos</p>
          <button
            onClick={openCreateModal}
            className="mt-4 flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" />
            Crear cuenta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => {
            const CurIcon = currencyIcon(account.currency);
            return (
              <div
                key={account.id}
                className={`group rounded-2xl border bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md
                  ${account.is_active ? 'border-slate-200' : 'border-slate-200 opacity-60'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1
                        ${account.currency === 'USD'
                          ? 'bg-emerald-50 text-emerald-600 ring-emerald-100'
                          : 'bg-amber-50 text-amber-600 ring-amber-100'}`}
                    >
                      <CurIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-slate-800">{account.name}</h3>
                      <span
                        className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold
                          ${account.currency === 'USD'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'}`}
                      >
                        {account.currency}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(account)}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(account.id)}
                      disabled={deletingId === account.id}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                      aria-label="Eliminar"
                    >
                      {deletingId === account.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {account.details && (
                  <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-xs font-medium text-slate-500">Detalles</p>
                    <p className="mt-0.5 break-words text-sm text-slate-700">{account.details}</p>
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2">
                  <span
                    className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium
                      ${account.is_active
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-slate-100 text-slate-500'}`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full
                        ${account.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}
                    />
                    {account.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => !saving && setShowModal(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                  {editingAccount ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                </div>
                <h3 className="text-sm font-semibold text-slate-800">
                  {editingAccount ? 'Editar cuenta' : 'Nueva cuenta de pago'}
                </h3>
              </div>
              <button
                onClick={() => !saving && setShowModal(false)}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 px-6 py-5">
              {/* Name */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  Nombre de la cuenta
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Banco de Venezuela, Pago Móvil, Zelle"
                  autoFocus
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-800 transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
                />
              </div>

              {/* Currency */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Moneda</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['VES', 'USD'] as const).map((cur) => {
                    const Icon = currencyIcon(cur);
                    const isSelected = currency === cur;
                    return (
                      <button
                        key={cur}
                        type="button"
                        onClick={() => setCurrency(cur)}
                        className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all
                          ${isSelected
                            ? cur === 'USD'
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                              : 'border-amber-500 bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                      >
                        <Icon className="h-4 w-4" />
                        {cur === 'VES' ? 'Bolívares (VES)' : 'Dólares (USD)'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Details */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Detalles (número o referencia)
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Ej. Cuenta: 0102-0123-45-00067890 / Tel: 0414-1234567"
                  rows={3}
                  className="w-full resize-none rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-800 transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
                />
              </div>

              {/* Active toggle */}
              <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setIsActive((v) => !v)}
                  className={`relative h-6 w-11 rounded-full transition-colors
                    ${isActive ? 'bg-teal-500' : 'bg-slate-300'}`}
                  aria-label="Activar/desactivar cuenta"
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform
                      ${isActive ? 'translate-x-5' : 'translate-x-0.5'}`}
                  />
                </button>
                <span className="text-sm text-slate-700">
                  {isActive ? 'Cuenta activa' : 'Cuenta inactiva'}
                </span>
              </label>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {saving ? 'Guardando...' : editingAccount ? 'Guardar cambios' : 'Crear cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
