import { supabase } from '@/lib/supabase';
import type { Terraza } from '@/lib/db';
import type { Mesa } from '@/lib/db';
import type { Menu, Category, Dish } from '@/lib/menuDb';

export type OrderType = 'dine_in' | 'delivery' | 'pickup';

export interface Order {
  id: string;
  table_id: string | null;
  terrace_id: string | null;
  customer_name: string;
  party_size: number;
  status: 'open' | 'sent' | 'completed' | 'paid';
  total: number;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
  order_type: OrderType;
  customer_phone: string | null;
  delivery_address: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  dish_id: string;
  dish_name: string;
  unit_price: number;
  quantity: number;
  notes: string | null;
}

export interface CartItem {
  dish_id: string;
  dish_name: string;
  unit_price: number;
  quantity: number;
}

export async function fetchTerraces(): Promise<Terraza[]> {
  const { data, error } = await supabase
    .from('terraces')
    .select('id, name, description')
    .order('name');
  if (error) throw error;
  return data as Terraza[];
}

export async function fetchActiveTables(terraceId: string): Promise<Mesa[]> {
  const { data, error } = await supabase
    .from('tables')
    .select('id, terrace_id, table_number, capacity, is_active')
    .eq('terrace_id', terraceId)
    .eq('is_active', true)
    .order('table_number');
  if (error) throw error;
  return data as Mesa[];
}

export async function fetchOpenOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('id, table_id, terrace_id, customer_name, party_size, status, total, created_at, order_type, customer_phone, delivery_address')
    .in('status', ['open', 'sent'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Order[];
}

export async function fetchMenusForOrdering(): Promise<Menu[]> {
  const { data, error } = await supabase
    .from('menus')
    .select('id, name, is_active')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data as Menu[];
}

export async function fetchCategoriesForMenu(menuId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, menu_id, name')
    .eq('menu_id', menuId)
    .order('name');
  if (error) throw error;
  return data as Category[];
}

export async function fetchAvailableDishes(categoryId: string): Promise<Dish[]> {
  const { data, error } = await supabase
    .from('dishes')
    .select('id, category_id, name, description, price, ingredients, is_available')
    .eq('category_id', categoryId)
    .eq('is_available', true)
    .order('name');
  if (error) throw error;
  return data as Dish[];
}

export async function createOrder(
  tableId: string,
  terraceId: string,
  customerName: string,
  partySize: number
): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .insert({
      table_id: tableId,
      terrace_id: terraceId,
      customer_name: customerName,
      party_size: partySize,
      status: 'open',
      total: 0,
      order_type: 'dine_in',
    })
    .select('id, table_id, terrace_id, customer_name, party_size, status, total, created_at, order_type, customer_phone, delivery_address')
    .single();
  if (error) throw error;
  return data as Order;
}

export interface ExternalOrderInput {
  customerName: string;
  customerPhone: string;
  orderType: 'delivery' | 'pickup';
  deliveryAddress?: string;
}

export async function createExternalOrder(input: ExternalOrderInput): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .insert({
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      order_type: input.orderType,
      delivery_address: input.orderType === 'delivery' ? (input.deliveryAddress ?? null) : null,
      party_size: 1,
      status: 'open',
      total: 0,
    })
    .select('id, table_id, terrace_id, customer_name, party_size, status, total, created_at, order_type, customer_phone, delivery_address')
    .single();
  if (error) throw error;
  return data as Order;
}

export async function fetchExternalOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('id, table_id, terrace_id, customer_name, party_size, status, total, created_at, order_type, customer_phone, delivery_address')
    .in('status', ['open', 'sent'])
    .in('order_type', ['delivery', 'pickup'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Order[];
}

export async function sendOrderToKitchen(
  orderId: string,
  items: CartItem[]
): Promise<void> {
  const orderItems = items.map((item) => ({
    order_id: orderId,
    dish_id: item.dish_id,
    dish_name: item.dish_name,
    unit_price: item.unit_price,
    quantity: item.quantity,
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);
  if (itemsError) throw itemsError;

  const total = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const { error: orderError } = await supabase
    .from('orders')
    .update({ status: 'sent', total })
    .eq('id', orderId);
  if (orderError) throw orderError;
}

export async function fetchOrderItems(orderId: string): Promise<OrderItem[]> {
  const { data, error } = await supabase
    .from('order_items')
    .select('id, order_id, dish_id, dish_name, unit_price, quantity, notes')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as OrderItem[];
}

export async function addItemsToOrder(
  orderId: string,
  items: CartItem[]
): Promise<void> {
  const orderItems = items.map((item) => ({
    order_id: orderId,
    dish_id: item.dish_id,
    dish_name: item.dish_name,
    unit_price: item.unit_price,
    quantity: item.quantity,
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);
  if (itemsError) throw itemsError;

  const { data: existing } = await supabase
    .from('order_items')
    .select('unit_price, quantity')
    .eq('order_id', orderId);

  const total = (existing ?? []).reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const { error: orderError } = await supabase
    .from('orders')
    .update({ total })
    .eq('id', orderId);
  if (orderError) throw orderError;
}

export async function fetchAllActiveTables(): Promise<Mesa[]> {
  const { data, error } = await supabase
    .from('tables')
    .select('id, terrace_id, table_number, capacity, is_active')
    .eq('is_active', true)
    .order('table_number');
  if (error) throw error;
  return data as Mesa[];
}

export async function changeTableForOrder(orderId: string, newTableId: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ table_id: newTableId })
    .eq('id', orderId);
  if (error) throw error;
}

export async function closeOrder(orderId: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ status: 'completed' })
    .eq('id', orderId);
  if (error) throw error;
}

export interface PaymentDetails {
  paymentMethod: string;
  paymentCurrency: 'USD' | 'VES';
  exchangeRate: number | null;
  amountPaid: number;
  paymentAccountId: string | null;
  discountPercentage: number;
  finalAmount: number;
}

export async function payAndCloseOrder(
  orderId: string,
  details: PaymentDetails
): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({
      status: 'paid',
      payment_method: details.paymentMethod,
      payment_currency: details.paymentCurrency,
      exchange_rate: details.exchangeRate,
      amount_paid: details.amountPaid,
      payment_account_id: details.paymentAccountId,
      discount_percentage: details.discountPercentage,
      final_amount: details.finalAmount,
      paid_at: new Date().toISOString(),
    })
    .eq('id', orderId);
  if (error) throw error;
}

// ===== Split / Mixed Payments =====

export interface SplitPaymentLine {
  currency: 'USD' | 'VES';
  paymentMethod: string;
  paymentAccountId: string;
  amount: number;
  amountUsd: number;
  exchangeRate: number | null;
}

export interface OrderPaymentRow {
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

export async function payAndCloseOrderWithSplits(
  orderId: string,
  details: {
    discountPercentage: number;
    finalAmount: number;
    totalAmountUsd: number;
  },
  lines: SplitPaymentLine[]
): Promise<void> {
  const { error: orderError } = await supabase
    .from('orders')
    .update({
      status: 'paid',
      payment_method: 'split',
      payment_currency: 'USD',
      exchange_rate: null,
      amount_paid: details.totalAmountUsd,
      payment_account_id: null,
      discount_percentage: details.discountPercentage,
      final_amount: details.finalAmount,
      paid_at: new Date().toISOString(),
    })
    .eq('id', orderId);
  if (orderError) throw orderError;

  if (lines.length > 0) {
    const rows = lines.map((l) => ({
      order_id: orderId,
      currency: l.currency,
      payment_method: l.paymentMethod,
      payment_account_id: l.paymentAccountId,
      amount: l.amount,
      amount_usd: l.amountUsd,
      exchange_rate: l.exchangeRate,
    }));
    const { error: linesError } = await supabase
      .from('order_payments')
      .insert(rows);
    if (linesError) throw linesError;
  }
}

export async function fetchOrderPayments(orderId: string): Promise<OrderPaymentRow[]> {
  const { data, error } = await supabase
    .from('order_payments')
    .select('id, order_id, currency, payment_method, payment_account_id, amount, amount_usd, exchange_rate, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as OrderPaymentRow[];
}

export interface CreditDetails {
  customerName: string;
  tableNumber: string | null;
  amount: number;
  discountPercentage: number;
}

export async function processCreditSale(
  orderId: string,
  details: CreditDetails
): Promise<void> {
  const { error: orderError } = await supabase
    .from('orders')
    .update({
      status: 'paid',
      payment_method: 'credit',
      payment_currency: 'USD',
      exchange_rate: null,
      amount_paid: 0,
      payment_account_id: null,
      discount_percentage: details.discountPercentage,
      final_amount: details.amount,
      paid_at: new Date().toISOString(),
    })
    .eq('id', orderId);
  if (orderError) {
    console.error('[processCreditSale] Error updating orders:', orderError.message, orderError.details, orderError.hint);
    throw new Error(`Orden: ${orderError.message}`);
  }

  const { error: arError } = await supabase
    .from('accounts_receivable')
    .insert({
      order_id: orderId,
      client_name: details.customerName,
      total_amount: details.amount,
      status: 'pending',
    });
  if (arError) {
    console.error('[processCreditSale] Error inserting accounts_receivable:', arError.message, arError.details, arError.hint);
    throw new Error(`Cuenta por cobrar: ${arError.message}`);
  }
}

// ===== Table Groups (Unir Mesas) =====

export interface TableGroup {
  id: string;
  leader_table_id: string;
  customer_name: string;
  party_size: number;
  status: 'active' | 'closed';
  created_at: string;
}

export interface TableGroupWithMembers extends TableGroup {
  member_table_ids: string[];
}

export async function fetchActiveTableGroups(): Promise<TableGroupWithMembers[]> {
  const { data: groups, error } = await supabase
    .from('table_groups')
    .select('id, leader_table_id, customer_name, party_size, status, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) throw error;

  const result: TableGroupWithMembers[] = [];
  for (const g of groups as TableGroup[]) {
    const { data: members } = await supabase
      .from('table_group_members')
      .select('table_id')
      .eq('group_id', g.id);
    result.push({ ...g, member_table_ids: (members ?? []).map((m) => m.table_id) });
  }
  return result;
}

export async function createTableGroup(
  tableIds: string[],
  leaderTableId: string,
  customerName: string,
  partySize: number
): Promise<TableGroup> {
  const { data, error } = await supabase
    .from('table_groups')
    .insert({
      leader_table_id: leaderTableId,
      customer_name: customerName,
      party_size: partySize,
      status: 'active',
    })
    .select('id, leader_table_id, customer_name, party_size, status, created_at')
    .single();
  if (error) throw error;
  const group = data as TableGroup;

  const members = tableIds.map((tid) => ({ group_id: group.id, table_id: tid }));
  const { error: membersError } = await supabase
    .from('table_group_members')
    .insert(members);
  if (membersError) throw membersError;

  return group;
}

export async function closeTableGroup(groupId: string): Promise<void> {
  const { error } = await supabase
    .from('table_groups')
    .update({ status: 'closed' })
    .eq('id', groupId);
  if (error) throw error;
}
