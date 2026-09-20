import { useMemo, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { ShoppingBag, Trash2, Plus, Minus, UserCircle, Sparkles, Pencil, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useProducts, useBouquetAvailability } from "@/api/products";
import { useCustomers } from "@/api/customers";
import { useCreateSale } from "@/api/sales";
import type { Category, Product, Sale, CreateSaleItem } from "@/api/types";
import { PageHeader } from "@/components/layout/AppLayout";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { BouquetBuilder, type BuilderResult } from "@/components/BouquetBuilder";
import { ReceiptDialog } from "@/components/ReceiptDialog";
import { burstPetals } from "@/components/PetalBurst";
import { cartCount, componentsSummary, resolveTotals, validateCheckout, type CartLine } from "@/lib/cart";
import { shortageText } from "@/lib/bouquet";
import { errorMessage } from "@/lib/supabase";
import { cn, displayName, formatCurrency } from "@/lib/utils";

type Filter = "all" | Category;
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All Products" },
  { value: "flower", label: "Flowers" },
  { value: "bouquet", label: "Bouquets" },
  { value: "accessory", label: "Accessories" },
];

export default function Billing() {
  const { data: products, isPending } = useProducts();
  const { data: availability } = useBouquetAvailability();
  const { data: customers } = useCustomers();
  const createSale = useCreateSale();

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"products" | "cart">("products");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [customTotal, setCustomTotal] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Sale | null>(null);
  const totalRef = useRef<HTMLDivElement>(null);

  const avail = useMemo(() => new Map((availability ?? []).map((a) => [a.bouquet_id, a])), [availability]);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (products ?? []).filter((p) => (filter === "all" || p.category === filter) && (!q || displayName(p).toLowerCase().includes(q)));
  }, [products, filter, search]);

  const maxFor = (p: Product) => (p.category === "bouquet" ? avail.get(p.id)?.can_make ?? 0 : p.stock);

  const pulseTotal = () => {
    const el = totalRef.current; if (!el) return;
    el.classList.remove("pulse-once"); void el.offsetWidth; el.classList.add("pulse-once");
  };

  const addProduct = (p: Product, el: HTMLElement) => {
    const max = maxFor(p);
    const key = `p${p.id}`;
    const existing = cart.find((l) => l.key === key);
    if ((existing?.quantity ?? 0) + 1 > max) { toast.warning(`Only ${max} ${displayName(p)} available.`); return; }
    setCart(existing
      ? cart.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l))
      : [...cart, { key, kind: "product", productId: p.id, name: displayName(p), price: p.selling_price, quantity: 1, maxQuantity: max, components: [] }]);
    burstPetals(el); pulseTotal();
  };

  const addCustom = (r: BuilderResult) => {
    const max = Math.min(...r.components.map((c) => Math.floor(c.stock / c.quantity)));
    const name = r.label || "Custom Bouquet";
    const components = r.components.map((c) => ({ productId: c.productId, name: c.name, quantity: c.quantity, unitCost: c.unitCost, sellingPrice: c.sellingPrice }));
    if (editingKey) {
      setCart(cart.map((l) => (l.key === editingKey ? { ...l, name, price: r.price, maxQuantity: max, components, quantity: Math.min(l.quantity, max) } : l)));
    } else {
      setCart([...cart, { key: `c${Date.now()}`, kind: "custom_bouquet", productId: null, name, price: r.price, quantity: 1, maxQuantity: max, components }]);
    }
    setBuilderOpen(false); setEditingKey(null); pulseTotal();
  };

  const changeQty = (key: string, delta: number) => setCart(cart.map((l) => {
    if (l.key !== key) return l;
    const q = l.quantity + delta;
    if (q < 1) return l;
    if (l.maxQuantity != null && q > l.maxQuantity) { toast.warning(`Only ${l.maxQuantity} available.`); return l; }
    return { ...l, quantity: q };
  }));
  const setPrice = (key: string, price: number) => setCart(cart.map((l) => (l.key === key ? { ...l, price } : l)));
  const remove = (key: string) => setCart(cart.filter((l) => l.key !== key));
  const clear = () => { setCart([]); setCustomTotal(""); setAmountPaid(""); setCustomerId(""); };

  const totals = resolveTotals(cart, customTotal, amountPaid);
  const count = cartCount(cart);

  const checkout = () => {
    const err = validateCheckout(cart, totals, customerId);
    if (err) { toast.error(err); return; }
    const items: CreateSaleItem[] = cart.map((l) => l.kind === "product"
      ? { kind: "product", product_id: l.productId as number, quantity: l.quantity, price: l.price }
      : { kind: "custom_bouquet", name: l.name, quantity: l.quantity, price: l.price, components: l.components.map((c) => ({ product_id: c.productId, quantity: c.quantity })) });
    createSale.mutate({ customer_id: customerId ? Number(customerId) : null, items, total: totals.total, amount_paid: totals.amountPaid }, {
      onSuccess: (sale) => { clear(); setReceipt(sale); setTab("products"); toast.success(`Bill #${sale.id} generated`); if (totalRef.current) burstPetals(totalRef.current, 14); },
      onError: (e) => toast.error(errorMessage(e)),
    });
  };

  const editingLine = editingKey ? cart.find((l) => l.key === editingKey) : undefined;

  return (
    <div className="lg:h-[calc(100vh-6rem)] flex flex-col">
      <PageHeader title="Billing & POS" subtitle="Select flowers or bouquets to construct instant invoices." />

      <div className="lg:hidden flex p-1 bg-secondary-soft rounded-xl mb-4 border border-border">
        {(["products", "cart"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("flex-1 py-2.5 rounded-lg font-semibold text-sm cursor-pointer transition-all duration-200", tab === t ? "bg-surface text-primary shadow-card font-bold" : "text-muted")}>
            {t === "products" ? `Products (${visible.length})` : `Bill (${count})`}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6">
        <section className={cn("flex-1 min-h-0 flex-col gap-4", tab === "products" ? "flex" : "hidden lg:flex")}>
          <div className="card p-3.5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <SearchInput value={search} onChange={setSearch} placeholder="Search flowers, bouquets, greens…" className="flex-1" />
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
              {FILTERS.map((f) => (
                <button key={f.value} onClick={() => setFilter(f.value)} className={cn("chip whitespace-nowrap", filter === f.value && "chip-active")}>
                  {f.label}
                </button>
              ))}
            </div>
            <Button variant="secondary" onClick={() => { setEditingKey(null); setBuilderOpen(true); }}>
              <Sparkles className="w-4 h-4 text-primary" /> Custom Bouquet
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1.5 pb-4">
            {isPending && !products ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {visible.map((p, idx) => {
                  const max = maxFor(p);
                  const a = p.category === "bouquet" ? avail.get(p.id) : undefined;
                  const disabled = max <= 0;
                  return (
                    <m.button key={p.id} 
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx, 16) * 0.03, duration: 0.25 }}
                      whileHover={disabled ? undefined : { y: -5, scale: 1.02 }}
                      whileTap={disabled ? undefined : { scale: 0.96 }} 
                      disabled={disabled}
                      onClick={(e) => addProduct(p, e.currentTarget)}
                      className={cn(
                        "card card-hover p-4 text-left flex flex-col border-b-4 cursor-pointer relative overflow-hidden group select-none transition-all duration-200", 
                        p.category === "bouquet" ? "border-b-secondary" : "border-b-primary", 
                        disabled && "opacity-45 grayscale cursor-not-allowed hover:translate-y-0 hover:shadow-card"
                      )}>
                      
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <p className="font-bold text-base leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">{displayName(p)}</p>
                      </div>

                      <p className="text-xs text-muted font-medium capitalize">{p.category} · per {p.unit}</p>

                      <div className="mt-auto pt-4 flex items-end justify-between gap-2">
                        <span className="text-xl font-display font-bold text-primary">{formatCurrency(p.selling_price)}</span>
                        {p.category === "bouquet"
                          ? <span className={cn("stock-badge", max > 0 ? "bg-primary-soft text-primary border border-primary-border/60" : "bg-secondary-soft text-muted")}>{max > 0 ? `Can make ${max}` : "Short"}</span>
                          : <span className={cn("stock-badge", p.stock > 15 ? "bg-secondary-soft text-foreground font-semibold" : "bg-primary-soft text-primary font-bold border border-primary-border/60")}>{p.stock} left</span>}
                      </div>

                      {a && a.shortages.length > 0 && (
                        <p className="text-[11px] text-primary font-semibold mt-1.5 leading-tight bg-primary-soft/60 p-1 rounded-md">
                          {shortageText(a.shortages)}
                        </p>
                      )}
                    </m.button>
                  );
                })}
                {visible.length === 0 && <p className="col-span-full text-center text-muted p-12">No products found matching the criteria.</p>}
              </div>
            )}
          </div>
        </section>

        {/* Right Bill Drawer / Aside */}
        <aside className={cn("w-full lg:w-[420px] shrink-0 card flex-col lg:h-full overflow-hidden border-t-8 border-t-primary shadow-xl", tab === "cart" ? "flex" : "hidden lg:flex")}>
          <div className="p-4 sm:p-5 border-b border-border bg-secondary-soft/50">
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <ShoppingBag className="text-primary w-5 h-5" /> Active Bill
            </h2>
            <div className="mt-3 flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-muted shrink-0" />
              <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="py-2 text-sm bg-surface">
                <option value="">Walk-in customer</option>
                {customers?.map((c) => <option key={c.id} value={c.id}>{c.name}{c.business ? ` · ${c.business}` : ""}</option>)}
              </Select>
            </div>
          </div>

          {/* Cart Item Rows */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 min-h-[220px]">
            <AnimatePresence initial={false}>
              {cart.length === 0 ? (
                <div key="empty" className="h-full flex flex-col items-center justify-center text-muted p-8 text-center">
                  <ShoppingBag className="w-16 h-16 mb-3 text-muted/30 stroke-1" />
                  <p className="font-medium">Bill is empty.</p>
                  <p className="text-xs text-muted mt-1">Tap flowers or bouquets on the left to add items.</p>
                </div>
              ) : cart.map((l) => (
                <m.div key={l.key} layout 
                  initial={{ opacity: 0, x: 24, scale: 0.95 }} 
                  animate={{ opacity: 1, x: 0, scale: 1 }} 
                  exit={{ opacity: 0, x: -24, scale: 0.92 }} 
                  transition={{ duration: 0.2 }}
                  className="bg-surface p-3.5 rounded-xl border border-border flex items-center gap-2.5 shadow-xs hover:border-primary-border transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">{l.name}</p>
                    {l.kind === "custom_bouquet" && <p className="text-[11px] text-muted truncate mt-0.5">{componentsSummary(l.components)}</p>}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-xs font-bold text-muted">₹</span>
                      <input type="number" step="any" value={l.price || ""} onChange={(e) => setPrice(l.key, Number(e.target.value) || 0)}
                        className="w-24 text-sm font-bold text-primary bg-secondary-soft/70 border border-border rounded-lg px-2 py-0.5 outline-none focus:border-primary focus:bg-white" aria-label={`Price of ${l.name}`} />
                      {l.kind === "custom_bouquet" && (
                        <button onClick={() => { setEditingKey(l.key); setBuilderOpen(true); }} className="p-1 text-muted hover:text-primary cursor-pointer transition-colors" aria-label="Edit bouquet">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-secondary-soft rounded-xl border border-border p-1">
                    <button onClick={() => changeQty(l.key, -1)} className="p-1.5 rounded-lg hover:bg-surface active:scale-90 text-foreground cursor-pointer transition-all" aria-label="Decrease">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-7 text-center font-bold text-sm text-foreground">{l.quantity}</span>
                    <button onClick={() => changeQty(l.key, 1)} className="p-1.5 rounded-lg hover:bg-surface active:scale-90 text-foreground cursor-pointer transition-all" aria-label="Increase">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button onClick={() => remove(l.key)} className="p-2 text-muted hover:text-primary hover:bg-primary-soft rounded-lg cursor-pointer transition-colors" aria-label="Remove">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </m.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Bill Calculation & Checkout Footer */}
          <div className="p-4 sm:p-5 bg-secondary-soft/70 border-t border-border space-y-3.5">
            <div className="flex justify-between items-center">
              <span className="text-muted font-semibold text-sm">Total Amount</span>
              <div ref={totalRef} className="flex items-center gap-1 border-b-2 border-primary/50 focus-within:border-primary transition-colors">
                <span className="text-xl font-bold text-primary">₹</span>
                <input inputMode="decimal" value={customTotal} onChange={(e) => setCustomTotal(e.target.value.replace(/[^0-9.]/g, ""))} placeholder={String(totals.subtotal)}
                  className="w-36 text-right text-3xl font-display font-bold text-foreground bg-transparent outline-none" aria-label="Total" />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted font-semibold text-sm">Amount Paid</span>
              <div className="flex items-center gap-1 border-b-2 border-border focus-within:border-primary transition-colors">
                <span className="text-lg font-bold text-muted">₹</span>
                <input inputMode="decimal" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value.replace(/[^0-9.]/g, ""))} placeholder={String(totals.total)}
                  className="w-32 text-right text-2xl font-bold text-foreground bg-transparent outline-none" aria-label="Amount paid" />
              </div>
            </div>

            {totals.due > 0 && (
              <div className="flex justify-between items-center px-3.5 py-2.5 rounded-xl bg-primary-soft border border-primary-border/60 text-primary text-sm font-bold">
                <span>Credit balance due</span>
                <span>{formatCurrency(totals.due)}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button variant="outline" onClick={clear} disabled={cart.length === 0}>
                Clear
              </Button>
              <Button onClick={checkout} disabled={cart.length === 0} loading={createSale.isPending} className="shadow-rose">
                Generate Bill <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </aside>
      </div>

      {tab === "products" && cart.length > 0 && (
        <m.button 
          initial={{ scale: 0, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          whileTap={{ scale: 0.95 }} 
          onClick={() => setTab("cart")}
          className="lg:hidden fixed bottom-6 right-6 z-30 btn-primary rounded-full px-6 py-4 shadow-rose flex items-center gap-2">
          <ShoppingBag className="w-5 h-5" /> View bill ({count}) · {formatCurrency(totals.total)}
        </m.button>
      )}

      <BouquetBuilder open={builderOpen} onOpenChange={(o) => { setBuilderOpen(o); if (!o) setEditingKey(null); }} mode="custom" products={products ?? []}
        initial={editingLine ? { components: editingLine.components.map((c) => { const p = products?.find((x) => x.id === c.productId); return { ...c, stock: p?.stock ?? 0, unit: p?.unit ?? "" }; }), price: editingLine.price, label: editingLine.name } : undefined}
        onSubmit={addCustom} />
      <ReceiptDialog sale={receipt} open={!!receipt} onOpenChange={(o) => { if (!o) setReceipt(null); }} />
    </div>
  );
}

