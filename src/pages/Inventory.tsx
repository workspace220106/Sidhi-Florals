import { useMemo, useState, type FormEvent } from "react";
import { m } from "motion/react";
import { Plus, Pencil, Trash2, Flower2, Gift, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { toast } from "sonner";
import { useProducts, useRecipes, useBouquetAvailability, useCreateProduct, useUpdateProduct, useDeleteProduct, useSaveRecipe } from "@/api/products";
import { useProfitMargins } from "@/api/analytics";
import type { Product, ProductInput } from "@/api/types";
import { PageHeader } from "@/components/layout/AppLayout";
import { Tabs } from "@/components/ui/Tabs";
import { SearchInput } from "@/components/ui/SearchInput";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Select, Field } from "@/components/ui/Input";
import { TableSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { BouquetBuilder, type BuilderResult } from "@/components/BouquetBuilder";
import { errorMessage } from "@/lib/supabase";
import { shortageText } from "@/lib/bouquet";
import { cn, displayName, formatCurrency } from "@/lib/utils";

type Tab = "stock" | "bouquets" | "margins";
const UNITS = ["stem", "bunch", "kg", "dozen", "piece", "sheet", "garland"];
const empty = (category: ProductInput["category"]): ProductInput => ({ name: "", variety: "", unit: category === "bouquet" ? "piece" : "stem", category, purchase_price: 0, selling_price: 0, stock: 0, supplier: "" });

export default function Inventory() {
  const [tab, setTab] = useState<Tab>("stock");
  const [search, setSearch] = useState("");
  const { data: products, isPending } = useProducts();
  const { data: recipes } = useRecipes();
  const { data: availability } = useBouquetAvailability();
  const { data: margins, isPending: marginsPending } = useProfitMargins();
  const create = useCreateProduct(); const update = useUpdateProduct(); const del = useDeleteProduct(); const saveRecipe = useSaveRecipe();

  const [form, setForm] = useState<ProductInput | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [recipeFor, setRecipeFor] = useState<Product | null>(null);

  const q = search.trim().toLowerCase();
  const stockItems = useMemo(() => (products ?? []).filter((p) => p.category !== "bouquet" && (!q || displayName(p).toLowerCase().includes(q))), [products, q]);
  const bouquets = useMemo(() => (products ?? []).filter((p) => p.category === "bouquet" && (!q || p.name.toLowerCase().includes(q))), [products, q]);
  const availMap = useMemo(() => new Map((availability ?? []).map((a) => [a.bouquet_id, a])), [availability]);
  const byId = useMemo(() => new Map((products ?? []).map((p) => [p.id, p])), [products]);

  const openNew = (category: ProductInput["category"]) => { setEditId(null); setForm(empty(category)); };
  const openEdit = (p: Product) => {
    setEditId(p.id);
    setForm({ name: p.name, variety: p.variety, unit: p.unit, category: p.category, purchase_price: p.purchase_price, selling_price: p.selling_price, stock: p.stock, supplier: p.supplier });
  };

  const submitForm = (e: FormEvent) => {
    e.preventDefault(); if (!form) return;
    const opts = { onSuccess: () => { setForm(null); toast.success(editId ? "Updated" : "Added"); }, onError: (err: unknown) => toast.error(errorMessage(err)) };
    if (editId) update.mutate({ id: editId, ...form }, opts); else create.mutate(form, opts);
  };
  const remove = (p: Product) => { if (confirm(`Delete ${displayName(p)}?`)) del.mutate(p.id, { onError: (err) => toast.error(errorMessage(err)), onSuccess: () => toast.success("Deleted") }); };

  const recipeInitial = (b: Product): BuilderResult => ({
    price: 0, label: "",
    components: (recipes ?? []).filter((r) => r.bouquet_id === b.id).flatMap((r) => {
      const c = byId.get(r.component_id); if (!c) return [];
      return [{ productId: c.id, name: displayName(c), quantity: r.quantity, unitCost: c.purchase_price, sellingPrice: c.selling_price, stock: c.stock, unit: c.unit }];
    }),
  });
  const submitRecipe = (r: BuilderResult) => {
    if (!recipeFor) return;
    saveRecipe.mutate({ bouquetId: recipeFor.id, rows: r.components.map((c) => ({ component_id: c.productId, quantity: c.quantity })) },
      { onSuccess: () => { setRecipeFor(null); toast.success("Recipe saved"); }, onError: (err) => toast.error(errorMessage(err)) });
  };

  const iconBtn = "p-2 rounded-lg text-muted cursor-pointer transition-colors";

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" subtitle="Flowers, accessories, bouquet recipes and margins."
        actions={<>
          <SearchInput value={search} onChange={setSearch} placeholder="Search…" className="flex-1 sm:w-56" />
          {tab === "stock" && <Button onClick={() => openNew("flower")}><Plus className="w-4 h-4" /> Add Item</Button>}
          {tab === "bouquets" && <Button onClick={() => openNew("bouquet")}><Plus className="w-4 h-4" /> Add Bouquet</Button>}
        </>} />

      <Tabs id="inventory" value={tab} onChange={setTab} items={[
        { value: "stock", label: "Flowers & Accessories", icon: Flower2 }, { value: "bouquets", label: "Bouquets", icon: Gift }, { value: "margins", label: "Profit Margins", icon: TrendingUp }]} />

      {tab === "stock" && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="table-head border-b border-border"><th className="p-4">Item</th><th className="p-4">Unit</th><th className="p-4">Purchase</th><th className="p-4">Selling</th><th className="p-4">Stock</th><th className="p-4">Supplier</th><th className="p-4 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-border">
                {isPending && !products ? <tr><td colSpan={7}><TableSkeleton cols={7} /></td></tr> : stockItems.map((p, i) => (
                  <m.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 12) * 0.03 }} className="hover:bg-background/60">
                    <td className="p-4 font-semibold">{displayName(p)}<span className="ml-2 text-[10px] uppercase text-muted">{p.category}</span></td>
                    <td className="p-4 text-muted">{p.unit}</td>
                    <td className="p-4 text-muted">{formatCurrency(p.purchase_price)}</td>
                    <td className="p-4 font-medium">{formatCurrency(p.selling_price)}</td>
                    <td className="p-4"><span className={cn("stock-badge", p.stock <= 20 ? "bg-danger-soft text-danger" : "bg-secondary-soft text-secondary")}>{p.stock}</span></td>
                    <td className="p-4 text-muted">{p.supplier}</td>
                    <td className="p-4"><div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(p)} className={cn(iconBtn, "hover:text-primary hover:bg-primary-soft")} aria-label="Edit"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => remove(p)} className={cn(iconBtn, "hover:text-danger hover:bg-danger-soft")} aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div></td>
                  </m.tr>
                ))}
                {!isPending && stockItems.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted">No items yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "bouquets" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {isPending && !products ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44" />) : bouquets.map((b, i) => {
            const rows = (recipes ?? []).filter((r) => r.bouquet_id === b.id);
            const a = availMap.get(b.id);
            const cost = rows.reduce((s, r) => s + r.quantity * (byId.get(r.component_id)?.purchase_price ?? 0), 0);
            return (
              <m.div key={b.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card card-hover p-5 flex flex-col border-t-4 border-t-accent">
                <div className="flex justify-between items-start gap-2">
                  <div><h3 className="text-lg">{b.name}</h3>{b.variety && <p className="text-xs text-muted">{b.variety}</p>}</div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(b)} className={cn(iconBtn, "hover:text-primary hover:bg-primary-soft")} aria-label="Edit"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(b)} className={cn(iconBtn, "hover:text-danger hover:bg-danger-soft")} aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <ul className="mt-3 text-sm text-muted space-y-0.5 flex-1">
                  {rows.length === 0 && <li className="italic">No recipe yet</li>}
                  {rows.map((r) => { const c = byId.get(r.component_id); return <li key={r.id}>{r.quantity} × {c ? displayName(c) : "?"}</li>; })}
                </ul>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-sm">
                  <span>Cost {formatCurrency(cost)} · <span className="font-semibold text-primary">{formatCurrency(b.selling_price)}</span></span>
                  <span className={cn("stock-badge", (a?.can_make ?? 0) > 0 ? "bg-secondary-soft text-secondary" : "bg-danger-soft text-danger")}>Can make {a?.can_make ?? 0}</span>
                </div>
                {a && a.shortages.length > 0 && <p className="text-[11px] text-danger mt-1">{shortageText(a.shortages)}</p>}
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setRecipeFor(b)}>Edit recipe</Button>
              </m.div>
            );
          })}
          {!isPending && bouquets.length === 0 && <p className="col-span-full text-center text-muted p-8">No bouquets yet. Add one, then define its recipe.</p>}
        </div>
      )}

      {tab === "margins" && (
        <div className="card overflow-hidden border-t-4 border-t-primary">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="table-head border-b border-border"><th className="p-4">Product</th><th className="p-4">Cost / Sell</th><th className="p-4">Profit / unit</th><th className="p-4">Margin</th><th className="p-4">Sold</th><th className="p-4">Revenue</th><th className="p-4 text-right">Profit</th></tr></thead>
              <tbody className="divide-y divide-border">
                {marginsPending && !margins ? <tr><td colSpan={7}><TableSkeleton cols={7} /></td></tr> : (margins ?? []).filter((r) => !q || displayName(r).toLowerCase().includes(q)).map((r) => {
                  const hi = r.profit_margin_percent >= 40, mid = r.profit_margin_percent >= 20 && !hi;
                  const Icon = hi ? TrendingUp : mid ? Minus : TrendingDown;
                  return (
                    <tr key={r.id} className="hover:bg-background/60">
                      <td className="p-4"><p className="font-semibold">{displayName(r)}</p><p className="text-xs text-muted capitalize">{r.category} · {r.unit}</p></td>
                      <td className="p-4 text-muted text-sm">{formatCurrency(r.purchase_price)} / {formatCurrency(r.selling_price)}</td>
                      <td className="p-4 font-medium text-secondary">{formatCurrency(r.profit_per_unit)}</td>
                      <td className="p-4"><span className={cn("inline-flex items-center gap-1 stock-badge", hi ? "bg-secondary-soft text-secondary" : mid ? "bg-accent-soft text-amber-800" : "bg-danger-soft text-danger")}><Icon className="w-3.5 h-3.5" />{r.profit_margin_percent.toFixed(1)}%</span></td>
                      <td className="p-4 text-muted">{r.total_units_sold}</td>
                      <td className="p-4 text-muted">{formatCurrency(r.total_revenue)}</td>
                      <td className="p-4 font-bold text-right">{formatCurrency(r.total_profit)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)} title={editId ? "Edit item" : form?.category === "bouquet" ? "New bouquet" : "New item"}>
        {form && (
          <form onSubmit={submitForm} className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Field label="Name"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field></div>
            <Field label="Variety / colour"><Input value={form.variety} onChange={(e) => setForm({ ...form, variety: e.target.value })} placeholder="Red, White…" /></Field>
            <Field label="Category">
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ProductInput["category"] })} disabled={!!editId}>
                <option value="flower">Flower</option><option value="accessory">Accessory</option><option value="bouquet">Bouquet</option>
              </Select>
            </Field>
            {form.category !== "bouquet" && <>
              <Field label="Unit"><Select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>{UNITS.map((u) => <option key={u}>{u}</option>)}</Select></Field>
              <Field label="Purchase price (₹)"><Input required type="number" step="0.01" min={0} value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: Number(e.target.value) })} /></Field>
            </>}
            <Field label="Selling price (₹)"><Input required type="number" step="0.01" min={0} value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: Number(e.target.value) })} /></Field>
            {form.category !== "bouquet" && <>
              <Field label="Stock"><Input required type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} /></Field>
              <Field label="Supplier"><Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></Field>
            </>}
            <div className="col-span-2 flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
              <Button type="submit" loading={create.isPending || update.isPending}>{editId ? "Update" : "Save"}</Button>
            </div>
          </form>
        )}
      </Dialog>

      {recipeFor && (
        <BouquetBuilder open onOpenChange={(o) => !o && setRecipeFor(null)} mode="recipe" products={products ?? []} initial={recipeInitial(recipeFor)} onSubmit={submitRecipe} submitting={saveRecipe.isPending} />
      )}
    </div>
  );
}
