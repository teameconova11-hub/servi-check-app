import { supabase } from '@/lib/supabase';

export interface Terraza {
  id: string;
  name: string;
  description: string | null;
}

export interface Mesa {
  id: string;
  terrace_id: string;
  table_number: string;
  capacity: number;
  is_active: boolean;
}

export async function fetchTerrazas(): Promise<Terraza[]> {
  const { data, error } = await supabase
    .from('terraces')
    .select('id, name, description')
    .order('name');
  if (error) throw error;
  return data as Terraza[];
}

export async function fetchMesas(terrazaId: string): Promise<Mesa[]> {
  const { data, error } = await supabase
    .from('tables')
    .select('id, terrace_id, table_number, capacity, is_active')
    .eq('terrace_id', terrazaId)
    .order('table_number');
  if (error) throw error;
  return data as Mesa[];
}

export async function createTerraza(name: string): Promise<Terraza> {
  const { data, error } = await supabase
    .from('terraces')
    .insert({ name })
    .select('id, name, description')
    .single();
  if (error) throw error;
  return data as Terraza;
}

export async function createMesa(terrazaId: string, number: number, seats: number): Promise<Mesa> {
  const { data, error } = await supabase
    .from('tables')
    .insert({
      terrace_id: terrazaId,
      table_number: String(number),
      capacity: seats,
      is_active: true,
    })
    .select('id, terrace_id, table_number, capacity, is_active')
    .single();
  if (error) throw error;
  return data as Mesa;
}

export async function toggleMesaEnabled(id: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from('tables')
    .update({ is_active: enabled })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteMesa(id: string): Promise<void> {
  const { error } = await supabase
    .from('tables')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
