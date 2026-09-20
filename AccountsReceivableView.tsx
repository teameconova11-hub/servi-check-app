import { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  X,
  Loader2,
  DollarSign,
  Banknote,
  Check,
  CreditCard,
  Smartphone,
  Landmark,
  Wallet,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  fetchAccountsReceivable,
  markAccountReceivablePaid,
  type AccountReceivable,
} from '@/lib/accountsReceivableDb';
import { fetchPaymentAccounts, type PaymentAccount } from '@/lib/paymentAccountsDb';

export default function AccountsReceivableView() {
  const [receivables, setReceivables] = useState<AccountReceivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('pending');

  // Collect credit modal state
  const [collecting, setCollecting] = useState<AccountReceivable | null>(null);
  const [paymentCurrency, setPaymentCurrency] = useState<'USD' | 'VES'>('USD');
  const [exchangeRate, setExchangeRate] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [processing, setProcessing] = useState(false);
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const status = filter === 'all' ? undefined : filter;
      const data = await fetchAccountsReceivable(status);
      setReceivables(data);
    } catch {
      setError('No se pudieron cargar las cuentas por cobrar.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCollect = async (ar: AccountReceivable) => {
    setCollecting(ar);
    setPaymentCurrency('USD');
    setExchangeRate('');
    setSelectedAccountId('');
    setPaymentMethod('');
    setError('');
    try {
      const accts = await fetchPaymentAccounts();
      setAccounts(accts.filter((a) => a.is_active));
    } catch {
      setAccounts([]);
    }
  };

  const filteredAccounts = accounts.filter((a) => a.currency === paymentCurrency);
  const vesTotal = paymentCurrency === 'VES' && exchangeRate ? (collecting?.total_amount ?? 0) * parseFloat(exchangeRate) : 0;

  const handleConfirmCollect = async () => {
    if (!collecting || !paymentMethod || !selectedAccountId) return;
    if (paymentCurrency === 'VES' && (!exchangeRate || parseFloat(exchangeRate) <= 0)) {
      setError('Ingresa una tasa de cambio válida.');
      return;
    }
    setProcessing(true);
    setError('');
    try {
      const amountPaid = paymentCurrency === 'VES' ? vesTotal : collecting.total_amount;
      await markAccountReceivablePaid(
        collecting.id,
        paymentMethod,
        paymentCurrency,
        paymentCurrency === 'VES' ? parseFloat(exchangeRate) : null,
        amountPaid,
        selectedAccountId
      );
      setSuccessMsg(`Crédito de ${collecting.client_name} cobrado correctamente.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      setCollecting(null);
      await loadData();
    } catch {
      setError('No se pudo procesar el cobro del crédito.');
    } finally {
      setProcessing(false);
    }
  };

  const pendingTotal = receivables.filter((r) => r.status === 'pending').reduce((sum, r) => sum + r.total_amount, 0);

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
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Summary card */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
            <Clock className="h-5 w-5" />
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-800">${pendingTotal.toFixed(2)}</p>
          <p className="mt-1 text-sm text-slate-500">Total pendiente por cobrar</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
            <Wallet className="h-5 w-5" />
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-800">{receivables.filter((r) => r.status === 'pending').length}</p>
          <p className="mt-1 text-sm text-slate-500">Créditos pendientes</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-800">{receivables.filter((r) => r.status === 'paid').length}</p>
          <p className="mt-1 text-sm text-slate-500">Créditos cobrados</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {(['pending', 'paid', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors
              ${filter === f ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            {f === 'pending' ? 'Pendientes' : f === 'paid' ? 'Cobrados' : 'Todos'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : receivables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">
              {filter === 'pending' ? 'No hay créditos pendientes' : filter === 'paid' ? 'No hay créditos cobrados' : 'No hay registros de crédito'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3 text-left">Fecha</th>
                  <th className="px-6 py-3 text-left">Cliente</th>
                  <th className="px-6 py-3 text-left">Mesa</th>
                  <th className="px-6 py-3 text-right">Monto</th>
                  <th className="px-6 py-3 text-center">Estado</th>
                  <th className="px-6 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {receivables.map((ar) => (
                  <tr key={ar.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-3 text-slate-600">
                      {new Date(ar.created_at).toLocaleDateString('es-VE', { dateStyle: 'short' })}
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-700">{ar.client_name}</td>
                    <td className="px-6 py-3 text-slate-600">--</td>
                    <td className="px-6 py-3 text-right font-semibold text-slate-700">${ar.total_amount.toFixed(2)}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium
                        ${ar.status === 'pending' ? 'bg-amber-50 text-amber-700' : ar.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {ar.status === 'pending' ? 'Pendiente' : ar.status === 'paid' ? 'Cobrado' : 'Cancelado'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      {ar.status === 'pending' ? (
                        <button
                          onClick={() => handleOpenCollect(ar)}
                          className="rounded-lg bg-violet-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-700"
                        >
                          Cobrar Crédito
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {ar.paid_at ? new Date(ar.paid_at).toLocaleDateString('es-VE', { dateStyle: 'short' }) : '--'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Collect Credit Modal */}
      {collecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => !processing && setCollecting(null)} aria-hidden="true" />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Cobrar Crédito</h3>
                  <p className="text-xs text-slate-500">{collecting.client_name} · ${collecting.total_amount.toFixed(2)}</p>
                </div>
              </div>
              <button onClick={() => !processing && setCollecting(null)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              {/* Total */}
              <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-sm font-medium text-slate-600">Monto a cobrar</span>
                <span className="text-2xl font-bold text-slate-800">
                  ${collecting.total_amount.toFixed(2)} <span className="text-sm font-medium text-slate-400">USD</span>
                </span>
              </div>

              {/* Currency selector */}
              <label className="mb-2 block text-xs font-medium text-slate-600">Moneda de pago</label>
              <div className="grid grid-cols-2 gap-3">
                {(['USD', 'VES'] as const).map((cur) => {
                  const Icon = cur === 'USD' ? DollarSign : Banknote;
                  const isSelected = paymentCurrency === cur;
                  return (
                    <button
                      key={cur}
                      onClick={() => { setPaymentCurrency(cur); setSelectedAccountId(''); setPaymentMethod(''); }}
                      disabled={processing}
                      className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all
                        ${isSelected
                          ? cur === 'USD' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'border-amber-500 bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}
                        disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      <Icon className="h-4 w-4" />
                      {cur === 'USD' ? 'Dólares' : 'Bolívares'}
                    </button>
                  );
                })}
              </div>

              {/* Exchange rate for VES */}
              {paymentCurrency === 'VES' && (
                <div className="mt-4 rounded-xl bg-amber-50/50 p-4 ring-1 ring-amber-100">
                  <label className="mb-1.5 block text-xs font-medium text-amber-700">Tasa de cambio (Bs/USD)</label>
                  <input
                    type="number"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                    placeholder="Ej. 145.50"
                    step="0.01"
                    min="0"
                    disabled={processing}
                    className="w-full rounded-lg border border-amber-200 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                  />
                  {exchangeRate && parseFloat(exchangeRate) > 0 && (
                    <div className="mt-3 flex items-center justify-between rounded-lg bg-white px-4 py-2.5 ring-1 ring-amber-100">
                      <span className="text-sm font-medium text-slate-600">Total en VES</span>
                      <span className="text-xl font-bold text-amber-700">
                        Bs {vesTotal.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Account selector */}
              <div className="mt-4">
                <label className="mb-2 block text-xs font-medium text-slate-600">Cuenta de destino <span className="text-rose-500">*</span></label>
                {filteredAccounts.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-rose-200 bg-rose-50/50 px-4 py-3 text-center text-xs text-rose-600">
                    No hay cuentas activas para {paymentCurrency}.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filteredAccounts.map((account) => {
                      const isSelected = selectedAccountId === account.id;
                      const Icon = account.currency === 'USD' ? DollarSign : Banknote;
                      return (
                        <button
                          key={account.id}
                          onClick={() => setSelectedAccountId(account.id)}
                          disabled={processing}
                          className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all
                            ${isSelected ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-200' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}
                            disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${account.currency === 'USD' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-800">{account.name}</p>
                            {account.details && <p className="truncate text-xs text-slate-500">{account.details}</p>}
                          </div>
                          {isSelected && <Check className="h-5 w-5 shrink-0 text-violet-600" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Payment method */}
              <div className="mt-4">
                <label className="mb-2 block text-xs font-medium text-slate-600">Método de pago</label>
                <div className="grid grid-cols-2 gap-3">
                  {(paymentCurrency === 'VES'
                    ? [
                        { id: 'pago_movil', label: 'Pago Móvil', icon: Smartphone },
                        { id: 'transferencia', label: 'Transferencia', icon: Landmark },
                        { id: 'tarjeta_ves', label: 'Tarjeta', icon: CreditCard },
                        { id: 'efectivo_ves', label: 'Efectivo', icon: Banknote },
                      ]
                    : [
                        { id: 'efectivo_usd', label: 'Efectivo', icon: Banknote },
                        { id: 'transferencia_usd', label: 'Transferencia', icon: Landmark },
                      ]
                  ).map((method) => {
                    const Icon = method.icon;
                    const isSelected = paymentMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id)}
                        disabled={processing}
                        className={`flex items-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all
                          ${isSelected
                            ? paymentCurrency === 'VES' ? 'border-amber-500 bg-amber-50 text-amber-700 ring-1 ring-amber-200' : 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}
                          disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        <Icon className="h-4 w-4" />
                        {method.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>}

              <div className="mt-5 flex items-center justify-end gap-3">
                <button onClick={() => setCollecting(null)} disabled={processing} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmCollect}
                  disabled={!paymentMethod || !selectedAccountId || processing || (paymentCurrency === 'VES' && (!exchangeRate || parseFloat(exchangeRate) <= 0))}
                  className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-violet-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-violet-400 hover:to-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {processing ? 'Procesando...' : 'Confirmar cobro'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
