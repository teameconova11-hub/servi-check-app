import { useState, useEffect, useCallback } from 'react';
import {
  Store,
  Users,
  Plus,
  Minus,
  X,
  ShoppingCart,
  Loader2,
  AlertCircle,
  UtensilsCrossed,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  ClipboardList,
  Send,
  User,
  Receipt,
  ArrowLeft,
  GitBranch,
  Link2,
  Unlink,
  Check,
  Lock,
  Printer,
  CreditCard,
  Banknote,
  Wallet,
  DollarSign,
  Smartphone,
  Landmark,
  Percent,
  Clock,
  ArrowLeftRight,
  Bike,
  ShoppingBag,
  Phone,
  MapPin,
} from 'lucide-react';
import {
  fetchTerraces,
  fetchActiveTables,
  fetchAllActiveTables,
  fetchOpenOrders,
  fetchMenusForOrdering,
  fetchCategoriesForMenu,
  fetchAvailableDishes,
  createOrder,
  sendOrderToKitchen,
  fetchOrderItems,
  addItemsToOrder,
  fetchActiveTableGroups,
  createTableGroup,
  closeTableGroup,
  payAndCloseOrder,
  processCreditSale,
  changeTableForOrder,
  createExternalOrder,
  fetchExternalOrders,
  type CartItem,
  type Order,
  type OrderItem,
  type OrderType,
  type TableGroupWithMembers,
  type PaymentDetails,
} from '@/lib/orderDb';
import { fetchRestaurantSettings, type RestaurantSettings } from '@/lib/settingsDb';
import { fetchPaymentAccounts, type PaymentAccount } from '@/lib/paymentAccountsDb';
import type { Terraza, Mesa } from '@/lib/db';
import type { Menu, Category, Dish } from '@/lib/menuDb';
import SplitPaymentModal, { type SplitPaymentContext } from '@/components/SplitPaymentModal';

type Screen = 'tables' | 'ordering';

interface TableOrderInfo {
  orderId: string;
  customerName: string;
  partySize: number;
  status: string;
}

interface GroupInfo {
  groupId: string;
  leaderTableId: string;
  customerName: string;
  partySize: number;
  memberTableIds: string[];
}

export default function OrdersView() {
  const [screen, setScreen] = useState<Screen>('tables');

  // Tables state
  const [terrazas, setTerrazas] = useState<Terraza[]>([]);
  const [activeTerrazaId, setActiveTerrazaId] = useState<string | null>(null);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [orderMap, setOrderMap] = useState<Map<string, TableOrderInfo>>(new Map());
  const [groupMap, setGroupMap] = useState<Map<string, GroupInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Join mode state
  const [joinMode, setJoinMode] = useState(false);
  const [selectedTables, setSelectedTables] = useState<Mesa[]>([]);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinCustomerName, setJoinCustomerName] = useState('');
  const [joinPartySize, setJoinPartySize] = useState(1);
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Open table modal
  const [openModalMesa, setOpenModalMesa] = useState<Mesa | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [partySize, setPartySize] = useState(1);
  const [openingTable, setOpeningTable] = useState(false);

  // Manage occupied table modal
  const [manageMesa, setManageMesa] = useState<Mesa | null>(null);
  const [manageOrder, setManageOrder] = useState<TableOrderInfo | null>(null);
  const [manageItems, setManageItems] = useState<OrderItem[]>([]);
  const [loadingManage, setLoadingManage] = useState(false);
  const [manageGroupInfo, setManageGroupInfo] = useState<GroupInfo | null>(null);

  // Ordering state
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [activeMesa, setActiveMesa] = useState<Mesa | null>(null);
  const [activeGroupInfo, setActiveGroupInfo] = useState<GroupInfo | null>(null);
  const [existingItems, setExistingItems] = useState<OrderItem[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [isAddingToExisting, setIsAddingToExisting] = useState(false);

  // Ticket / payment state
  const [showTicket, setShowTicket] = useState(false);
  const [restaurantSettings, setRestaurantSettings] = useState<RestaurantSettings | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [processingPayment, setProcessingPayment] = useState(false);

  // Financial payment state
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [paymentCurrency, setPaymentCurrency] = useState<'USD' | 'VES'>('USD');
  const [exchangeRate, setExchangeRate] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Discount state
  const [discountInput, setDiscountInput] = useState<string>('');

  // Credit sale state
  const [isCreditMode, setIsCreditMode] = useState(false);
  const [processingCredit, setProcessingCredit] = useState(false);

  // Change table state
  const [showChangeTableModal, setShowChangeTableModal] = useState(false);
  const [allTables, setAllTables] = useState<Mesa[]>([]);
  const [targetTableId, setTargetTableId] = useState<string | null>(null);
  const [changingTable, setChangingTable] = useState(false);

  // External orders (Delivery / Pickup) state
  const [viewMode, setViewMode] = useState<'dine_in' | 'external'>('dine_in');
  const [externalOrders, setExternalOrders] = useState<Order[]>([]);
  const [showExternalForm, setShowExternalForm] = useState(false);
  const [extCustomerName, setExtCustomerName] = useState('');
  const [extCustomerPhone, setExtCustomerPhone] = useState('');
  const [extOrderType, setExtOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [extDeliveryAddress, setExtDeliveryAddress] = useState('');
  const [creatingExternal, setCreatingExternal] = useState(false);
  const [manageExtOrder, setManageExtOrder] = useState<Order | null>(null);
  const [activeExtOrder, setActiveExtOrder] = useState<Order | null>(null);

  // Split payment modal state (replaces single-payment modals for both dine-in and external)
  const [showSplitPayment, setShowSplitPayment] = useState(false);
  const [splitCtx, setSplitCtx] = useState<SplitPaymentContext | null>(null);

  // External ticket / payment state (decoupled from dine-in)
  const [showExtTicket, setShowExtTicket] = useState(false);
  const [showExtPaymentModal, setShowExtPaymentModal] = useState(false);
  const [extPaymentMethod, setExtPaymentMethod] = useState<string>('');
  const [extProcessingPayment, setExtProcessingPayment] = useState(false);
  const [extPaymentCurrency, setExtPaymentCurrency] = useState<'USD' | 'VES'>('USD');
  const [extExchangeRate, setExtExchangeRate] = useState<string>('');
  const [extSelectedAccountId, setExtSelectedAccountId] = useState<string>('');
  const [extLoadingAccounts, setExtLoadingAccounts] = useState(false);
  const [extPaymentAccounts, setExtPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [extDiscountInput, setExtDiscountInput] = useState<string>('');
  const [extIsCreditMode, setExtIsCreditMode] = useState(false);
  const [extProcessingCredit, setExtProcessingCredit] = useState(false);

  // Refresh all data from Supabase
  const refreshData = useCallback(async () => {
    const [orders, groups, extOrders] = await Promise.all([fetchOpenOrders(), fetchActiveTableGroups(), fetchExternalOrders()]);
    const map = new Map<string, TableOrderInfo>();
    orders.forEach((o: Order) => {
      if (o.table_id) {
        map.set(o.table_id, {
          orderId: o.id,
          customerName: o.customer_name,
          partySize: o.party_size,
          status: o.status,
        });
      }
    });
    setOrderMap(map);
    setExternalOrders(extOrders);

    const gMap = new Map<string, GroupInfo>();
    groups.forEach((g: TableGroupWithMembers) => {
      const info: GroupInfo = {
        groupId: g.id,
        leaderTableId: g.leader_table_id,
        customerName: g.customer_name,
        partySize: g.party_size,
        memberTableIds: g.member_table_ids,
      };
      g.member_table_ids.forEach((tid) => gMap.set(tid, info));
    });
    setGroupMap(gMap);
  }, []);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [t, orders, groups, extOrders] = await Promise.all([
          fetchTerraces(),
          fetchOpenOrders(),
          fetchActiveTableGroups(),
          fetchExternalOrders(),
        ]);
        if (cancelled) return;
        setTerrazas(t);
        const map = new Map<string, TableOrderInfo>();
        orders.forEach((o: Order) => {
          if (o.table_id) {
            map.set(o.table_id, {
              orderId: o.id,
              customerName: o.customer_name,
              partySize: o.party_size,
              status: o.status,
            });
          }
        });
        setOrderMap(map);
        setExternalOrders(extOrders);
        const gMap = new Map<string, GroupInfo>();
        groups.forEach((g: TableGroupWithMembers) => {
          const info: GroupInfo = {
            groupId: g.id,
            leaderTableId: g.leader_table_id,
            customerName: g.customer_name,
            partySize: g.party_size,
            memberTableIds: g.member_table_ids,
          };
          g.member_table_ids.forEach((tid) => gMap.set(tid, info));
        });
        setGroupMap(gMap);
        if (t.length > 0) setActiveTerrazaId(t[0].id);
      } catch {
        if (!cancelled) setError('No se pudieron cargar los datos.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const loadTables = useCallback(async (terraceId: string) => {
    try {
      const m = await fetchActiveTables(terraceId);
      setMesas(m);
    } catch {
      setError('No se pudieron cargar las mesas.');
    }
  }, []);

  useEffect(() => {
    if (activeTerrazaId) loadTables(activeTerrazaId);
    else setMesas([]);
  }, [activeTerrazaId, loadTables]);

  // ===== Join mode handlers =====
  const toggleJoinMode = () => {
    setJoinMode((prev) => !prev);
    setSelectedTables([]);
  };

  const toggleTableSelection = (mesa: Mesa) => {
    setSelectedTables((prev) => {
      const exists = prev.find((m) => m.id === mesa.id);
      if (exists) return prev.filter((m) => m.id !== mesa.id);
      return [...prev, mesa];
    });
  };

  const handleOpenJoinModal = () => {
    if (selectedTables.length < 2) return;
    const totalCapacity = selectedTables.reduce((sum, m) => sum + m.capacity, 0);
    setJoinPartySize(totalCapacity);
    setJoinCustomerName('');
    setJoinModalOpen(true);
  };

  const handleConfirmJoin = async () => {
    if (selectedTables.length < 2 || !joinCustomerName.trim()) return;
    setCreatingGroup(true);
    setError('');
    try {
      const leaderMesa = selectedTables[0];
      const tableIds = selectedTables.map((m) => m.id);
      const group = await createTableGroup(
        tableIds,
        leaderMesa.id,
        joinCustomerName.trim(),
        joinPartySize
      );
      // Create a single order on the leader table
      const order = await createOrder(
        leaderMesa.id,
        leaderMesa.terrace_id,
        joinCustomerName.trim(),
        joinPartySize
      );
      // Refresh data
      await refreshData();
      // Go to ordering screen for the group
      setActiveOrderId(order.id);
      setActiveMesa(leaderMesa);
      setActiveGroupInfo({
        groupId: group.id,
        leaderTableId: leaderMesa.id,
        customerName: joinCustomerName.trim(),
        partySize: joinPartySize,
        memberTableIds: tableIds,
      });
      setCustomerName(joinCustomerName.trim());
      setPartySize(joinPartySize);
      setExistingItems([]);
      setCart([]);
      setIsAddingToExisting(false);
      setJoinModalOpen(false);
      setJoinMode(false);
      setSelectedTables([]);
      await loadOrderingData();
      setScreen('ordering');
    } catch {
      setError('No se pudo crear el grupo de mesas.');
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleUngroup = async (groupId: string) => {
    try {
      await closeTableGroup(groupId);
      await refreshData();
      setManageMesa(null);
      setManageOrder(null);
      setManageGroupInfo(null);
    } catch {
      setError('No se pudo liberar el grupo.');
    }
  };

  const handleOpenChangeTable = async () => {
    setShowChangeTableModal(true);
    setTargetTableId(null);
    try {
      const all = await fetchAllActiveTables();
      setAllTables(all);
    } catch {
      setAllTables([]);
    }
  };

  const handleConfirmChangeTable = async () => {
    if (!manageOrder || !targetTableId) return;
    setChangingTable(true);
    setError('');
    try {
      await changeTableForOrder(manageOrder.orderId, targetTableId);
      await refreshData();
      const newMesa = allTables.find((m) => m.id === targetTableId);
      setManageMesa(newMesa ?? null);
      setShowChangeTableModal(false);
      setTargetTableId(null);
      setSuccessMsg(`Mesa cambiada correctamente a ${newMesa?.table_number ?? '?'}`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setError('No se pudo cambiar de mesa.');
    } finally {
      setChangingTable(false);
    }
  };

  const handlePrintTicket = async () => {
    if (!restaurantSettings) {
      try {
        const settings = await fetchRestaurantSettings();
        setRestaurantSettings(settings);
      } catch {
        // proceed without settings — ticket still shows items
      }
    }
    setShowTicket(true);
  };

  const handleOpenPayment = () => {
    if (!manageOrder) return;
    setSplitCtx({
      orderId: manageOrder.orderId,
      customerName: manageOrder.customerName,
      tableLabel: manageMesa ? `Mesa ${manageMesa.table_number}` : (manageExtOrder ? (manageExtOrder.order_type === 'delivery' ? 'Delivery' : 'Retirar') : ''),
      finalAmount: finalTotal,
      discountPercentage,
      subtotal: manageTotal,
      isExternal: !!manageExtOrder,
    });
    setShowSplitPayment(true);
  };

  const manageTotal = manageItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const discountPercentage = discountInput ? Math.min(Math.max(parseFloat(discountInput) || 0, 0), 100) : 0;
  const discountAmount = manageTotal * (discountPercentage / 100);
  const finalTotal = manageTotal - discountAmount;
  const vesTotal = paymentCurrency === 'VES' && exchangeRate ? finalTotal * parseFloat(exchangeRate) : 0;
  const filteredAccounts = paymentAccounts.filter((a) => a.currency === paymentCurrency);

  const handleConfirmPayment = async () => {
    if (!manageOrder || !paymentMethod) return;
    if (!selectedAccountId) {
      setError('Debes seleccionar una cuenta de destino.');
      return;
    }
    if (paymentCurrency === 'VES' && (!exchangeRate || parseFloat(exchangeRate) <= 0)) {
      setError('Ingresa una tasa de cambio válida.');
      return;
    }
    setProcessingPayment(true);
    setError('');
    try {
      const details: PaymentDetails = {
        paymentMethod,
        paymentCurrency,
        exchangeRate: paymentCurrency === 'VES' ? parseFloat(exchangeRate) : null,
        amountPaid: paymentCurrency === 'VES' ? vesTotal : finalTotal,
        paymentAccountId: selectedAccountId,
        discountPercentage,
        finalAmount: finalTotal,
      };
      await payAndCloseOrder(manageOrder.orderId, details);
      if (manageGroupInfo) {
        await closeTableGroup(manageGroupInfo.groupId);
      }
      await refreshData();
      setShowPaymentModal(false);
      setManageMesa(null);
      setManageOrder(null);
      setManageGroupInfo(null);
      setManageExtOrder(null);
      setManageItems([]);
      setPaymentMethod('');
      setSelectedAccountId('');
      setExchangeRate('');
      setDiscountInput('');
      setSuccessMsg('Pago procesado y mesa liberada correctamente');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setError('No se pudo procesar el pago.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleConfirmCredit = async () => {
    if (!manageOrder) return;
    setProcessingCredit(true);
    setError('');
    try {
      await processCreditSale(manageOrder.orderId, {
        customerName: manageOrder.customerName,
        tableNumber: manageMesa ? String(manageMesa.table_number) : (manageExtOrder ? (manageExtOrder.order_type === 'delivery' ? 'Delivery' : 'Retirar') : null),
        amount: finalTotal,
        discountPercentage,
      });
      if (manageGroupInfo) {
        await closeTableGroup(manageGroupInfo.groupId);
      }
      await refreshData();
      setShowPaymentModal(false);
      setManageMesa(null);
      setManageOrder(null);
      setManageGroupInfo(null);
      setManageExtOrder(null);
      setManageItems([]);
      setDiscountInput('');
      setIsCreditMode(false);
      setSuccessMsg('Venta a crédito registrada. Mesa liberada correctamente.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(`No se pudo registrar la venta a crédito: ${(err as Error).message}`);
    } finally {
      setProcessingCredit(false);
    }
  };

  // ===== External order handlers =====
  const handleOpenExternalForm = () => {
    setExtCustomerName('');
    setExtCustomerPhone('');
    setExtOrderType('delivery');
    setExtDeliveryAddress('');
    setShowExternalForm(true);
  };

  const handleConfirmCreateExternal = async () => {
    if (!extCustomerName.trim() || !extCustomerPhone.trim()) return;
    if (extOrderType === 'delivery' && !extDeliveryAddress.trim()) return;
    setCreatingExternal(true);
    setError('');
    try {
      const order = await createExternalOrder({
        customerName: extCustomerName.trim(),
        customerPhone: extCustomerPhone.trim(),
        orderType: extOrderType,
        deliveryAddress: extDeliveryAddress.trim() || undefined,
      });
      await refreshData();
      setShowExternalForm(false);
      setActiveOrderId(order.id);
      setActiveMesa(null);
      setActiveGroupInfo(null);
      setActiveExtOrder(order);
      setCustomerName(order.customer_name);
      setPartySize(1);
      setExistingItems([]);
      setCart([]);
      setIsAddingToExisting(false);
      await loadOrderingData();
      setScreen('ordering');
    } catch {
      setError('No se pudo crear el pedido externo.');
    } finally {
      setCreatingExternal(false);
    }
  };

  const handleManageExtOrder = async (order: Order) => {
    setManageExtOrder(order);
    setManageMesa(null);
    setManageGroupInfo(null);
    setManageOrder({
      orderId: order.id,
      customerName: order.customer_name,
      partySize: order.party_size,
      status: order.status,
    });
    setLoadingManage(true);
    try {
      const items = await fetchOrderItems(order.id);
      setManageItems(items);
    } catch {
      setManageItems([]);
    } finally {
      setLoadingManage(false);
    }
  };

  const handleAddMoreFromExtManage = () => {
    if (!manageExtOrder || !manageOrder) return;
    setActiveOrderId(manageOrder.orderId);
    setActiveMesa(null);
    setActiveGroupInfo(null);
    setActiveExtOrder(manageExtOrder);
    setCustomerName(manageOrder.customerName);
    setPartySize(manageOrder.partySize);
    setExistingItems(manageItems);
    setCart([]);
    setIsAddingToExisting(true);
    setManageMesa(null);
    setManageOrder(null);
    setManageGroupInfo(null);
    setManageExtOrder(null);
    loadOrderingData();
    setScreen('ordering');
  };

  // ===== External order ticket / payment (decoupled from dine-in) =====
  const extManageTotal = manageItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const extDiscountPercentage = extDiscountInput ? Math.min(Math.max(parseFloat(extDiscountInput) || 0, 0), 100) : 0;
  const extDiscountAmount = extManageTotal * (extDiscountPercentage / 100);
  const extFinalTotal = extManageTotal - extDiscountAmount;
  const extVesTotal = extPaymentCurrency === 'VES' && extExchangeRate ? extFinalTotal * parseFloat(extExchangeRate) : 0;
  const extFilteredAccounts = extPaymentAccounts.filter((a) => a.currency === extPaymentCurrency);

  const handlePrintExtTicket = async () => {
    if (!restaurantSettings) {
      try {
        const settings = await fetchRestaurantSettings();
        setRestaurantSettings(settings);
      } catch {
        // proceed without settings — ticket still shows items
      }
    }
    setShowExtTicket(true);
  };

  const handleOpenExtPayment = () => {
    if (!manageOrder) return;
    setSplitCtx({
      orderId: manageOrder.orderId,
      customerName: manageOrder.customerName,
      tableLabel: manageExtOrder ? (manageExtOrder.order_type === 'delivery' ? 'Delivery' : 'Retirar') : '',
      finalAmount: extFinalTotal,
      discountPercentage: extDiscountPercentage,
      subtotal: extManageTotal,
      isExternal: true,
    });
    setShowSplitPayment(true);
  };

  const closeExtManage = () => {
    setManageExtOrder(null);
    setManageOrder(null);
    setManageMesa(null);
    setManageGroupInfo(null);
    setManageItems([]);
    setExtDiscountInput('');
  };

  const handleConfirmExtPayment = async () => {
    if (!manageOrder || !extPaymentMethod) return;
    if (!extSelectedAccountId) {
      setError('Debes seleccionar una cuenta de destino.');
      return;
    }
    if (extPaymentCurrency === 'VES' && (!extExchangeRate || parseFloat(extExchangeRate) <= 0)) {
      setError('Ingresa una tasa de cambio válida.');
      return;
    }
    setExtProcessingPayment(true);
    setError('');
    try {
      const details: PaymentDetails = {
        paymentMethod: extPaymentMethod,
        paymentCurrency: extPaymentCurrency,
        exchangeRate: extPaymentCurrency === 'VES' ? parseFloat(extExchangeRate) : null,
        amountPaid: extPaymentCurrency === 'VES' ? extVesTotal : extFinalTotal,
        paymentAccountId: extSelectedAccountId,
        discountPercentage: extDiscountPercentage,
        finalAmount: extFinalTotal,
      };
      await payAndCloseOrder(manageOrder.orderId, details);
      await refreshData();
      setShowExtPaymentModal(false);
      closeExtManage();
      setExtPaymentMethod('');
      setExtSelectedAccountId('');
      setExtExchangeRate('');
      setExtDiscountInput('');
      setSuccessMsg('Pago procesado y pedido externo cerrado correctamente');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setError('No se pudo procesar el pago.');
    } finally {
      setExtProcessingPayment(false);
    }
  };

  const handleConfirmExtCredit = async () => {
    if (!manageOrder) return;
    setExtProcessingCredit(true);
    setError('');
    try {
      await processCreditSale(manageOrder.orderId, {
        customerName: manageOrder.customerName,
        tableNumber: manageExtOrder ? (manageExtOrder.order_type === 'delivery' ? 'Delivery' : 'Retirar') : null,
        amount: extFinalTotal,
        discountPercentage: extDiscountPercentage,
      });
      await refreshData();
      setShowExtPaymentModal(false);
      closeExtManage();
      setExtDiscountInput('');
      setExtIsCreditMode(false);
      setSuccessMsg('Venta a crédito registrada y pedido externo cerrado correctamente.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(`No se pudo registrar la venta a crédito: ${(err as Error).message}`);
    } finally {
      setExtProcessingCredit(false);
    }
  };

  // Open a free table
  const handleOpenMesaClick = (mesa: Mesa) => {
    if (joinMode) {
      // Only select free, non-grouped tables
      if (orderMap.has(mesa.id) || groupMap.has(mesa.id)) return;
      toggleTableSelection(mesa);
      return;
    }
    // Block member (non-leader) grouped tables
    const gInfo = groupMap.get(mesa.id);
    if (gInfo && gInfo.leaderTableId !== mesa.id) {
      const leaderNumber = mesas.find((m) => m.id === gInfo.leaderTableId)?.table_number ?? '?';
      setInfoMsg(`La Mesa ${mesa.table_number} pertenece al grupo de la Mesa ${leaderNumber}. Gestiónala desde la mesa líder.`);
      setTimeout(() => setInfoMsg(''), 4000);
      return;
    }
    if (orderMap.has(mesa.id)) {
      handleManageMesaClick(mesa);
      return;
    }
    setOpenModalMesa(mesa);
    setCustomerName('');
    setPartySize(mesa.capacity || 1);
  };

  const handleConfirmOpenTable = async () => {
    if (!openModalMesa || !customerName.trim()) return;
    setOpeningTable(true);
    setError('');
    try {
      const order = await createOrder(
        openModalMesa.id,
        openModalMesa.terrace_id,
        customerName.trim(),
        partySize
      );
      setOrderMap((prev) => new Map([...prev, [openModalMesa.id, {
        orderId: order.id,
        customerName: order.customer_name,
        partySize: order.party_size,
        status: order.status,
      }]]));
      setActiveOrderId(order.id);
      setActiveMesa(openModalMesa);
      setActiveGroupInfo(null);
      setExistingItems([]);
      setCart([]);
      setIsAddingToExisting(false);
      setOpenModalMesa(null);
      setCustomerName('');
      await loadOrderingData();
      setScreen('ordering');
    } catch {
      setError('No se pudo abrir la mesa.');
    } finally {
      setOpeningTable(false);
    }
  };

  // Manage occupied table
  const handleManageMesaClick = async (mesa: Mesa) => {
    const info = orderMap.get(mesa.id);
    if (!info) return;
    const gInfo = groupMap.get(mesa.id) ?? null;
    setManageMesa(mesa);
    setManageOrder(info);
    setManageGroupInfo(gInfo);
    setLoadingManage(true);
    try {
      const items = await fetchOrderItems(info.orderId);
      setManageItems(items);
    } catch {
      setManageItems([]);
    } finally {
      setLoadingManage(false);
    }
  };

  const handleAddMoreFromManage = () => {
    if (!manageMesa || !manageOrder) return;
    setActiveOrderId(manageOrder.orderId);
    setActiveMesa(manageMesa);
    setActiveGroupInfo(manageGroupInfo);
    setActiveExtOrder(null);
    setCustomerName(manageOrder.customerName);
    setPartySize(manageOrder.partySize);
    setExistingItems(manageItems);
    setCart([]);
    setIsAddingToExisting(true);
    setManageMesa(null);
    setManageOrder(null);
    setManageGroupInfo(null);
    loadOrderingData();
    setScreen('ordering');
  };

  // Load ordering data
  const loadOrderingData = async () => {
    setLoadingMenu(true);
    try {
      const m = await fetchMenusForOrdering();
      setMenus(m);
      if (m.length > 0) {
        setActiveMenuId(m[0].id);
        const cats = await fetchCategoriesForMenu(m[0].id);
        setCategories(cats);
        if (cats.length > 0) {
          setActiveCategoryId(cats[0].id);
          const d = await fetchAvailableDishes(cats[0].id);
          setDishes(d);
        } else {
          setActiveCategoryId(null);
          setDishes([]);
        }
      }
    } catch {
      setError('No se pudo cargar el menú.');
    } finally {
      setLoadingMenu(false);
    }
  };

  const handleMenuChange = async (menuId: string) => {
    setActiveMenuId(menuId);
    try {
      const cats = await fetchCategoriesForMenu(menuId);
      setCategories(cats);
      if (cats.length > 0) {
        setActiveCategoryId(cats[0].id);
        const d = await fetchAvailableDishes(cats[0].id);
        setDishes(d);
      } else {
        setActiveCategoryId(null);
        setDishes([]);
      }
    } catch {
      setError('No se pudo cargar la categoría.');
    }
  };

  const handleCategoryClick = async (catId: string) => {
    setActiveCategoryId(catId);
    try {
      const d = await fetchAvailableDishes(catId);
      setDishes(d);
    } catch {
      setError('No se pudieron cargar los platos.');
    }
  };

  // Cart operations
  const addToCart = (dish: Dish) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.dish_id === dish.id);
      if (existing) {
        return prev.map((i) =>
          i.dish_id === dish.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { dish_id: dish.id, dish_name: dish.name, unit_price: dish.price, quantity: 1 }];
    });
  };

  const removeFromCart = (dishId: string) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.dish_id === dishId);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        return prev.filter((i) => i.dish_id !== dishId);
      }
      return prev.map((i) =>
        i.dish_id === dishId ? { ...i, quantity: i.quantity - 1 } : i
      );
    });
  };

  const getCartQty = (dishId: string) => cart.find((i) => i.dish_id === dishId)?.quantity ?? 0;

  const cartTotal = cart.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const existingTotal = existingItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const grandTotal = existingTotal + cartTotal;

  const handleSendOrder = async () => {
    if (!activeOrderId || cart.length === 0) return;
    setSending(true);
    setError('');
    try {
      if (isAddingToExisting) {
        await addItemsToOrder(activeOrderId, cart);
        setSuccessMsg('Platos agregados y enviados a cocina correctamente');
      } else {
        await sendOrderToKitchen(activeOrderId, cart);
        setSuccessMsg('Pedido enviado a cocina correctamente');
      }
      setCart([]);
      setTimeout(() => {
        setSuccessMsg('');
        setScreen('tables');
        setActiveOrderId(null);
        setActiveMesa(null);
        setActiveGroupInfo(null);
        setActiveExtOrder(null);
        setExistingItems([]);
        setIsAddingToExisting(false);
        refreshData();
      }, 1500);
    } catch {
      setError('No se pudo enviar el pedido.');
    } finally {
      setSending(false);
    }
  };

  const handleBackToTables = () => {
    setScreen('tables');
    setActiveOrderId(null);
    setActiveMesa(null);
    setActiveGroupInfo(null);
    setActiveExtOrder(null);
    setCart([]);
    setExistingItems([]);
    setIsAddingToExisting(false);
  };

  // ===== TABLES SCREEN =====
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (screen === 'tables') {
    const activeTerraza = terrazas.find((t) => t.id === activeTerrazaId);
    const freeCount = mesas.filter((m) => !orderMap.has(m.id) && !groupMap.has(m.id)).length;
    const occupiedCount = mesas.filter((m) => orderMap.has(m.id) || groupMap.has(m.id)).length;
    const groupCount = new Set([...groupMap.values()].map((g) => g.groupId)).size;

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

        {infoMsg && (
          <div className="flex items-center gap-2 rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-700">
            <Link2 className="h-4 w-4 shrink-0" />
            {infoMsg}
            <button onClick={() => setInfoMsg('')} className="ml-auto text-violet-400 hover:text-violet-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Mode tabs: Dine-in vs Delivery/Pickup */}
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
          <button
            onClick={() => setViewMode('dine_in')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200
              ${viewMode === 'dine_in'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Store className={`h-4 w-4 ${viewMode === 'dine_in' ? 'text-emerald-400' : 'text-slate-400'}`} />
            Salón
          </button>
          <button
            onClick={() => setViewMode('external')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200
              ${viewMode === 'external'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Bike className={`h-4 w-4 ${viewMode === 'external' ? 'text-sky-400' : 'text-slate-400'}`} />
            Delivery / Retirar
            {externalOrders.length > 0 && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${viewMode === 'external' ? 'bg-sky-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {externalOrders.length}
              </span>
            )}
          </button>
        </div>

        {/* ===== EXTERNAL ORDERS VIEW ===== */}
        {viewMode === 'external' && (
          <div className="space-y-4">
            {/* New external order button */}
            <button
              onClick={handleOpenExternalForm}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:from-sky-400 hover:to-cyan-500"
            >
              <Plus className="h-5 w-5" />
              Nuevo Pedido Delivery / Retirar
            </button>

            {/* External orders list */}
            {externalOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 text-center">
                <Bike className="h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm text-slate-500">No hay pedidos externos activos</p>
                <p className="mt-1 text-xs text-slate-400">Crea un nuevo pedido de delivery o para retirar</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {externalOrders.map((order) => {
                  const isDelivery = order.order_type === 'delivery';
                  return (
                    <button
                      key={order.id}
                      onClick={() => handleManageExtOrder(order)}
                      className={`group relative flex flex-col rounded-2xl border-2 p-4 text-left transition-all duration-200 hover:shadow-md
                        ${isDelivery ? 'border-sky-200 bg-sky-50 hover:border-sky-400' : 'border-teal-200 bg-teal-50 hover:border-teal-400'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isDelivery ? 'bg-sky-100 text-sky-600' : 'bg-teal-100 text-teal-600'}`}>
                          {isDelivery ? <Bike className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${isDelivery ? 'bg-sky-100 text-sky-700' : 'bg-teal-100 text-teal-700'}`}>
                          {isDelivery ? 'DELIVERY' : 'RETIRO'}
                        </span>
                      </div>
                      <p className="mt-3 truncate text-sm font-bold text-slate-700">{order.customer_name}</p>
                      {order.customer_phone && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                          <Phone className="h-3 w-3" />
                          {order.customer_phone}
                        </p>
                      )}
                      {isDelivery && order.delivery_address && (
                        <p className="mt-0.5 flex items-start gap-1 text-xs text-slate-500">
                          <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                          <span className="line-clamp-2">{order.delivery_address}</span>
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${order.status === 'sent' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                          {order.status === 'sent' ? 'Enviado a cocina' : 'Pendiente'}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          {new Date(order.created_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== DINE-IN VIEW ===== */}
        {viewMode === 'dine_in' && (
        <div className="space-y-4">
        {/* Terrace selector + Join toggle */}
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {terrazas.map((t) => {
              const isActive = t.id === activeTerrazaId;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTerrazaId(t.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200
                    ${isActive
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  <Store className={`h-4 w-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  {t.name}
                </button>
              );
            })}
          </div>
          <button
            onClick={toggleJoinMode}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200
              ${joinMode
                ? 'bg-violet-600 text-white shadow-md'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            <GitBranch className={`h-4 w-4 ${joinMode ? 'text-white' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">{joinMode ? 'Cancelar unión' : 'Unir Mesas'}</span>
          </button>
        </div>

        {/* Join mode banner */}
        {joinMode && (
          <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
            <Link2 className="h-5 w-5 shrink-0 text-violet-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-violet-800">
                Modo unión activo · Selecciona 2 o más mesas libres
              </p>
              <p className="text-xs text-violet-600">
                {selectedTables.length === 0
                  ? 'Toca las mesas libres que deseas agrupar'
                  : `${selectedTables.length} mesa(s) seleccionada(s) · Total comensales: ${selectedTables.reduce((s, m) => s + m.capacity, 0)}`}
              </p>
            </div>
            {selectedTables.length >= 2 && (
              <button
                onClick={handleOpenJoinModal}
                className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700"
              >
                <Check className="h-4 w-4" />
                Agrupar {selectedTables.length} mesas
              </button>
            )}
          </div>
        )}

        {/* Summary */}
        {activeTerraza && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-2xl font-bold text-slate-800">{mesas.length}</p>
              <p className="text-xs text-slate-500">Mesas activas</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-2xl font-bold text-emerald-600">{freeCount}</p>
              <p className="text-xs text-slate-500">Libres</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-2xl font-bold text-amber-500">{occupiedCount}</p>
              <p className="text-xs text-slate-500">Ocupadas</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-2xl font-bold text-violet-500">{groupCount}</p>
              <p className="text-xs text-slate-500">Grupos activos</p>
            </div>
          </div>
        )}

        {/* Tables grid */}
        {activeTerraza && mesas.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 text-center">
            <Store className="h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">No hay mesas activas en esta terraza</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {mesas.map((mesa) => {
              const orderInfo = orderMap.get(mesa.id);
              const groupInfo = groupMap.get(mesa.id);
              const isOccupied = !!orderInfo;
              const isGrouped = !!groupInfo;
              const isGroupLeader = groupInfo?.leaderTableId === mesa.id;
              const isSelected = selectedTables.some((m) => m.id === mesa.id);
              const isSelectable = joinMode && !isOccupied && !isGrouped;

              return (
                <button
                  key={mesa.id}
                  onClick={() => handleOpenMesaClick(mesa)}
                  className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 p-5 text-center transition-all duration-200
                    ${isSelected
                      ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-200'
                      : isGrouped
                        ? isGroupLeader
                          ? 'border-violet-300 bg-violet-50 hover:border-violet-500 hover:shadow-md'
                          : 'cursor-not-allowed border-violet-200 bg-violet-50/50'
                        : isOccupied
                          ? 'border-amber-200 bg-amber-50 hover:border-amber-400 hover:shadow-md'
                          : joinMode
                            ? 'border-slate-200 bg-white hover:border-violet-400 hover:shadow-md'
                            : 'border-slate-200 bg-white hover:border-emerald-400 hover:shadow-md'}`}
                >
                  {/* Status dot */}
                  <div className={`absolute right-3 top-3 h-3 w-3 rounded-full
                    ${isGrouped ? 'bg-violet-400' : isOccupied ? 'bg-amber-400' : 'bg-emerald-400'}`} />

                  {/* Group leader badge */}
                  {isGroupLeader && (
                    <div className="absolute left-3 top-3 flex items-center gap-0.5 rounded-full bg-violet-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      <GitBranch className="h-2.5 w-2.5" />
                      LÍDER
                    </div>
                  )}

                  {/* Member table lock indicator */}
                  {isGrouped && !isGroupLeader && (
                    <div className="absolute left-3 top-3 flex items-center gap-0.5 rounded-full bg-violet-300 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      <Lock className="h-2.5 w-2.5" />
                    </div>
                  )}

                  {/* Selection check */}
                  {isSelected && (
                    <div className="absolute left-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-white">
                      <Check className="h-3 w-3" />
                    </div>
                  )}

                  <div className={`flex h-14 w-14 items-center justify-center rounded-xl text-lg font-bold transition-colors
                    ${isGrouped
                      ? 'bg-violet-100 text-violet-600'
                      : isOccupied
                        ? 'bg-amber-100 text-amber-600'
                        : isSelected
                          ? 'bg-violet-100 text-violet-700'
                          : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 group-hover:bg-emerald-100'}`}
                  >
                    {mesa.table_number}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    Mesa {mesa.table_number}
                  </p>

                  {isGrouped && groupInfo ? (
                    <div className="mt-1 w-full">
                      {isGroupLeader ? (
                        <>
                          <p className="flex items-center justify-center gap-1 truncate text-xs font-medium text-violet-700">
                            <User className="h-3 w-3 shrink-0" />
                            {groupInfo.customerName}
                          </p>
                          <p className="flex items-center justify-center gap-1 text-xs text-violet-600">
                            <Users className="h-3 w-3" />
                            {groupInfo.partySize} pax · {groupInfo.memberTableIds.length} mesas
                          </p>
                        </>
                      ) : (
                        <p className="flex items-center justify-center gap-1 text-xs font-medium text-violet-500">
                          <Link2 className="h-3 w-3" />
                          Unido a Mesa {groupInfo.leaderTableId === mesa.id ? '' : ''}
                          {mesas.find((m) => m.id === groupInfo.leaderTableId)?.table_number ?? '?'}
                        </p>
                      )}
                    </div>
                  ) : isOccupied && orderInfo ? (
                    <div className="mt-1 w-full">
                      <p className="flex items-center justify-center gap-1 truncate text-xs font-medium text-amber-700">
                        <User className="h-3 w-3 shrink-0" />
                        {orderInfo.customerName}
                      </p>
                      <p className="flex items-center justify-center gap-1 text-xs text-amber-600">
                        <Users className="h-3 w-3" />
                        {orderInfo.partySize} pax
                      </p>
                    </div>
                  ) : (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      <Users className="h-3 w-3" />
                      {mesa.capacity} comensales
                    </p>
                  )}

                  <span className={`mt-2 rounded-full px-2.5 py-0.5 text-[10px] font-medium
                    ${isGrouped
                      ? 'bg-violet-100 text-violet-700'
                      : isOccupied
                        ? 'bg-amber-100 text-amber-700'
                        : isSelected
                          ? 'bg-violet-100 text-violet-700'
                          : 'bg-emerald-50 text-emerald-600'}`}
                  >
                    {isGrouped ? (isGroupLeader ? 'Grupo' : 'Unida') : isOccupied ? 'Ocupada' : isSelected ? 'Seleccionada' : 'Libre'}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Open table modal */}
        {openModalMesa && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setOpenModalMesa(null)} aria-hidden="true" />
            <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Store className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Abrir Mesa {openModalMesa.table_number}</h3>
                    <p className="text-xs text-slate-500">Registra los datos del cliente</p>
                  </div>
                </div>
                <button onClick={() => setOpenModalMesa(null)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" aria-label="Cerrar">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 px-6 py-5">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Nombre del cliente</label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ej: Juan Pérez"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleConfirmOpenTable()}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-700 placeholder-slate-400 transition-all focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Cantidad de comensales</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setPartySize((s) => Math.max(1, s - 1))}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <div className="flex h-10 w-16 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-lg font-bold text-slate-700">
                      {partySize}
                    </div>
                    <button
                      onClick={() => setPartySize((s) => Math.min(openModalMesa.capacity || 20, s + 1))}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <span className="text-xs text-slate-400">Máx: {openModalMesa.capacity}</span>
                  </div>
                </div>

                {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button onClick={() => setOpenModalMesa(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmOpenTable}
                    disabled={!customerName.trim() || openingTable}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {openingTable ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                    {openingTable ? 'Abriendo...' : 'Continuar al pedido'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Join tables modal */}
        {joinModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setJoinModalOpen(false)} aria-hidden="true" />
            <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                    <GitBranch className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Unir {selectedTables.length} Mesas</h3>
                    <p className="text-xs text-slate-500">
                      Mesas: {selectedTables.map((m) => m.table_number).join(', ')}
                    </p>
                  </div>
                </div>
                <button onClick={() => setJoinModalOpen(false)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" aria-label="Cerrar">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 px-6 py-5">
                <div className="rounded-lg bg-violet-50 px-3 py-2.5 text-xs text-violet-700">
                  La mesa <strong>{selectedTables[0]?.table_number}</strong> será la mesa principal (líder) del grupo.
                  Se registrará un único pedido para todo el grupo.
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Nombre del cliente (grupo)</label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={joinCustomerName}
                      onChange={(e) => setJoinCustomerName(e.target.value)}
                      placeholder="Ej: Familia Pérez"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleConfirmJoin()}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-700 placeholder-slate-400 transition-all focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Total de comensales</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setJoinPartySize((s) => Math.max(1, s - 1))}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <div className="flex h-10 w-16 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-lg font-bold text-slate-700">
                      {joinPartySize}
                    </div>
                    <button
                      onClick={() => setJoinPartySize((s) => s + 1)}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button onClick={() => setJoinModalOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmJoin}
                    disabled={!joinCustomerName.trim() || creatingGroup}
                    className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {creatingGroup ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
                    {creatingGroup ? 'Creando...' : 'Crear grupo y pedir'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Manage occupied table modal */}
        {manageMesa && manageOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => { setManageMesa(null); setManageOrder(null); setManageGroupInfo(null); setDiscountInput(''); }} aria-hidden="true" />
            <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${manageGroupInfo ? 'bg-violet-50 text-violet-600' : 'bg-amber-50 text-amber-600'}`}>
                    {manageGroupInfo ? <GitBranch className="h-5 w-5" /> : <Receipt className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      Mesa {manageMesa.table_number}
                      {manageGroupInfo && ` · Grupo de ${manageGroupInfo.memberTableIds.length} mesas`}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Cliente: {manageOrder.customerName} ({manageOrder.partySize} pax)
                      {manageGroupInfo && ` · Mesas: ${manageGroupInfo.memberTableIds.map((tid) => mesas.find((m) => m.id === tid)?.table_number ?? '?').join(', ')}`}
                    </p>
                  </div>
                </div>
                <button onClick={() => { setManageMesa(null); setManageOrder(null); setManageGroupInfo(null); setDiscountInput(''); }} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" aria-label="Cerrar">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="px-6 py-5">
                <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <ClipboardList className="h-4 w-4" />
                  Platos pedidos
                </h4>

                {loadingManage ? (
                  <div className="flex h-32 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : manageItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-8 text-center">
                    <UtensilsCrossed className="h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm text-slate-500">No hay platos en este pedido todavía</p>
                  </div>
                ) : (
                  <div className="max-h-64 space-y-2 overflow-y-auto scrollbar-thin">
                    {manageItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-700">{item.dish_name}</p>
                          <p className="text-xs text-slate-500">
                            {item.quantity} × ${item.unit_price.toFixed(2)}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-slate-700">
                          ${(item.unit_price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {manageItems.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="text-sm font-semibold text-slate-600">Subtotal</span>
                      <span className="text-xl font-bold text-slate-800">
                        ${manageTotal.toFixed(2)}
                      </span>
                    </div>

                    {/* Campo de descuento */}
                    <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-2.5">
                      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <Percent className="h-3.5 w-3.5 text-slate-400" />
                        Descuento %
                      </label>
                      <input
                        type="number"
                        value={discountInput}
                        onChange={(e) => setDiscountInput(e.target.value)}
                        placeholder="0"
                        step="0.01"
                        min="0"
                        max="100"
                        className="ml-auto w-20 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-right text-sm font-semibold text-slate-800 transition-colors focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      />
                    </div>

                    {discountPercentage > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Descuento ({discountPercentage.toFixed(2)}%)</span>
                          <span className="text-rose-500">- ${discountAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
                          <span className="text-sm font-semibold text-amber-700">Total con descuento</span>
                          <span className="text-lg font-bold text-amber-700">
                            ${finalTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-5 space-y-2">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setManageMesa(null); setManageOrder(null); setManageGroupInfo(null); setDiscountInput(''); }}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Volver
                    </button>
                    <button
                      onClick={handleAddMoreFromManage}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar más platos
                    </button>
                  </div>

                  {/* Change table button — only for non-grouped tables */}
                  {!manageGroupInfo && (
                    <button
                      onClick={handleOpenChangeTable}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-700 transition-colors hover:bg-sky-100"
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                      Cambiar de Mesa
                    </button>
                  )}

                  {manageItems.length > 0 && (
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={handlePrintTicket}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-700 transition-colors hover:bg-sky-100"
                      >
                        <Printer className="h-4 w-4" />
                        Imprimir Ticket
                      </button>
                      <button
                        onClick={handleOpenPayment}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-amber-400 hover:to-orange-500"
                      >
                        <DollarSign className="h-4 w-4" />
                        Procesar Pago y Cerrar Mesa
                      </button>
                    </div>
                  )}

                  {manageGroupInfo && (
                    <button
                      onClick={() => handleUngroup(manageGroupInfo.groupId)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-200 px-4 py-2.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
                    >
                      <Unlink className="h-4 w-4" />
                      Liberar grupo y mesas
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Change Table Modal */}
        {showChangeTableModal && manageOrder && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => !changingTable && setShowChangeTableModal(false)} aria-hidden="true" />
            <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                    <ArrowLeftRight className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Cambiar de Mesa</h3>
                    <p className="text-xs text-slate-500">
                      Mesa actual: {manageMesa?.table_number} · {manageOrder.customerName}
                    </p>
                  </div>
                </div>
                <button onClick={() => !changingTable && setShowChangeTableModal(false)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" aria-label="Cerrar">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="px-6 py-5">
                <p className="mb-3 text-xs font-medium text-slate-600">Selecciona una mesa libre</p>
                {(() => {
                  const freeTables = allTables.filter(
                    (m) => m.id !== manageMesa?.id && !orderMap.has(m.id) && !groupMap.has(m.id)
                  );
                  if (freeTables.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-8 text-center">
                        <Store className="h-8 w-8 text-slate-300" />
                        <p className="mt-2 text-sm text-slate-500">No hay mesas libres disponibles</p>
                      </div>
                    );
                  }
                  const grouped = freeTables.reduce<Record<string, Mesa[]>>((acc, m) => {
                    const terraceName = terrazas.find((t) => t.id === m.terrace_id)?.name ?? 'Sin terraza';
                    (acc[terraceName] ??= []).push(m);
                    return acc;
                  }, {});
                  return (
                    <div className="max-h-64 space-y-3 overflow-y-auto scrollbar-thin">
                      {Object.entries(grouped).map(([terraceName, tables]) => (
                        <div key={terraceName}>
                          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{terraceName}</p>
                          <div className="grid grid-cols-3 gap-2">
                            {tables.map((m) => {
                              const isSelected = targetTableId === m.id;
                              return (
                                <button
                                  key={m.id}
                                  onClick={() => setTargetTableId(m.id)}
                                  disabled={changingTable}
                                  className={`flex flex-col items-center justify-center rounded-xl border-2 px-3 py-3 transition-all duration-200
                                    ${isSelected
                                      ? 'border-sky-500 bg-sky-50 ring-1 ring-sky-200'
                                      : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50'}
                                    disabled:cursor-not-allowed disabled:opacity-50`}
                                >
                                  <span className="text-lg font-bold text-slate-700">{m.table_number}</span>
                                  <span className="text-[10px] text-slate-400">{m.capacity} pax</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>}

                <div className="mt-5 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setShowChangeTableModal(false)}
                    disabled={changingTable}
                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmChangeTable}
                    disabled={!targetTableId || changingTable}
                    className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {changingTable ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeftRight className="h-4 w-4" />}
                    {changingTable ? 'Cambiando...' : 'Confirmar cambio'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Print Ticket Modal */}
        {showTicket && manageOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowTicket(false)} aria-hidden="true" />
            <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-2">
                  <Printer className="h-5 w-5 text-sky-600" />
                  <h3 className="text-sm font-semibold text-slate-800">Pre-cuenta</h3>
                </div>
                <button onClick={() => setShowTicket(false)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" aria-label="Cerrar">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="px-6 py-5">
                {/* Ticket content */}
                <div id="ticket-print-area" className="mx-auto max-w-[280px] font-mono text-xs text-slate-800">
                  {/* Restaurant header */}
                  {restaurantSettings && (
                    <div className="mb-3 text-center">
                      <p className="text-sm font-bold uppercase">{restaurantSettings.name}</p>
                      <p className="mt-0.5">RIF: {restaurantSettings.rif}</p>
                      <p className="mt-0.5">{restaurantSettings.address}</p>
                      <p>Tel: {restaurantSettings.phone}</p>
                    </div>
                  )}

                  <div className="border-t border-dashed border-slate-300 py-2">
                    <div className="flex justify-between">
                      <span>Cliente:</span>
                      <span className="font-medium">{manageOrder.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{manageMesa ? 'Mesa:' : manageExtOrder?.order_type === 'delivery' ? 'Delivery:' : 'Retiro:'}</span>
                      <span className="font-medium">{manageMesa ? manageMesa.table_number : manageExtOrder?.order_type === 'delivery' ? 'Delivery' : 'Retirar'}</span>
                    </div>
                    {manageExtOrder?.customer_phone && (
                      <div className="flex justify-between">
                        <span>Tel:</span>
                        <span className="font-medium">{manageExtOrder.customer_phone}</span>
                      </div>
                    )}
                    {manageExtOrder?.order_type === 'delivery' && manageExtOrder.delivery_address && (
                      <div className="flex justify-between">
                        <span>Dir:</span>
                        <span className="font-medium">{manageExtOrder.delivery_address}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Fecha:</span>
                      <span className="font-medium">{new Date().toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-slate-300 py-2">
                    <div className="flex font-bold">
                      <span className="flex-1">Descripción</span>
                      <span className="w-10 text-center">Cant.</span>
                      <span className="w-16 text-right">Total</span>
                    </div>
                    <div className="mt-1 space-y-1">
                      {manageItems.map((item) => (
                        <div key={item.id} className="flex">
                          <span className="flex-1 truncate pr-1">{item.dish_name}</span>
                          <span className="w-10 text-center">{item.quantity}</span>
                          <span className="w-16 text-right">${(item.unit_price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-dashed border-slate-300 py-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-medium">${manageTotal.toFixed(2)}</span>
                    </div>
                    {discountPercentage > 0 && (
                      <>
                        <div className="flex justify-between text-rose-600">
                          <span>Descuento ({discountPercentage.toFixed(2)}%):</span>
                          <span>-${discountAmount.toFixed(2)}</span>
                        </div>
                        <div className="mt-1 flex justify-between text-sm font-bold">
                          <span>TOTAL FINAL:</span>
                          <span>${finalTotal.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                    {discountPercentage === 0 && (
                      <div className="flex justify-between text-sm font-bold">
                        <span>TOTAL:</span>
                        <span>${manageTotal.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-dashed border-slate-300 py-2 text-center text-[10px] text-slate-500">
                    <p>Gracias por su visita</p>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-3">
                  <button
                    onClick={() => setShowTicket(false)}
                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
                  >
                    <Printer className="h-4 w-4" />
                    Imprimir
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showSplitPayment && splitCtx && (
          <SplitPaymentModal
            ctx={splitCtx}
            onClose={() => setShowSplitPayment(false)}
            onPaid={async () => {
              if (manageGroupInfo) {
                try { await closeTableGroup(manageGroupInfo.groupId); } catch { /* group close best-effort */ }
              }
              await refreshData();
              setShowSplitPayment(false);
              setSplitCtx(null);
              setShowPaymentModal(false);
              setShowExtPaymentModal(false);
              setManageMesa(null);
              setManageOrder(null);
              setManageGroupInfo(null);
              setManageExtOrder(null);
              setManageItems([]);
              setDiscountInput('');
              setExtDiscountInput('');
              setSuccessMsg(splitCtx.isExternal
                ? 'Pago procesado y pedido externo cerrado correctamente'
                : 'Pago procesado y mesa liberada correctamente');
              setTimeout(() => setSuccessMsg(''), 3000);
            }}
          />
        )}

        {/* External Order Form Modal (available in both view modes) */}
        {showExternalForm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => !creatingExternal && setShowExternalForm(false)} aria-hidden="true" />
            <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                    <Bike className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Nuevo Pedido Externo</h3>
                    <p className="text-xs text-slate-500">Delivery o Retirar en local</p>
                  </div>
                </div>
                <button onClick={() => !creatingExternal && setShowExternalForm(false)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" aria-label="Cerrar">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                {/* Order type selector */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-600">Tipo de pedido</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setExtOrderType('delivery')}
                      className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all duration-200
                        ${extOrderType === 'delivery'
                          ? 'border-sky-500 bg-sky-50 text-sky-700 ring-1 ring-sky-200'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                    >
                      <Bike className="h-4 w-4" />
                      Delivery
                    </button>
                    <button
                      onClick={() => setExtOrderType('pickup')}
                      className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all duration-200
                        ${extOrderType === 'pickup'
                          ? 'border-teal-500 bg-teal-50 text-teal-700 ring-1 ring-teal-200'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                    >
                      <ShoppingBag className="h-4 w-4" />
                      Retirar
                    </button>
                  </div>
                </div>

                {/* Customer name */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Nombre del cliente <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={extCustomerName}
                    onChange={(e) => setExtCustomerName(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    disabled={creatingExternal}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 transition-colors placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Teléfono <span className="text-rose-500">*</span></label>
                  <input
                    type="tel"
                    value={extCustomerPhone}
                    onChange={(e) => setExtCustomerPhone(e.target.value)}
                    placeholder="Ej. 0414-1234567"
                    disabled={creatingExternal}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 transition-colors placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                {/* Delivery address (only for delivery) */}
                {extOrderType === 'delivery' && (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">Dirección de entrega <span className="text-rose-500">*</span></label>
                    <textarea
                      value={extDeliveryAddress}
                      onChange={(e) => setExtDeliveryAddress(e.target.value)}
                      placeholder="Ej. Av. Principal, Edif. Centro, Apto 4-B"
                      disabled={creatingExternal}
                      rows={2}
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 transition-colors placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                )}

                {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>}

                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    onClick={() => setShowExternalForm(false)}
                    disabled={creatingExternal}
                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmCreateExternal}
                    disabled={!extCustomerName.trim() || !extCustomerPhone.trim() || (extOrderType === 'delivery' && !extDeliveryAddress.trim()) || creatingExternal}
                    className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {creatingExternal ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {creatingExternal ? 'Creando...' : 'Crear y tomar pedido'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* External Order Manage Modal (available in both view modes) */}
        {manageExtOrder && manageOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={closeExtManage} aria-hidden="true" />
            <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${manageExtOrder.order_type === 'delivery' ? 'bg-sky-50 text-sky-600' : 'bg-teal-50 text-teal-600'}`}>
                    {manageExtOrder.order_type === 'delivery' ? <Bike className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      {manageExtOrder.order_type === 'delivery' ? 'Pedido Delivery' : 'Pedido Retirar'}
                    </h3>
                    <p className="text-xs text-slate-500">{manageOrder.customerName} · {manageExtOrder.customer_phone}</p>
                  </div>
                </div>
                <button onClick={closeExtManage} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" aria-label="Cerrar">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="px-6 py-5">
                {/* Customer info */}
                {manageExtOrder.order_type === 'delivery' && manageExtOrder.delivery_address && (
                  <div className="mb-3 flex items-start gap-2 rounded-lg bg-sky-50 px-3 py-2.5 text-xs text-sky-700">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{manageExtOrder.delivery_address}</span>
                  </div>
                )}

                {/* Items */}
                {loadingManage ? (
                  <div className="flex h-32 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : manageItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-8 text-center">
                    <ClipboardList className="h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm text-slate-500">No hay platos en el pedido</p>
                  </div>
                ) : (
                  <div className="max-h-64 space-y-2 overflow-y-auto scrollbar-thin">
                    {manageItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-700">
                            <span className="font-bold text-emerald-700">{item.quantity}x</span> {item.dish_name}
                          </p>
                          <p className="text-xs text-slate-500">${item.unit_price.toFixed(2)} c/u</p>
                        </div>
                        <span className="text-sm font-bold text-slate-600">
                          ${(item.unit_price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Discount + totals */}
                {manageItems.length > 0 && (
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Subtotal</span>
                      <span className="font-medium text-slate-700">${extManageTotal.toFixed(2)}</span>
                    </div>

                    {/* Campo de descuento */}
                    <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-2.5">
                      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <Percent className="h-3.5 w-3.5 text-slate-400" />
                        Descuento %
                      </label>
                      <input
                        type="number"
                        value={extDiscountInput}
                        onChange={(e) => setExtDiscountInput(e.target.value)}
                        placeholder="0"
                        step="0.01"
                        min="0"
                        max="100"
                        className="ml-auto w-20 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-right text-sm font-semibold text-slate-800 transition-colors focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      />
                    </div>

                    {extDiscountPercentage > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Descuento ({extDiscountPercentage.toFixed(2)}%)</span>
                          <span className="text-rose-500">- ${extDiscountAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
                          <span className="text-sm font-semibold text-amber-700">Total con descuento</span>
                          <span className="text-lg font-bold text-amber-700">${extFinalTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                    {extDiscountPercentage === 0 && (
                      <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                        <span className="text-sm font-semibold text-slate-700">Total</span>
                        <span className="text-xl font-bold text-slate-800">${extFinalTotal.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-5 space-y-2">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={closeExtManage}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Volver
                    </button>
                    <button
                      onClick={handleAddMoreFromExtManage}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar más platos
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handlePrintExtTicket}
                      disabled={manageItems.length === 0}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-700 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Printer className="h-4 w-4" />
                      Imprimir Ticket
                    </button>
                    <button
                      onClick={handleOpenExtPayment}
                      disabled={manageItems.length === 0}
                      className="flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-amber-400 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <DollarSign className="h-4 w-4" />
                      Procesar Pago
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* External Ticket Modal (decoupled) */}
        {showExtTicket && manageExtOrder && manageOrder && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowExtTicket(false)} aria-hidden="true" />
            <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-2">
                  <Printer className="h-5 w-5 text-sky-600" />
                  <h3 className="text-sm font-semibold text-slate-800">Ticket Pedido Externo</h3>
                </div>
                <button onClick={() => setShowExtTicket(false)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" aria-label="Cerrar">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="px-6 py-5">
                <div id="ext-ticket-print-area" className="mx-auto max-w-[280px] font-mono text-xs text-slate-800">
                  {restaurantSettings && (
                    <div className="mb-3 text-center">
                      <p className="text-sm font-bold uppercase">{restaurantSettings.name}</p>
                      <p className="mt-0.5">RIF: {restaurantSettings.rif}</p>
                      <p className="mt-0.5">{restaurantSettings.address}</p>
                      <p>Tel: {restaurantSettings.phone}</p>
                    </div>
                  )}

                  <div className="border-t border-dashed border-slate-300 py-2">
                    <div className="flex justify-between">
                      <span>Cliente:</span>
                      <span className="font-medium">{manageOrder.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tipo:</span>
                      <span className="font-medium">{manageExtOrder.order_type === 'delivery' ? 'Delivery' : 'Retirar'}</span>
                    </div>
                    {manageExtOrder.customer_phone && (
                      <div className="flex justify-between">
                        <span>Tel:</span>
                        <span className="font-medium">{manageExtOrder.customer_phone}</span>
                      </div>
                    )}
                    {manageExtOrder.order_type === 'delivery' && manageExtOrder.delivery_address && (
                      <div className="flex justify-between">
                        <span>Dir:</span>
                        <span className="font-medium">{manageExtOrder.delivery_address}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Fecha:</span>
                      <span className="font-medium">{new Date().toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-slate-300 py-2">
                    <div className="flex font-bold">
                      <span className="flex-1">Descripción</span>
                      <span className="w-10 text-center">Cant.</span>
                      <span className="w-16 text-right">Total</span>
                    </div>
                    <div className="mt-1 space-y-1">
                      {manageItems.map((item) => (
                        <div key={item.id} className="flex">
                          <span className="flex-1 truncate pr-1">{item.dish_name}</span>
                          <span className="w-10 text-center">{item.quantity}</span>
                          <span className="w-16 text-right">${(item.unit_price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-dashed border-slate-300 py-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-medium">${extManageTotal.toFixed(2)}</span>
                    </div>
                    {extDiscountPercentage > 0 && (
                      <>
                        <div className="flex justify-between text-rose-600">
                          <span>Descuento ({extDiscountPercentage.toFixed(2)}%):</span>
                          <span>-${extDiscountAmount.toFixed(2)}</span>
                        </div>
                        <div className="mt-1 flex justify-between text-sm font-bold">
                          <span>TOTAL FINAL:</span>
                          <span>${extFinalTotal.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                    {extDiscountPercentage === 0 && (
                      <div className="flex justify-between text-sm font-bold">
                        <span>TOTAL:</span>
                        <span>${extManageTotal.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-dashed border-slate-300 py-2 text-center text-[10px] text-slate-500">
                    <p>Gracias por su preferencia</p>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-3">
                  <button
                    onClick={() => setShowExtTicket(false)}
                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
                  >
                    <Printer className="h-4 w-4" />
                    Imprimir
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        </div>
      );
  }

  // ===== ORDERING SCREEN =====
  const groupTableNumbers = activeGroupInfo
    ? activeGroupInfo.memberTableIds.map((tid) => mesas.find((m) => m.id === tid)?.table_number ?? '?').join(', ')
    : null;

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToTables}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
          >
            <ChevronLeft className="h-4 w-4" />
            Mesas
          </button>
          <div className="h-6 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold ring-1
              ${activeGroupInfo
                ? 'bg-violet-50 text-violet-700 ring-violet-100'
                : activeExtOrder
                  ? 'bg-sky-50 text-sky-700 ring-sky-100'
                  : 'bg-emerald-50 text-emerald-700 ring-emerald-100'}`}
            >
              {activeMesa?.table_number ?? (activeExtOrder ? <Bike className="h-4 w-4" /> : '?')}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">
                {activeGroupInfo ? `Grupo · Mesas ${groupTableNumbers}` : activeExtOrder ? (activeExtOrder.order_type === 'delivery' ? 'Pedido Delivery' : 'Pedido Retirar') : `Mesa ${activeMesa?.table_number}`}
              </p>
              <p className="text-xs text-slate-500">
                {customerName || 'Cliente'}
                {activeExtOrder?.customer_phone ? ` · ${activeExtOrder.customer_phone}` : ` · ${partySize} comensales`}
              </p>
            </div>
          </div>
          {isAddingToExisting && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              Pedido en curso
            </span>
          )}
          {activeGroupInfo && !isAddingToExisting && (
            <span className="flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
              <GitBranch className="h-3 w-3" />
              Mesa principal
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {cartCount} {cartCount === 1 ? 'plato' : 'platos'} nuevos
          </span>
        </div>
      </div>

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

      {loadingMenu ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
          {/* Menu browser */}
          <div className="space-y-4">
            {/* Menu selector */}
            {menus.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {menus.map((m) => {
                  const isActive = m.id === activeMenuId;
                  return (
                    <button
                      key={m.id}
                      onClick={() => handleMenuChange(m.id)}
                      className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all
                        ${isActive
                          ? 'bg-slate-900 text-white shadow-md'
                          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                      <UtensilsCrossed className={`h-4 w-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                      {m.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Category chips */}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const isActive = cat.id === activeCategoryId;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryClick(cat.id)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all
                        ${isActive
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Dishes */}
            {dishes.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-12 text-center">
                <UtensilsCrossed className="h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">No hay platos disponibles en esta categoría</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {dishes.map((dish) => {
                  const qty = getCartQty(dish.id);
                  return (
                    <div
                      key={dish.id}
                      className={`rounded-xl border bg-white p-4 shadow-sm transition-all duration-200
                        ${qty > 0 ? 'border-emerald-300 ring-1 ring-emerald-100' : 'border-slate-200 hover:shadow-md'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-semibold text-slate-800">{dish.name}</h4>
                          {dish.description && (
                            <p className="mt-0.5 text-xs leading-relaxed text-slate-500 line-clamp-2">{dish.description}</p>
                          )}
                          {dish.ingredients && dish.ingredients.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {dish.ingredients.slice(0, 3).map((ing) => (
                                <span key={ing} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                  {ing}
                                </span>
                              ))}
                              {dish.ingredients.length > 3 && (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                                  +{dish.ingredients.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <span className="shrink-0 text-lg font-bold text-emerald-600">
                          ${dish.price.toFixed(2)}
                        </span>
                      </div>

                      {/* Add/Remove controls */}
                      <div className="mt-3 flex items-center justify-end">
                        {qty > 0 ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => removeFromCart(dish.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-8 text-center text-sm font-bold text-slate-700">{qty}</span>
                            <button
                              onClick={() => addToCart(dish)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white transition-colors hover:bg-emerald-700"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(dish)}
                            className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-100"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Agregar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cart sidebar */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                <ShoppingCart className="h-5 w-5 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-700">
                  {isAddingToExisting ? (activeExtOrder ? 'Gestión del pedido' : 'Gestión de la mesa') : activeGroupInfo ? 'Pedido del grupo' : activeExtOrder ? 'Resumen del pedido' : 'Resumen del pedido'}
                </h3>
                <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                  {cartCount} nuevos
                </span>
              </div>

              <div className="max-h-[420px] overflow-y-auto scrollbar-thin">
                {/* Previous order items */}
                {isAddingToExisting && existingItems.length > 0 && (
                  <div className="border-b border-slate-100">
                    <div className="flex items-center gap-2 bg-amber-50/60 px-4 py-2.5">
                      <Receipt className="h-4 w-4 text-amber-600" />
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-700">Pedido anterior</h4>
                    </div>
                    <div className="divide-y divide-amber-50">
                      {existingItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-700">
                              <span className="font-bold text-amber-700">{item.quantity}×</span> {item.dish_name}
                            </p>
                            <p className="text-xs text-slate-500">${item.unit_price.toFixed(2)} c/u</p>
                          </div>
                          <span className="text-sm font-bold text-slate-600">
                            ${(item.unit_price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between bg-amber-50/40 px-4 py-2">
                      <span className="text-xs font-medium text-amber-700">Subtotal anterior</span>
                      <span className="text-sm font-bold text-amber-700">${existingTotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* New items section */}
                {isAddingToExisting && (
                  <div className="flex items-center gap-2 bg-emerald-50/60 px-4 py-2.5">
                    <Plus className="h-4 w-4 text-emerald-600" />
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Nuevos platos</h4>
                  </div>
                )}

                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <ClipboardList className="h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm text-slate-500">
                      {isAddingToExisting ? 'No hay platos nuevos aún' : 'No hay platos en el pedido'}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">Usa los botones + del menú para agregar</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {cart.map((item) => (
                      <div key={item.dish_id} className="flex items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-700">
                            <span className="font-bold text-emerald-700">{item.quantity}×</span> {item.dish_name}
                          </p>
                          <p className="text-xs text-slate-500">${item.unit_price.toFixed(2)} c/u</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => removeFromCart(item.dish_id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm font-bold text-slate-700">{item.quantity}</span>
                          <button
                            onClick={() => addToCart({ id: item.dish_id, name: item.dish_name, price: item.unit_price, description: null, ingredients: null, is_available: true, category_id: '' } as Dish)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white transition-colors hover:bg-emerald-700"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="w-16 text-right text-sm font-bold text-slate-700">
                          ${(item.unit_price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totals + send */}
              <div className="border-t border-slate-100 p-4">
                {isAddingToExisting && existingItems.length > 0 && (
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Subtotal pedido anterior</span>
                    <span className="font-medium text-amber-700">${existingTotal.toFixed(2)}</span>
                  </div>
                )}
                {isAddingToExisting && (
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Subtotal nuevos platos</span>
                    <span className="font-medium text-emerald-700">${cartTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="mb-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                  <span className="text-sm font-semibold text-slate-700">
                    {isAddingToExisting ? (activeExtOrder ? 'Total del pedido' : 'Total de la mesa') : activeGroupInfo ? 'Total del grupo' : 'Total'}
                  </span>
                  <span className="text-2xl font-bold text-slate-800">${grandTotal.toFixed(2)}</span>
                </div>
                <button
                  onClick={handleSendOrder}
                  disabled={sending || cart.length === 0}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 transition-all hover:from-emerald-400 hover:to-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sending ? 'Enviando...' : isAddingToExisting ? 'Enviar nuevos platos a cocina' : activeGroupInfo ? 'Enviar Pedido del Grupo a Cocina' : activeExtOrder ? 'Enviar Pedido a Cocina' : 'Enviar Pedido a Cocina'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
