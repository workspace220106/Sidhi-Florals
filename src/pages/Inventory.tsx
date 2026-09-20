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
                  <m.tr key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.025 }} className="hover:bg-primary-soft/30 hover:translate-x-1 transition-all duration-150">
                    <td className="p-4 font-semibold text-foreground">{displayName(p)}<span className="ml-2 text-[10px] uppercase font-bold text-muted bg-secondary-soft px-2 py-0.5 rounded-full">{p.category}</span></td>
                    <td className="p-4 text-muted">{p.unit}</td>
                    <td className="p-4 text-muted">{formatCurrency(p.purchase_price)}</td>
                    <td className="p-4 font-bold text-foreground">{formatCurrency(p.selling_price)}</td>
                    <td className="p-4">
                      <span className={cn("stock-badge font-bold", p.stock <= 20 ? "bg-primary-soft text-primary border border-primary-border/60" : "bg-secondary-soft text-foreground border border-border")}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="p-4 text-muted">{p.supplier || "—"}</td>
                    <td className="p-4"><div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(p)} className={cn(iconBtn, "hover:text-primary hover:bg-primary-soft")} aria-label="Edit"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => remove(p)} className={cn(iconBtn, "hover:text-primary hover:bg-primary-soft")} aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div></td>
                  </m.tr>
                ))}
              </tbody>
            </table>
          </div>
          {!isPending && stockItems.length === 0 && <p className="text-center text-muted p-12">No stock items found.</p>}
        </div>
      )}

      {tab === "bouquets" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {isPending && !products ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />) : bouquets.map((b, i) => {
            const a = availMap.get(b.id);
            const can = a?.can_make ?? 0;
            const bRecipes = (recipes ?? []).filter((r) => r.bouquet_id === b.id);
            return (
              <m.div key={b.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }}
                className="card card-hover p-6 flex flex-col justify-between border-t-4 border-t-primary">
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="text-xl font-bold text-foreground">{b.name}</h3>
                    <span className={cn("stock-badge font-bold", can > 0 ? "bg-primary-soft text-primary border border-primary-border/60" : "bg-secondary-soft text-muted")}>
                      {can > 0 ? `Can make ${can}` : "Shortage"}
                    </span>
                  </div>
                  <p className="text-2xl font-display font-bold text-primary mb-3">{formatCurrency(b.selling_price)}</p>
                  
                  {bRecipes.length === 0 ? (
                    <p className="text-xs text-muted italic bg-secondary-soft p-2.5 rounded-xl border border-border">No recipe configured yet.</p>
                  ) : (
                    <ul className="text-xs space-y-1 bg-secondary-soft/50 p-3 rounded-xl border border-border">
                      {bRecipes.map((r) => {
                        const comp = byId.get(r.component_id);
                        return <li key={r.id} className="flex justify-between text-muted"><span className="font-medium text-foreground">{comp ? displayName(comp) : `#${r.component_id}`}</span><span>{r.quantity} {comp?.unit ?? "units"}</span></li>;
                      })}
                    </ul>
                  )}
                  {a && a.shortages.length > 0 && <p className="text-xs text-primary font-semibold mt-2">{shortageText(a.shortages)}</p>}
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                  <Button variant="outline" size="sm" onClick={() => setRecipeFor(b)}>Edit Recipe</Button>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(b)} className={cn(iconBtn, "hover:text-primary hover:bg-primary-soft")} aria-label="Edit"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(b)} className={cn(iconBtn, "hover:text-primary hover:bg-primary-soft")} aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </m.div>
            );
          })}
          {!isPending && bouquets.length === 0 && <p className="col-span-full text-center text-muted p-12">No bouquets defined yet.</p>}
        </div>
      )}

      {tab === "margins" && (
        <div className="card overflow-hidden border-t-4 border-t-primary">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="table-head border-b border-border">
                  <th className="p-4">Product</th>
                  <th className="p-4">Cost / Sell</th>
                  <th className="p-4">Profit / unit</th>
                  <th className="p-4">Margin %</th>
                  <th className="p-4">Units Sold</th>
                  <th className="p-4">Revenue</th>
                  <th className="p-4 text-right">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {marginsPending && !margins ? (
                  <tr><td colSpan={7}><TableSkeleton cols={7} /></td></tr>
                ) : (margins ?? []).filter((r) => !q || displayName(r).toLowerCase().includes(q)).map((r, idx) => {
                  const hi = r.profit_margin_percent >= 40, mid = r.profit_margin_percent >= 20 && !hi;
                  const Icon = hi ? TrendingUp : mid ? Minus : TrendingDown;
                  return (
                    <m.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(idx, 15) * 0.02 }} className="hover:bg-primary-soft/30 hover:translate-x-1 transition-all duration-150">
                      <td className="p-4">
                        <p className="font-semibold text-foreground">{displayName(r)}</p>
                        <p className="text-xs text-muted capitalize">{r.category} · {r.unit}</p>
                      </td>
                      <td className="p-4 text-muted text-sm">{formatCurrency(r.purchase_price)} / {formatCurrency(r.selling_price)}</td>
                      <td className="p-4 font-bold text-foreground">{formatCurrency(r.profit_per_unit)}</td>
                      <td className="p-4">
                        <span className={cn("inline-flex items-center gap-1 stock-badge font-bold", 
                          hi ? "bg-primary-soft text-primary border border-primary-border/60" : "bg-secondary-soft text-foreground border border-border")}>
                          <Icon className="w-3.5 h-3.5" />{r.profit_margin_percent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-4 text-muted font-medium">{r.total_units_sold}</td>
                      <td className="p-4 text-muted">{formatCurrency(r.total_revenue)}</td>
                      <td className="p-4 font-bold text-right text-primary text-base">{formatCurrency(r.total_profit)}</td>
                    </m.tr>
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
