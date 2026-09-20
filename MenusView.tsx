import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  UtensilsCrossed,
  FolderPlus,
} from 'lucide-react';
import MenuModal from '@/components/MenuModal';
import CategoryModal from '@/components/CategoryModal';
import DishModal, { type DishFormData } from '@/components/DishModal';
import {
  type Menu,
  type Category,
  type Dish,
  fetchMenus,
  createMenu,
  updateMenu,
  deleteMenu,
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  fetchDishes,
  createDish,
  updateDish,
  toggleDishAvailability,
  deleteDish,
} from '@/lib/menuDb';

export default function MenusView() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dishesByCategory, setDishesByCategory] = useState<Record<string, Dish[]>>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Modal state
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<{ id: string; name: string } | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string } | null>(null);
  const [dishModalOpen, setDishModalOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [dishModalCategoryId, setDishModalCategoryId] = useState<string | null>(null);

  const activeMenu = menus.find((m) => m.id === activeMenuId);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const m = await fetchMenus();
        if (cancelled) return;
        setMenus(m);
        if (m.length > 0) {
          setActiveMenuId(m[0].id);
        }
      } catch {
        if (!cancelled) setError('No se pudieron cargar las cartas.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const loadCategories = useCallback(async (menuId: string) => {
    try {
      const cats = await fetchCategories(menuId);
      setCategories(cats);
      const dishesMap: Record<string, Dish[]> = {};
      await Promise.all(
        cats.map(async (cat) => {
          const d = await fetchDishes(cat.id);
          dishesMap[cat.id] = d;
        })
      );
      setDishesByCategory(dishesMap);
      setExpandedCategories(new Set(cats.map((c) => c.id)));
    } catch {
      setError('No se pudieron cargar las categorías.');
    }
  }, []);

  useEffect(() => {
    if (activeMenuId) {
      loadCategories(activeMenuId);
    } else {
      setCategories([]);
      setDishesByCategory({});
    }
  }, [activeMenuId, loadCategories]);

  // Menu handlers
  const handleSaveMenu = async (name: string) => {
    if (editingMenu) {
      const updated = await updateMenu(editingMenu.id, name);
      setMenus((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } else {
      const created = await createMenu(name);
      setMenus((prev) => [...prev, created]);
      setActiveMenuId(created.id);
    }
  };

  const handleDeleteMenu = async (id: string) => {
    try {
      await deleteMenu(id);
      const remaining = menus.filter((m) => m.id !== id);
      setMenus(remaining);
      if (activeMenuId === id) {
        setActiveMenuId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch {
      setError('No se pudo eliminar la carta.');
    }
  };

  // Category handlers
  const handleSaveCategory = async (name: string) => {
    if (editingCategory) {
      const updated = await updateCategory(editingCategory.id, name);
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } else if (activeMenuId) {
      const created = await createCategory(activeMenuId, name);
      setCategories((prev) => [...prev, created]);
      setDishesByCategory((prev) => ({ ...prev, [created.id]: [] }));
      setExpandedCategories((prev) => new Set([...prev, created.id]));
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setDishesByCategory((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    } catch {
      setError('No se pudo eliminar la categoría.');
    }
  };

  // Dish handlers
  const handleSaveDish = async (data: DishFormData) => {
    const priceNum = parseFloat(data.price);
    if (editingDish) {
      const updated = await updateDish(editingDish.id, data.name, data.description, priceNum, data.ingredients);
      setDishesByCategory((prev) => ({
        ...prev,
        [editingDish.category_id]: (prev[editingDish.category_id] ?? []).map((d) =>
          d.id === updated.id ? updated : d
        ),
      }));
      if (editingDish.category_id !== data.categoryId) {
        const moved = await fetchDishes(data.categoryId);
        setDishesByCategory((prev) => ({ ...prev, [data.categoryId]: moved }));
      }
    } else {
      const created = await createDish(data.categoryId, data.name, data.description, priceNum, data.ingredients);
      setDishesByCategory((prev) => ({
        ...prev,
        [data.categoryId]: [...(prev[data.categoryId] ?? []), created].sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
      }));
    }
  };

  const handleToggleDish = async (dish: Dish) => {
    setTogglingId(dish.id);
    const newVal = !dish.is_available;
    setDishesByCategory((prev) => ({
      ...prev,
      [dish.category_id]: (prev[dish.category_id] ?? []).map((d) =>
        d.id === dish.id ? { ...d, is_available: newVal } : d
      ),
    }));
    try {
      await toggleDishAvailability(dish.id, newVal);
    } catch {
      setDishesByCategory((prev) => ({
        ...prev,
        [dish.category_id]: (prev[dish.category_id] ?? []).map((d) =>
          d.id === dish.id ? { ...d, is_available: !newVal } : d
        ),
      }));
      setError('No se pudo actualizar el plato.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteDish = async (dish: Dish) => {
    setDishesByCategory((prev) => ({
      ...prev,
      [dish.category_id]: (prev[dish.category_id] ?? []).filter((d) => d.id !== dish.id),
    }));
    try {
      await deleteDish(dish.id);
    } catch {
      setError('No se pudo eliminar el plato.');
      loadCategories(activeMenuId!);
    }
  };

  const toggleCategoryExpand = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
      {/* Menu selector tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {menus.map((menu) => {
          const isActive = menu.id === activeMenuId;
          return (
            <div key={menu.id} className="group relative flex shrink-0 items-center">
              <button
                onClick={() => setActiveMenuId(menu.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200
                  ${isActive
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                <BookOpen className={`h-4 w-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                {menu.name}
              </button>
              <button
                onClick={() => {
                  setEditingMenu({ id: menu.id, name: menu.name });
                  setMenuModalOpen(true);
                }}
                className="ml-0.5 rounded-lg p-1 text-slate-300 opacity-0 transition-opacity hover:text-slate-600 group-hover:opacity-100"
                aria-label="Editar carta"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                onClick={() => handleDeleteMenu(menu.id)}
                className="rounded-lg p-1 text-slate-300 opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100"
                aria-label="Eliminar carta"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          );
        })}
        <button
          onClick={() => {
            setEditingMenu(null);
            setMenuModalOpen(true);
          }}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:border-emerald-400 hover:text-emerald-600"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nueva carta</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {activeMenu ? (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-700">{activeMenu.name}</h3>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                {categories.length} {categories.length === 1 ? 'categoría' : 'categorías'}
              </span>
            </div>
            <button
              onClick={() => {
                setEditingCategory(null);
                setCategoryModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              <FolderPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Nueva categoría</span>
            </button>
          </div>

          {/* Categories with dishes */}
          {categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 text-center">
              <FolderPlus className="h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">No hay categorías en esta carta</p>
              <button
                onClick={() => {
                  setEditingCategory(null);
                  setCategoryModalOpen(true);
                }}
                className="mt-4 flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" />
                Crear la primera categoría
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map((cat) => {
                const isExpanded = expandedCategories.has(cat.id);
                const catDishes = dishesByCategory[cat.id] ?? [];
                return (
                  <div key={cat.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    {/* Category header */}
                    <div className="flex items-center gap-2 px-4 py-3">
                      <button
                        onClick={() => toggleCategoryExpand(cat.id)}
                        className="flex flex-1 items-center gap-2 text-left"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        )}
                        <span className="text-sm font-semibold text-slate-700">{cat.name}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                          {catDishes.length} {catDishes.length === 1 ? 'plato' : 'platos'}
                        </span>
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setDishModalCategoryId(cat.id);
                            setEditingDish(null);
                            setDishModalOpen(true);
                          }}
                          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-50"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Añadir plato</span>
                        </button>
                        <button
                          onClick={() => {
                            setEditingCategory({ id: cat.id, name: cat.name });
                            setCategoryModalOpen(true);
                          }}
                          className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-600"
                          aria-label="Editar categoría"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                          aria-label="Eliminar categoría"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Dishes */}
                    {isExpanded && (
                      <div className="border-t border-slate-100">
                        {catDishes.length === 0 ? (
                          <div className="px-4 py-6 text-center">
                            <UtensilsCrossed className="mx-auto h-8 w-8 text-slate-200" />
                            <p className="mt-2 text-xs text-slate-400">No hay platos en esta categoría</p>
                            <button
                              onClick={() => {
                                setDishModalCategoryId(cat.id);
                                setEditingDish(null);
                                setDishModalOpen(true);
                              }}
                              className="mt-3 flex items-center gap-1.5 mx-auto rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Añadir plato
                            </button>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-50">
                            {catDishes.map((dish) => (
                              <div
                                key={dish.id}
                                className={`flex flex-col gap-3 px-4 py-4 transition-opacity sm:flex-row sm:items-start sm:justify-between ${
                                  dish.is_available ? '' : 'opacity-50'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-semibold text-slate-800">{dish.name}</h4>
                                    <span className="text-sm font-bold text-emerald-600">
                                      ${dish.price.toFixed(2)}
                                    </span>
                                  </div>
                                  {dish.description && (
                                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                                      {dish.description}
                                    </p>
                                  )}
                                  {dish.ingredients && dish.ingredients.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                      {dish.ingredients.map((ing) => (
                                        <span
                                          key={ing}
                                          className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                                        >
                                          {ing}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <div className="flex shrink-0 items-center gap-3 sm:pl-4">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs font-medium ${dish.is_available ? 'text-emerald-600' : 'text-slate-400'}`}>
                                      {dish.is_available ? 'Disponible' : 'Agotado'}
                                    </span>
                                    <button
                                      onClick={() => handleToggleDish(dish)}
                                      disabled={togglingId === dish.id}
                                      className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 disabled:cursor-wait"
                                      style={{ backgroundColor: dish.is_available ? '#10b981' : '#cbd5e1' }}
                                      role="switch"
                                      aria-checked={dish.is_available}
                                      aria-label={`${dish.name} ${dish.is_available ? 'disponible' : 'agotado'}`}
                                    >
                                      <span
                                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                                          dish.is_available ? 'translate-x-5' : 'translate-x-1'
                                        }`}
                                      />
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => {
                                        setEditingDish(dish);
                                        setDishModalCategoryId(null);
                                        setDishModalOpen(true);
                                      }}
                                      className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-700"
                                      aria-label="Editar plato"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteDish(dish)}
                                      className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                                      aria-label="Eliminar plato"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 text-center">
          <BookOpen className="h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">No hay cartas creadas todavía</p>
          <button
            onClick={() => {
              setEditingMenu(null);
              setMenuModalOpen(true);
            }}
            className="mt-4 flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Crear la primera carta
          </button>
        </div>
      )}

      {/* Modals */}
      <MenuModal
        open={menuModalOpen}
        editingMenu={editingMenu}
        onClose={() => setMenuModalOpen(false)}
        onSave={handleSaveMenu}
      />
      <CategoryModal
        open={categoryModalOpen}
        editingCategory={editingCategory}
        onClose={() => setCategoryModalOpen(false)}
        onSave={handleSaveCategory}
      />
      <DishModal
        open={dishModalOpen}
        editingDish={editingDish}
        categories={categories}
        defaultCategoryId={dishModalCategoryId}
        onClose={() => setDishModalOpen(false)}
        onSave={handleSaveDish}
      />
    </div>
  );
}
