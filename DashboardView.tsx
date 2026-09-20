import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  DollarSign,
  Users,
  Receipt,
  Clock,
  X,
  Loader2,
  Wallet,
  Banknote,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fetchPaymentAccounts, type PaymentAccount } from '@/lib/paymentAccountsDb';
import { fetchDailyClosures, createDailyClosure, type DailyClosure } from '@/lib/dailyClosuresDb';

interface DailyOrder {
  id: string;
  table_id: string | null;
  customer_name: string;
  party_size: number;
  status: string;
  payment_method: string | null;
  payment_currency: string | null;
  exchange_rate: number | null;
  amount_paid: number | null;
  final_amount: number | null;
  discount_percentage: number | null;
  payment_account_id: string | null;
  paid_at: string | null;
  order_type: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
}

interface OrderPaymentLine {
  id: string;
  order_id: string;
  currency: string;
  payment_method: string;
  payment_account_id: string | null;
  amount: number;
  amount_usd: number;
  exchange_rate: number | null;
  created_at: string;
}

interface TableInfo {
  id: string;
  table_number: string;
}

const methodLabels: Record<string, string> = {
  pago_movil: 'Pago Móvil',
  transferencia: 'Transferencia',
  tarjeta_ves: 'Tarjeta',
  efectivo_ves: 'Efectivo',
  efectivo_usd: 'Efectivo',
  transferencia_usd: 'Transferencia',
  zelle: 'Zelle',
  credit: 'Venta a Crédito',
  split: 'Pago Mixto',
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
  binance: 'Binance',
};

export default function DashboardView({ userEmail }: { userEmail?: string }) {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<DailyOrder[]>([]);
  const [paymentLines, setPaymentLines] = useState<OrderPaymentLine[]>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [closures, setClosures] = useState<DailyClosure[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<PaymentAccount | null>(null);
  const [closingDay, setClosingDay] = useState(false);
  const [closureMsg, setClosureMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const today = new Date().toISOString().slice(0, 10);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [paidOrdersRes, allTablesRes, accts, cls, splitRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id, table_id, customer_name, party_size, status, payment_method, payment_currency, exchange_rate, amount_paid, final_amount, discount_percentage, payment_account_id, paid_at, order_type, customer_phone, delivery_address')
          .eq('status', 'paid')
          .gte('paid_at', `${today}T00:00:00`)
          .lte('paid_at', `${today}T23:59:59`)
          .order('paid_at', { ascending: false }),
        supabase.from('tables').select('id, table_number'),
        fetchPaymentAccounts(),
        fetchDailyClosures(),
        supabase
          .from('order_payments')
          .select('id, order_id, currency, payment_method, payment_account_id, amount, amount_usd, exchange_rate, created_at')
          .gte('created_at', `${today}T00:00:00`)
          .lte('created_at', `${today}T23:59:59`)
          .order('created_at', { ascending: false }),
      ]);

      if (paidOrdersRes.error) {
        console.error('[Dashboard] orders query error:', paidOrdersRes.error.message, paidOrdersRes.error.details);
        throw new Error(`orders: ${paidOrdersRes.error.message}`);
      }
      if (allTablesRes.error) {
        console.error('[Dashboard] tables query error:', allTablesRes.error.message);
        throw new Error(`tables: ${allTablesRes.error.message}`);
      }
      if (splitRes.error) {
        console.error('[Dashboard] order_payments query error:', splitRes.error.message);
      }

      setOrders((paidOrdersRes.data ?? []) as DailyOrder[]);
      setPaymentLines((splitRes.data ?? []) as OrderPaymentLine[]);
      setTables((allTablesRes.data ?? []) as TableInfo[]);
      setAccounts(accts.filter((a) => a.is_active));
      setClosures(cls);
    } catch (err) {
      console.error('[Dashboard] loadData error:', err);
      setErrorMsg(`Error al cargar datos: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time subscription: refresh when orders change
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Compute KPIs from today's paid orders
  const dailyOrders = orders;
  const totalDiners = dailyOrders.reduce((sum, o) => sum + (o.party_size || 0), 0);
  const totalOrders = dailyOrders.length;

  // Credit sales are excluded from all financial totals — they only count as income
  // when the admin collects them from the Accounts Receivable module.
  const isCredit = (o: DailyOrder) => o.payment_method === 'credit';
  const isSplit = (o: DailyOrder) => o.payment_method === 'split';
  const revenueOrders = dailyOrders.filter((o) => !isCredit(o));
  const splitOrders = revenueOrders.filter(isSplit);
  const nonSplitRevenueOrders = revenueOrders.filter((o) => !isSplit(o));

  // Split payment lines for today (USD and VES amounts per account)
  const splitLinesToday = paymentLines;
  const splitUSD = splitLinesToday.reduce((sum, l) => sum + (l.amount_usd || 0), 0);
  const splitVES = splitLinesToday
    .filter((l) => l.currency === 'VES')
    .reduce((sum, l) => sum + (l.amount || 0), 0);

  // USD total: non-split USD payments + split lines (already in USD)
  const totalUSD = nonSplitRevenueOrders
    .filter((o) => o.payment_currency === 'USD')
    .reduce((sum, o) => sum + (o.amount_paid || 0), 0) + splitUSD;

  // VES total: non-split VES payments + split VES lines
  const totalVesAll = nonSplitRevenueOrders
    .filter((o) => o.payment_currency === 'VES')
    .reduce((sum, o) => sum + (o.amount_paid || 0), 0) + splitVES;

  // Average ticket reflects total billed (including credit sales, valued in USD via final_amount)
  const creditUSD = dailyOrders
    .filter(isCredit)
    .reduce((sum, o) => sum + (o.final_amount || 0), 0);
  const avgTicket = totalOrders > 0 ? (totalUSD + creditUSD) / totalOrders : 0;

  // Per-account totals (today) — excludes credit sales (they have no account)
  // For split payments, each line is attributed to its own payment_account_id
  const accountTotals = accounts.map((acct) => {
    const acctOrders = nonSplitRevenueOrders.filter((o) => o.payment_account_id === acct.id);
    const acctSplitLines = splitLinesToday.filter((l) => l.payment_account_id === acct.id);
    const usdTotal = acctOrders
      .filter((o) => o.payment_currency === 'USD')
      .reduce((sum, o) => sum + (o.amount_paid || 0), 0)
      + acctSplitLines.filter((l) => l.currency === 'USD').reduce((sum, l) => sum + (l.amount || 0), 0);
    const vesTotal = acctOrders
      .filter((o) => o.payment_currency === 'VES')
      .reduce((sum, o) => sum + (o.amount_paid || 0), 0)
      + acctSplitLines.filter((l) => l.currency === 'VES').reduce((sum, l) => sum + (l.amount || 0), 0);
    const orderCount = acctOrders.length + acctSplitLines.length;
    return { account: acct, usdTotal, vesTotal, orderCount, orders: acctOrders, splitLines: acctSplitLines };
  });

  const kpis = [
    {
      label: 'Ingresos del día (USD)',
      value: `$${totalUSD.toFixed(2)}`,
      icon: DollarSign,
      accent: 'emerald' as const,
    },
    {
      label: 'Ingresos del día (VES)',
      value: `Bs ${totalVesAll.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: Banknote,
      accent: 'amber' as const,
    },
    {
      label: 'Comensales atendidos',
      value: String(totalDiners),
      icon: Users,
      accent: 'sky' as const,
    },
    {
      label: 'Ticket promedio',
      value: `$${avgTicket.toFixed(2)}`,
      icon: Receipt,
      accent: 'violet' as const,
    },
  ];

  const accentMap: Record<string, { bg: string; text: string; ring: string }> = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-100' },
    sky: { bg: 'bg-sky-50', text: 'text-sky-600', ring: 'ring-sky-100' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-600', ring: 'ring-violet-100' },
  };

  const tableLabel = (order: DailyOrder) => {
    if (order.order_type === 'delivery') return 'Delivery';
    if (order.order_type === 'pickup') return 'Retirar';
    return tables.find((t) => t.id === order.table_id)?.table_number ?? '?';
  };

  const alreadyClosedToday = closures.some((c) => c.closure_date === today);

  const handleCloseDay = async () => {
    setClosingDay(true);
    setClosureMsg('');
    try {
      const breakdown: Record<string, number> = {};
      accountTotals.forEach((at) => {
        breakdown[at.account.name] = at.usdTotal;
      });
      await createDailyClosure({
        closure_date: today,
        total_usd: totalUSD,
        total_ves: totalVesAll,
        total_diners: totalDiners,
        total_orders: totalOrders,
        accounts_breakdown: breakdown,
        closed_by: userEmail ?? 'admin',
      });
      setClosureMsg('Cierre diario guardado correctamente. Las cuentas se reinician para mañana.');
      await loadData();
    } catch {
      setClosureMsg('Error: ya existe un cierre para hoy o no se pudo guardar.');
    } finally {
      setClosingDay(false);
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
    <div className="space-y-6">
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMsg}
          <button onClick={() => setErrorMsg('')} className="ml-auto text-rose-400 hover:text-rose-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {closureMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {closureMsg}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const accent = accentMap[kpi.accent];
          return (
            <div key={kpi.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent.bg} ${accent.text} ring-1 ${accent.ring}`}>
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Hoy
                </span>
              </div>
              <p className="mt-4 text-2xl font-bold text-slate-800">{kpi.value}</p>
              <p className="mt-1 text-sm text-slate-500">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      {/* Financial Account Cards */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Cuentas financieras del día</h3>
          <span className="text-xs text-slate-500">{today}</span>
        </div>
        {accounts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-8 text-center">
            <Wallet className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">No hay cuentas activas configuradas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {accountTotals.map(({ account, usdTotal, vesTotal, orderCount }) => {
              const Icon = account.currency === 'USD' ? DollarSign : Banknote;
              const total = account.currency === 'USD' ? usdTotal : vesTotal;
              return (
                <button
                  key={account.id}
                  onClick={() => setSelectedAccount(account)}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:shadow-md hover:border-slate-300"
                >
                  <div className="flex items-start justify-between">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${account.currency === 'USD' ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100' : 'bg-amber-50 text-amber-600 ring-1 ring-amber-100'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                      {orderCount} {orderCount === 1 ? 'transacción' : 'transacciones'}
                    </span>
                  </div>
                  <p className="mt-4 text-2xl font-bold text-slate-800">
                    {account.currency === 'USD' ? `$${total.toFixed(2)}` : `Bs ${total.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{account.name}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{account.currency} · Click para ver detalle</p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Daily Movements Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Movimientos del día</h3>
            <p className="text-xs text-slate-500">Órdenes pagadas en tiempo real</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {revenueOrders.length} {revenueOrders.length === 1 ? 'cobrada' : 'cobradas'}
            </span>
            {dailyOrders.some((o) => o.payment_method === 'credit') && (
              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                {dailyOrders.filter((o) => o.payment_method === 'credit').length} a crédito
              </span>
            )}
          </div>
        </div>
        {dailyOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Receipt className="h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">No hay movimientos registrados hoy</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3 text-left">Hora</th>
                  <th className="px-6 py-3 text-left">Mesa</th>
                  <th className="px-6 py-3 text-left">Cliente</th>
                  <th className="px-6 py-3 text-left">Método</th>
                  <th className="px-6 py-3 text-left">Moneda</th>
                  <th className="px-6 py-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {dailyOrders.map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-3 text-slate-600">
                      {order.paid_at ? new Date(order.paid_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }) : '--'}
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-700">{tableLabel(order)}</td>
                    <td className="px-6 py-3 text-slate-600">{order.customer_name}</td>
                    <td className="px-6 py-3 text-slate-600">
                      {order.payment_method ? (methodLabels[order.payment_method] ?? order.payment_method) : '--'}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${order.payment_currency === 'USD' ? 'bg-emerald-50 text-emerald-700' : order.payment_currency === 'VES' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                        {order.payment_currency ?? '--'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-slate-700">
                      {order.payment_method === 'credit' ? (
                        <span className="text-violet-600">$0.00 <span className="text-xs font-normal text-slate-400">(crédito)</span></span>
                      ) : order.payment_method === 'split' ? (
                        <span className="text-slate-700">${(order.final_amount ?? 0).toFixed(2)} <span className="text-xs font-normal text-slate-400">(mixto)</span></span>
                      ) : order.payment_currency === 'VES'
                        ? `Bs ${(order.amount_paid ?? 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : `${(order.amount_paid ?? 0).toFixed(2)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Daily Closure Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Cierre diario</h3>
            <p className="text-xs text-slate-500">
              {alreadyClosedToday
                ? `La jornada de hoy ya fue cerrada. Totales congelados.`
                : 'Ejecuta el cierre para congelar los totales y reiniciar las cuentas mañana.'}
            </p>
          </div>
          <button
            onClick={handleCloseDay}
            disabled={closingDay || alreadyClosedToday}
            className={`flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50
              ${alreadyClosedToday
                ? 'bg-slate-100 text-slate-400'
                : 'bg-gradient-to-r from-slate-800 to-slate-900 text-white hover:from-slate-700 hover:to-slate-800'}`}
          >
            {closingDay ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
            {alreadyClosedToday ? 'Cierre completado' : 'Cerrar jornada'}
          </button>
        </div>
      </div>

      {/* Account Detail Modal */}
      {selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setSelectedAccount(null)} aria-hidden="true" />
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${selectedAccount.currency === 'USD' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                  {selectedAccount.currency === 'USD' ? <DollarSign className="h-5 w-5" /> : <Banknote className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">{selectedAccount.name}</h3>
                  <p className="text-xs text-slate-500">Detalle de ingresos del día · {selectedAccount.currency}</p>
                </div>
              </div>
              <button onClick={() => setSelectedAccount(null)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
              {(() => {
                const acctOrders = dailyOrders.filter((o) => o.payment_account_id === selectedAccount.id && o.payment_method !== 'credit' && o.payment_method !== 'split');
                const acctSplitLines = splitLinesToday.filter((l) => l.payment_account_id === selectedAccount.id);
                const acctTotal = acctOrders.reduce((sum, o) => sum + (o.amount_paid || 0), 0)
                  + acctSplitLines.filter((l) => l.currency === selectedAccount.currency).reduce((sum, l) => sum + (l.amount || 0), 0);
                if (acctOrders.length === 0 && acctSplitLines.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Receipt className="h-8 w-8 text-slate-300" />
                      <p className="mt-2 text-sm text-slate-500">Esta cuenta no recibió ingresos hoy</p>
                    </div>
                  );
                }
                return (
                  <>
                    <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                      <span className="text-sm font-medium text-slate-600">Total recibido</span>
                      <span className="text-xl font-bold text-slate-800">
                        {selectedAccount.currency === 'USD' ? `${acctTotal.toFixed(2)}` : `Bs ${acctTotal.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {acctOrders.map((order) => (
                        <div key={order.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-700">
                              {order.order_type === 'delivery' ? 'Delivery' : order.order_type === 'pickup' ? 'Retirar' : `Mesa ${tableLabel(order)}`} · {order.customer_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {order.paid_at ? new Date(order.paid_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }) : '--'}
                              {' · '}
                              {order.payment_method ? (methodLabels[order.payment_method] ?? order.payment_method) : '--'}
                              {(order.discount_percentage ?? 0) > 0 && ` · Desc: ${order.discount_percentage}%`}
                            </p>
                          </div>
                          <span className="text-sm font-bold text-slate-700">
                            {selectedAccount.currency === 'USD' ? `${(order.amount_paid ?? 0).toFixed(2)}` : `Bs ${(order.amount_paid ?? 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          </span>
                        </div>
                      ))}
                      {acctSplitLines.map((line) => {
                        const parentOrder = dailyOrders.find((o) => o.id === line.order_id);
                        return (
                          <div key={line.id} className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50/40 px-4 py-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-700">
                                {parentOrder ? (parentOrder.order_type === 'delivery' ? 'Delivery' : parentOrder.order_type === 'pickup' ? 'Retirar' : `Mesa ${tableLabel(parentOrder)}`) : 'Pedido'} · {parentOrder?.customer_name ?? '--'}
                                <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">Mixto</span>
                              </p>
                              <p className="text-xs text-slate-500">
                                {line.created_at ? new Date(line.created_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }) : '--'}
                                {' · '}
                                {methodLabels[line.payment_method] ?? line.payment_method}
                                {line.exchange_rate ? ` · Tasa: ${line.exchange_rate}` : ''}
                              </p>
                            </div>
                            <span className="text-sm font-bold text-slate-700">
                              {selectedAccount.currency === 'USD' ? `${(line.amount ?? 0).toFixed(2)}` : `Bs ${(line.amount ?? 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
