import { supabase } from '@/lib/supabase';

export interface PaymentAccount {
  id: string;
  name: string;
  currency: 'USD' | 'VES';
  details: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type PaymentAccountInput = {
  name: string;
  currency: 'USD' | 'VES';
  details: string;
  is_active: boolean;
};

export async function fetchPaymentAccounts(): Promise<PaymentAccount[]> {
  const { data, error } = await supabase
    .from('payment_accounts')
    .select('id, name, currency, details, is_active, created_at, updated_at')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PaymentAccount[];
}

export async function createPaymentAccount(input: PaymentAccountInput): Promise<PaymentAccount> {
  const { data, error } = await supabase
    .from('payment_accounts')
    .insert({
      name: input.name,
      currency: input.currency,
      details: input.details,
      is_active: input.is_active,
    })
    .select('id, name, currency, details, is_active, created_at, updated_at')
    .maybeSingle();
  if (error) {
    const detail = `[${error.code ?? 'unknown'}] ${error.message}${error.details ? ' — ' + String(error.details) : ''}`;
    console.error('[payment_accounts] Insert failed:', detail, error.hint);
    throw new Error(detail);
  }
  if (!data) {
    const msg = 'La inserción no devolvió datos. Posible bloqueo de RLS: verifica que tu usuario tenga role=admin en profiles.';
    console.error('[payment_accounts] Insert returned no data — RLS may have blocked the row.');
    throw new Error(msg);
  }
  return data as PaymentAccount;
}

export async function updatePaymentAccount(
  id: string,
  input: PaymentAccountInput
): Promise<PaymentAccount> {
  const { data, error } = await supabase
    .from('payment_accounts')
    .update({
      name: input.name,
      currency: input.currency,
      details: input.details,
      is_active: input.is_active,
    })
    .eq('id', id)
    .select('id, name, currency, details, is_active, created_at, updated_at')
    .maybeSingle();
  if (error) {
    const detail = `[${error.code ?? 'unknown'}] ${error.message}${error.details ? ' — ' + String(error.details) : ''}`;
    console.error('[payment_accounts] Update failed:', detail, error.hint);
    throw new Error(detail);
  }
  if (!data) {
    const msg = 'La actualización no devolvió datos. Posible bloqueo de RLS.';
    console.error('[payment_accounts] Update returned no data — RLS may have blocked the row.');
    throw new Error(msg);
  }
  return data as PaymentAccount;
}

export async function deletePaymentAccount(id: string): Promise<void> {
  const { error } = await supabase
    .from('payment_accounts')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
