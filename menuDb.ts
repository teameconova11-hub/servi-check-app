import { supabase } from '@/lib/supabase';

export interface Menu {
  id: string;
  name: string;
  is_active: boolean;
}

export interface Category {
  id: string;
  menu_id: string;
  name: string;
}

export interface Dish {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  ingredients: string[] | null;
  is_available: boolean;
}

export async function fetchMenus(): Promise<Menu[]> {
  const { data, error } = await supabase
    .from('menus')
    .select('id, name, is_active')
    .order('name');
  if (error) throw error;
  return data as Menu[];
}

export async function createMenu(name: string): Promise<Menu> {
  const { data, error } = await supabase
    .from('menus')
    .insert({ name, is_active: true })
    .select('id, name, is_active')
    .single();
  if (error) throw error;
  return data as Menu;
}

export async function updateMenu(id: string, name: string): Promise<Menu> {
  const { data, error } = await supabase
    .from('menus')
    .update({ name })
    .eq('id', id)
    .select('id, name, is_active')
    .single();
  if (error) throw error;
  return data as Menu;
}

export async function deleteMenu(id: string): Promise<void> {
  const { error } = await supabase.from('menus').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchCategories(menuId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, menu_id, name')
    .eq('menu_id', menuId)
    .order('name');
  if (error) throw error;
  return data as Category[];
}

export async function createCategory(menuId: string, name: string): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ menu_id: menuId, name })
    .select('id, menu_id, name')
    .single();
  if (error) throw error;
  return data as Category;
}

export async function updateCategory(id: string, name: string): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .update({ name })
    .eq('id', id)
    .select('id, menu_id, name')
    .single();
  if (error) throw error;
  return data as Category;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchDishes(categoryId: string): Promise<Dish[]> {
  const { data, error } = await supabase
    .from('dishes')
    .select('id, category_id, name, description, price, ingredients, is_available')
    .eq('category_id', categoryId)
    .order('name');
  if (error) throw error;
  return data as Dish[];
}

export async function createDish(
  categoryId: string,
  name: string,
  description: string,
  price: number,
  ingredients: string[]
): Promise<Dish> {
  const { data, error } = await supabase
    .from('dishes')
    .insert({
      category_id: categoryId,
      name,
      description: description || null,
      price,
      ingredients: ingredients.length > 0 ? ingredients : null,
      is_available: true,
    })
    .select('id, category_id, name, description, price, ingredients, is_available')
    .single();
  if (error) throw error;
  return data as Dish;
}

export async function updateDish(
  id: string,
  name: string,
  description: string,
  price: number,
  ingredients: string[]
): Promise<Dish> {
  const { data, error } = await supabase
    .from('dishes')
    .update({
      name,
      description: description || null,
      price,
      ingredients: ingredients.length > 0 ? ingredients : null,
    })
    .eq('id', id)
    .select('id, category_id, name, description, price, ingredients, is_available')
    .single();
  if (error) throw error;
  return data as Dish;
}

export async function toggleDishAvailability(id: string, isAvailable: boolean): Promise<void> {
  const { error } = await supabase
    .from('dishes')
    .update({ is_available: isAvailable })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteDish(id: string): Promise<void> {
  const { error } = await supabase.from('dishes').delete().eq('id', id);
  if (error) throw error;
}
