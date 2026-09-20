import { useState, useEffect, useCallback } from 'react';
import {
  X,
  DollarSign,
  Banknote,
  CreditCard,
  Smartphone,
  ArrowLeftRight,
  Loader2,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  fetchPaymentAccounts,
  type PaymentAccount,
} from '@/lib/paymentAccountsDb';
import {
  payAndCloseOrderWithSplits,
  processCreditSale,
  type SplitPaymentLine,
} from '@/lib/orderDb';

export interface SplitPaymentContext {
  orderId: string;
  customerName: string;
  tableLabel: string;
  finalAmount: number;
  discountPercentage: number;
  subtotal: number;
  isExternal: boolean;
}

interface PaymentLine {
  id: string;
  currency: 'USD' | 'VES';
  method: string;
  accountId: string;
  amount: string;
}

const methodOptions = [
  { key: 'cash', label: 'Efectivo', Icon: Banknote },
  { key: 'transfer', label: 'Transferencia', Icon: ArrowLeftRight },
  { key: 'card', label: 'Tarjeta', Icon: CreditCard },
  { key: 'zelle', label: 'Zelle', Icon: Smartphone },
  { key: 'pago_movil', label: 'Pago Móvil', Icon: Smartphone },
  { key: 'binance', label: 'Binance', Icon: CreditCard },
];

let lineIdCounter = 0;
const genLineId = () => `line-${++lineIdCounter}`;

export default function SplitPaymentModal({
  ctx,
  onClose,
  onPaid,
}: {
  ctx: SplitPaymentContext;
  onClose: () => void;
  onPaid: () => void;
}) {
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [exchangeRate, setExchangeRate] = useState('');
  const [lines, setLines] = useState<PaymentLine[]>([
    { id: genLineId(), currency: 'USD', method: '', accountId: '', amount: '' },
  ]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [isCreditMode, setCreditMode] = useState(false);

  const loadAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    try {
      const accts = await fetchPaymentAccounts();
      setAccounts(accts.filter((a) => a.is_active));
    } catch {
      setAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const rate = exchangeRate ? parseFloat(exchangeRate) || 0 : 0;

  const lineUsdAmount = (line: PaymentLine): number => {
    const amt = parseFloat(line.amount) || 0;
    if (line.currency === 'VES') {
      if (!rate || rate <= 0) return 0;
      return amt / rate;
    }
    return amt;
  };

  const totalPaidUsd = lines.reduce((sum, l) => sum + lineUsdAmount(l), 0);
  const remaining = ctx.finalAmount - totalPaidUsd;
  const isExact = Math.abs(remaining) < 0.005;

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { id: genLineId(), currency: 'USD', method: '', accountId: '', amount: '' },
    ]);
  };

  const removeLine = (id: string) => {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  };

  const updateLine = (id: string, field: keyof PaymentLine, value: string) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } as PaymentLine : l))
    );
  };

  const filteredAccountsForLine = (line: PaymentLine) =>
    accounts.filter((a) => a.currency === line.currency);

  const validateLines = (): string | null => {
    for (const line of lines) {
      const amt = parseFloat(line.amount) || 0;
      if (amt <= 0) return 'Cada abono debe tener un monto mayor a 0.';
      if (!line.method) return 'Selecciona un método de pago en cada abono.';
      if (!line.accountId) return 'Selecciona una cuenta de destino en cada abono.';
      if (line.currency === 'VES' && (!rate || rate <= 0))
        return 'Ingresa una tasa de cambio válida para los abonos en VES.';
    }
    return null;
  };

  const handleConfirm = async () => {
    if (isCreditMode) {
      setProcessing(true);
      setError('');
      try {
        await processCreditSale(ctx.orderId, {
          customerName: ctx.customerName,
          tableNumber: ctx.tableLabel,
          amount: ctx.finalAmount,
          discountPercentage: ctx.discountPercentage,
        });
        onPaid();
      } catch (err) {
        setError(`No se pudo registrar la venta a crédito: ${(err as Error).message}`);
      } finally {
        setProcessing(false);
      }
      return;
    }

    const validationError = validateLines();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!isExact) {
      setError(
        remaining > 0
          ? `Faltan $${remaining.toFixed(2)} USD para completar el pago.`
          : `Te has excedido por $${Math.abs(remaining).toFixed(2)} USD. Ajusta los montos.`
      );
      return;
    }

    setProcessing(true);
    setError('');
    try {
      const splitLines: SplitPaymentLine[] = lines.map((l) => {
        const amt = parseFloat(l.amount) || 0;
        return {
          currency: l.currency,
          paymentMethod: l.method,
          paymentAccountId: l.accountId,
          amount: amt,
          amountUsd: lineUsdAmount(l),
          exchangeRate: l.currency === 'VES' ? rate : null,
        };
      });

      await payAndCloseOrderWithSplits(
        ctx.orderId,
        {
          discountPercentage: ctx.discountPercentage,
          finalAmount: ctx.finalAmount,
          totalAmountUsd: totalPaidUsd,
        },
        splitLines
      );
      onPaid();
    } catch (err) {
      setError(`No se pudo procesar el pago: ${(err as Error).message}`);
    } finally {
      setProcessing(false);
    }
  };

  const canConfirm = isCreditMode || (isExact && lines.every((l) => l.method && l.accountId && parseFloat(l.amount) > 0));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => !processing && onClose()} aria-hidden="true" />
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Pago Mixto / Fraccionado</h3>
              <p className="text-xs text-slate-500">
                {ctx.tableLabel} · {ctx.customerName}
              </p>
            </div>
          </div>
          <button
            onClick={() => !processing && onClose()}
            disabled={processing}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Summary bar */}
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-center">
              <p className="text-xs font-medium text-slate-500">Total a cobrar</p>
              <p className="mt-1 text-lg font-bold text-slate-800">${ctx.finalAmount.toFixed(2)}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center">
              <p className="text-xs font-medium text-emerald-600">Abonado</p>
              <p className="mt-1 text-lg font-bold text-emerald-700">${totalPaidUsd.toFixed(2)}</p>
            </div>
            <div className={`rounded-xl px-4 py-3 text-center ${isExact ? 'bg-emerald-100' : remaining > 0 ? 'bg-amber-50' : 'bg-rose-50'}`}>
              <p className={`text-xs font-medium ${isExact ? 'text-emerald-700' : remaining > 0 ? 'text-amber-700' : 'text-rose-700'}`}>
                {isExact ? 'Completo' : 'Restante'}
              </p>
              <p className={`mt-1 text-lg font-bold ${isExact ? 'text-emerald-700' : remaining > 0 ? 'text-amber-700' : 'text-rose-700'}`}>
                ${Math.abs(remaining).toFixed(2)}
              </p>
            </div>
          </div>

          {ctx.discountPercentage > 0 && (
            <div className="mb-3 flex items-center justify-between rounded-lg bg-amber-50/60 px-3 py-1.5 text-xs text-amber-700">
              <span>Incluye {ctx.discountPercentage.toFixed(2)}% de descuento</span>
              <span>Subtotal: ${ctx.subtotal.toFixed(2)}</span>
            </div>
          )}

          {/* Credit mode toggle */}
          <div className="mb-4">
            <label className="mb-2 block text-xs font-medium text-slate-600">Tipo de transacción</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setCreditMode(false)}
                disabled={processing}
                className={`flex items-center justify-center gap-1.5 rounded-xl border-2 px-3 py-3 text-sm font-medium transition-all
                  ${!isCreditMode
                    ? 'border-amber-500 bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                <CreditCard className="h-4 w-4" />
                Pago Mixto
              </button>
              <button
                onClick={() => setCreditMode(true)}
                disabled={processing}
                className={`flex items-center justify-center gap-1.5 rounded-xl border-2 px-3 py-3 text-sm font-medium transition-all
                  ${isCreditMode
                    ? 'border-violet-500 bg-violet-50 text-violet-700 ring-1 ring-violet-200'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                <DollarSign className="h-4 w-4" />
                Venta a Crédito
              </button>
            </div>
          </div>

          {isCreditMode ? (
            <div className="rounded-xl border-2 border-violet-200 bg-violet-50/50 p-4">
              <div className="flex items-center gap-2 text-violet-700">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-semibold">Venta a Crédito</span>
              </div>
              <p className="mt-1.5 text-xs text-violet-600">
                El monto de <strong>${ctx.finalAmount.toFixed(2)}</strong> se registrará en cuentas por cobrar a nombre de <strong>{ctx.customerName}</strong> y el pedido se cerrará inmediatamente.
              </p>
            </div>
          ) : (
            <>
              {/* Exchange rate (shared for all VES lines) */}
              <div className="mb-4 rounded-xl bg-amber-50/50 p-4 ring-1 ring-amber-100">
                <label className="mb-1.5 block text-xs font-medium text-amber-700">
                  Tasa de cambio del día (Bs/USD) — aplica a todos los abonos en VES
                </label>
                <input
                  type="number"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  placeholder="Ej. 145.50"
                  step="0.01"
                  min="0"
                  disabled={processing || !lines.some((l) => l.currency === 'VES')}
                  className="w-full rounded-lg border border-amber-200 bg-white px-4 py-2.5 text-sm text-slate-800 transition-colors placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 disabled:opacity-60"
                />
              </div>

              {/* Payment lines */}
              <div className="space-y-3">
                {lines.map((line, idx) => {
                  const acctOptions = filteredAccountsForLine(line);
                  const usdEq = lineUsdAmount(line);
                  return (
                    <div key={line.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
                            {idx + 1}
                          </span>
                          Abono #{idx + 1}
                        </span>
                        {lines.length > 1 && (
                          <button
                            onClick={() => removeLine(line.id)}
                            disabled={processing}
                            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-rose-500 transition-colors hover:bg-rose-50 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Quitar
                          </button>
                        )}
                      </div>

                      {/* Currency selector */}
                      <div className="mb-3 grid grid-cols-2 gap-2">
                        {(['USD', 'VES'] as const).map((cur) => {
                          const Icon = cur === 'USD' ? DollarSign : Banknote;
                          return (
                            <button
                              key={cur}
                              onClick={() => {
                                updateLine(line.id, 'currency', cur);
                                updateLine(line.id, 'accountId', '');
                                updateLine(line.id, 'method', '');
                              }}
                              disabled={processing}
                              className={`flex items-center justify-center gap-1.5 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all
                                ${line.currency === cur
                                  ? cur === 'USD'
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                    : 'border-amber-500 bg-amber-50 text-amber-700'
                                  : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {cur}
                            </button>
                          );
                        })}
                      </div>

                      {/* Amount input */}
                      <div className="mb-3">
                        <label className="mb-1 block text-xs font-medium text-slate-500">
                          Monto {line.currency === 'VES' ? '(Bs)' : '(USD)'}
                        </label>
                        <input
                          type="number"
                          value={line.amount}
                          onChange={(e) => updateLine(line.id, 'amount', e.target.value)}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          disabled={processing}
                          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-right text-sm font-semibold text-slate-800 transition-colors focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                        />
                        {line.currency === 'VES' && parseFloat(line.amount) > 0 && rate > 0 && (
                          <p className="mt-1 text-right text-xs text-slate-400">
                            Equivalente: ${usdEq.toFixed(2)} USD
                          </p>
                        )}
                      </div>

                      {/* Account selector */}
                      <div className="mb-3">
                        <label className="mb-1 block text-xs font-medium text-slate-500">
                          Cuenta de destino
                        </label>
                        {loadingAccounts ? (
                          <div className="flex items-center justify-center rounded-lg border border-slate-200 py-3">
                            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                          </div>
                        ) : acctOptions.length === 0 ? (
                          <p className="rounded-lg border border-dashed border-rose-200 bg-rose-50/50 px-3 py-2 text-xs text-rose-600">
                            No hay cuentas activas en {line.currency}.
                          </p>
                        ) : (
                          <select
                            value={line.accountId}
                            onChange={(e) => updateLine(line.id, 'accountId', e.target.value)}
                            disabled={processing}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 transition-colors focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                          >
                            <option value="">Selecciona una cuenta...</option>
                            {acctOptions.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name} {a.details ? `· ${a.details}` : ''}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Method selector */}
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500">
                          Método de pago
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {methodOptions.map(({ key, label, Icon }) => {
                            const isSelected = line.method === key;
                            return (
                              <button
                                key={key}
                                onClick={() => updateLine(line.id, 'method', key)}
                                disabled={processing}
                                className={`flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium transition-all
                                  ${isSelected
                                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
                              >
                                <Icon className="h-3 w-3" />
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add line button */}
              <button
                onClick={addLine}
                disabled={processing}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 py-3 text-sm font-medium text-slate-500 transition-colors hover:border-amber-300 hover:bg-amber-50/50 hover:text-amber-600 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Agregar otro abono
              </button>
            </>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
          <button
            onClick={() => !processing && onClose()}
            disabled={processing}
            className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || processing}
            className={`flex items-center gap-1.5 rounded-lg px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-50
              ${isCreditMode
                ? 'bg-gradient-to-r from-violet-500 to-violet-700 hover:from-violet-400 hover:to-violet-600'
                : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500'}`}
          >
            {processing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isCreditMode ? (
              <DollarSign className="h-4 w-4" />
            ) : isExact ? (
              <Check className="h-4 w-4" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            {processing
              ? 'Procesando...'
              : isCreditMode
                ? 'Registrar crédito y cerrar'
                : isExact
                  ? 'Procesar Pago y Liberar'
                  : 'Procesar Pago'}
          </button>
        </div>
      </div>
    </div>
  );
}
