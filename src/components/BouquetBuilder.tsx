import { useEffect, useMemo, useState } from "react";
import { Plus, Minus, Trash2, Flower2 } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import type { Product } from "@/api/types";
import { Dialog, Sheet } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { Input, Field } from "./ui/Input";
import { SearchInput } from "./ui/SearchInput";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { bouquetCost, bouquetDefaultPrice } from "@/lib/bouquet";
import { displayName, formatCurrency, cn } from "@/lib/utils";

export interface BuilderComponent { productId: number; name: string; quantity: number; unitCost: number; sellingPrice: number; stock: number; unit: string }
export interface BuilderResult { components: BuilderComponent[]; price: number; label: string }
export interface BouquetBuilderProps {
  open: boolean; onOpenChange: (o: boolean) => void; mode: "custom" | "recipe"; products: Product[];
  initial?: Partial<BuilderResult>; onSubmit: (r: BuilderResult) => void; submitting?: boolean;
}

export function BouquetBuilder({ open, onOpenChange, mode, products, initial, onSubmit, submitting }: BouquetBuilderProps) {
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const [search, setSearch] = useState("");
  const [components, setComponents] = useState<BuilderComponent[]>(initial?.components ?? []);
  const [priceStr, setPriceStr] = useState(initial?.price != null ? String(initial.price) : "");
  const [priceTouched, setPriceTouched] = useState(initial?.price != null);
  const [label, setLabel] = useState(initial?.label ?? "");

  useEffect(() => {
    if (open) {
      setComponents(initial?.components ?? []); setLabel(initial?.label ?? ""); setSearch("");
      setPriceStr(initial?.price != null ? String(initial.price) : ""); setPriceTouched(initial?.price != null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => p.category !== "bouquet" && (!q || displayName(p).toLowerCase().includes(q)));
  }, [products, search]);

  const cost = bouquetCost(components);
  const defaultPrice = bouquetDefaultPrice(components);
  const price = priceTouched && priceStr.trim() !== "" ? Number(priceStr) || 0 : defaultPrice;

  const setQty = (p: Product, delta: number) => {
    setComponents((cs) => {
      const i = cs.findIndex((c) => c.productId === p.id);
      const cur = i >= 0 ? cs[i].quantity : 0;
      let next = cur + delta;
      if (mode === "custom") next = Math.min(next, p.stock);
      next = Math.max(0, next);
      if (next === 0) return cs.filter((c) => c.productId !== p.id);
      const comp: BuilderComponent = { productId: p.id, name: displayName(p), quantity: next, unitCost: p.purchase_price, sellingPrice: p.selling_price, stock: p.stock, unit: p.unit };
      return i >= 0 ? cs.map((c, j) => (j === i ? comp : c)) : [...cs, comp];
    });
  };

  const submit = () => onSubmit({ components, price, label: label.trim() });
  const canSubmit = components.length > 0 && (mode === "recipe" || price > 0);

  const body = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0">
      <div className="flex flex-col min-h-0">
        <SearchInput value={search} onChange={setSearch} placeholder="Search flowers & accessories…" className="mb-3" />
        <div className="overflow-y-auto space-y-1.5 max-h-[38vh] lg:max-h-[52vh] pr-1">
          {candidates.map((p) => {
            const qty = components.find((c) => c.productId === p.id)?.quantity ?? 0;
            const out = mode === "custom" && p.stock <= 0;
            return (
              <div key={p.id} className={cn("flex items-center gap-3 p-3 rounded-xl border border-border bg-surface hover:border-primary-border transition-colors", out && "opacity-50")}>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{displayName(p)}</p>
                  <p className="text-xs text-muted font-medium">{formatCurrency(p.selling_price)} / {p.unit} · {p.stock} left</p>
                </div>
                {qty > 0 && <span className="text-sm font-bold text-primary w-6 text-center">{qty}</span>}
                <button type="button" aria-label={`Add ${displayName(p)}`} disabled={out} onClick={() => setQty(p, 1)}
                  className="w-8 h-8 rounded-lg bg-primary-soft text-primary hover:bg-primary hover:text-white transition-all active:scale-90 flex items-center justify-center cursor-pointer disabled:cursor-not-allowed">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            );
          })}
          {candidates.length === 0 && <p className="text-sm text-muted p-4 text-center">Nothing matches.</p>}
        </div>
      </div>

      <div className="flex flex-col min-h-0">
        <h4 className="font-bold text-foreground mb-2 flex items-center gap-2"><Flower2 className="w-4 h-4 text-primary" /> {mode === "custom" ? "Selected Bouquet Blooms" : "Recipe Composition"}</h4>
        <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[30vh] lg:max-h-[38vh] pr-1">
          <AnimatePresence initial={false}>
            {components.map((c) => {
              const p = products.find((x) => x.id === c.productId);
              if (!p) return null;
              return (
                <m.div key={c.productId} layout initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary-soft/60 border border-border">
                  <span className="flex-1 truncate text-sm font-semibold text-foreground">{c.name}</span>
                  <div className="flex items-center gap-1 bg-surface rounded-lg border border-border p-0.5">
                    <button type="button" aria-label={`Decrease ${c.name}`} onClick={() => setQty(p, -1)} className="p-1 rounded hover:bg-primary-soft hover:text-primary active:scale-90 cursor-pointer transition-all"><Minus className="w-3 h-3" /></button>
                    <input aria-label={`Quantity of ${c.name}`} type="number" min={1} value={c.quantity} readOnly className="w-9 text-center text-sm font-bold bg-transparent outline-none text-foreground" />
                    <button type="button" aria-label={`Increase ${c.name}`} onClick={() => setQty(p, 1)} className="p-1 rounded hover:bg-primary-soft hover:text-primary active:scale-90 cursor-pointer transition-all"><Plus className="w-3 h-3" /></button>
                  </div>
                  <button type="button" aria-label={`Remove ${c.name}`} onClick={() => setQty(p, -c.quantity)} className="p-1.5 text-muted hover:text-primary hover:bg-primary-soft rounded-lg cursor-pointer transition-colors"><Trash2 className="w-4 h-4" /></button>
                </m.div>
              );
            })}
          </AnimatePresence>
          {components.length === 0 && <p className="text-sm text-muted p-8 text-center border border-dashed border-border rounded-xl">Tap + on flowers to assemble the bouquet.</p>}
        </div>

        <div className="mt-3 pt-3 border-t border-border space-y-3">
          <div className="flex justify-between text-sm"><span className="text-muted font-medium">Estimated Material Cost</span><span className="font-bold text-foreground">{formatCurrency(cost)}</span></div>
          {mode === "custom" && (
            <>
              <Field label="Custom Price (₹)">
                <Input id="bouquet-price" aria-label="Price" type="number" inputMode="decimal" min={0} step="any"
                  value={priceTouched ? priceStr : String(defaultPrice)} onChange={(e) => { setPriceTouched(true); setPriceStr(e.target.value); }} />
              </Field>
              <Field label="Bouquet Tag / Occasion (optional)"><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Luxury Velvet Rose Bouquet" /></Field>
            </>
          )}
          <Button type="button" className="w-full shadow-rose" onClick={submit} disabled={!canSubmit} loading={submitting}>
            {mode === "custom" ? `Add to bill · ${formatCurrency(price)}` : "Save Recipe"}
          </Button>
        </div>
      </div>
    </div>
  );

  const title = mode === "custom" ? "Custom Bouquet Studio" : "Bouquet Recipe Builder";
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange} side="bottom" title={title}>
        <div className="p-5 overflow-y-auto"><h3 className="text-xl font-bold mb-4">{title}</h3>{body}</div>
      </Sheet>
    );
  }
  return <Dialog open={open} onOpenChange={onOpenChange} title={title} size="xl">{body}</Dialog>;
}

