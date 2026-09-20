import { supabase } from '@/lib/supabase';

export interface AccountReceivable {
  id: string;
  order_id: string;
  client_name: string;
  total_amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  created_at: string;
  paid_at: string | null;
}

export async function fetchAccountsReceivable(status?: 'pending' | 'paid' | 'cancelled'): Promise<AccountReceivable[]> {
  let query = supabase
    .from('accounts_receivable')
    .select('id, order_id, client_name, total_amount, status, created_at, paid_at')
    .order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as AccountReceivable[];
}

export async function markAccountReceivablePaid(
  id: string,
  paymentMethod: string,
  paymentCurrency: 'USD' | 'VES',
  exchangeRate: number | null,
  amountPaid: number,
  paymentAccountId: string | null
): Promise<void> {
  const { error } = await supabase
    .from('accounts_receivable')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_method: paymentMethod,
      currency: paymentCurrency,
    })
    .eq('id', id);
  if (error) throw error;

  const { data: ar } = await supabase
    .from('accounts_receivable')
    .select('order_id')
    .eq('id', id)
    .single();
  if (ar) {
    await supabase
      .from('orders')
      .update({
        payment_method: paymentMethod,
        payment_currency: paymentCurrency,
        exchange_rate: exchangeRate,
        amount_paid: amountPaid,
        payment_account_id: paymentAccountId,
      })
      .eq('id', (ar as { order_id: string }).order_id);
  }
}
