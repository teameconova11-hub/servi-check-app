import { supabase } from '@/lib/supabase';

export interface DailyClosure {
  id: string;
  closure_date: string;
  total_usd: number;
  total_ves: number;
  total_diners: number;
  total_orders: number;
  accounts_breakdown: Record<string, number> | null;
  closed_by: string | null;
  created_at: string;
}

export async function fetchDailyClosures(): Promise<DailyClosure[]> {
  const { data, error } = await supabase
    .from('daily_closures')
    .select('id, closure_date, total_usd, total_ves, total_diners, total_orders, accounts_breakdown, closed_by, created_at')
    .order('closure_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DailyClosure[];
}

export async function fetchClosureByDate(date: string): Promise<DailyClosure | null> {
  const { data, error } = await supabase
    .from('daily_closures')
    .select('id, closure_date, total_usd, total_ves, total_diners, total_orders, accounts_breakdown, closed_by, created_at')
    .eq('closure_date', date)
    .maybeSingle();
  if (error) throw error;
  return data as DailyClosure | null;
}

export interface CreateClosureInput {
  closure_date: string;
  total_usd: number;
  total_ves: number;
  total_diners: number;
  total_orders: number;
  accounts_breakdown: Record<string, number>;
  closed_by: string;
}

export async function createDailyClosure(input: CreateClosureInput): Promise<DailyClosure> {
  const { data, error } = await supabase
    .from('daily_closures')
    .insert({
      closure_date: input.closure_date,
      total_usd: input.total_usd,
      total_ves: input.total_ves,
      total_diners: input.total_diners,
      total_orders: input.total_orders,
      accounts_breakdown: input.accounts_breakdown,
      closed_by: input.closed_by,
    })
    .select('id, closure_date, total_usd, total_ves, total_diners, total_orders, accounts_breakdown, closed_by, created_at')
    .single();
  if (error) throw error;
  return data as DailyClosure;
}
