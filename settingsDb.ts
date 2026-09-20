import { supabase } from '@/lib/supabase';

export interface RestaurantSettings {
  id: string;
  name: string;
  rif: string;
  phone: string;
  address: string;
  updated_at: string;
}

export async function fetchRestaurantSettings(): Promise<RestaurantSettings | null> {
  const { data, error } = await supabase
    .from('restaurant_settings')
    .select('id, name, rif, phone, address, updated_at')
    .maybeSingle();
  if (error) throw error;
  return data as RestaurantSettings | null;
}

export async function upsertRestaurantSettings(
  values: { name: string; rif: string; phone: string; address: string }
): Promise<RestaurantSettings> {
  // Try to fetch existing row first
  const existing = await fetchRestaurantSettings();

  if (existing) {
    const { data, error } = await supabase
      .from('restaurant_settings')
      .update({ name: values.name, rif: values.rif, phone: values.phone, address: values.address })
      .eq('id', existing.id)
      .select('id, name, rif, phone, address, updated_at')
      .single();
    if (error) throw error;
    return data as RestaurantSettings;
  }

  const { data, error } = await supabase
    .from('restaurant_settings')
    .insert({ name: values.name, rif: values.rif, phone: values.phone, address: values.address })
    .select('id, name, rif, phone, address, updated_at')
    .single();
  if (error) throw error;
  return data as RestaurantSettings;
}
