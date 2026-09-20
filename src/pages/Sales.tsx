import { useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { Calendar, FileText, Trash2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useSales, useDeleteSale } from "@/api/sales";
import type { Sale } from "@/api/types";
import { PageHeader } from "@/components/layout/AppLayout";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { ReceiptDialog } from "@/components/ReceiptDialog";
import { errorMessage } from "@/lib/supabase";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

export default function Sales() {
  const { data: sales, isPending } = useSales();
  const del = useDeleteSale();
  const [open, setOpen] = useState<number | null>(null);
  const [receipt, setReceipt] = useState<Sale | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader title="Sales" subtitle="Every bill, newest first. Tap a row to see its items." />
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="table-head border-b border-border"><th className="p-4">Date</th><th className="p-4">Customer</th><th className="p-4">Items</th><th className="p-4">Total</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-border">
              {isPending && !sales ? <tr><td colSpan={6}><TableSkeleton cols={6} /></td></tr> : sales?.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-muted">No bills yet.</td></tr> : sales?.map((s) => {
                const due = s.total - s.amount_paid; const expanded = open === s.id;
                return (
                  <tr key={s.id} className="hover:bg-background/60 cursor-pointer align-top" onClick={() => setOpen(expanded ? null : s.id)}>
                    <td className="p-4 whitespace-nowrap"><span className="flex items-center gap-2 font-medium"><Calendar className="w-4 h-4 text-muted" /> {formatDate(s.date)}</span><span className="text-xs text-muted ml-6">{new Date(s.date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span></td>
                    <td className="p-4">{s.customers ? <span className="font-semibold text-primary">{s.customers.name}</span> : <span className="text-muted italic">Walk-in</span>}</td>
                    <td className="p-4">
                      <span className="flex items-center gap-1">{s.sale_items.reduce((a, i) => a + i.quantity, 0)} items <ChevronDown className={cn("w-4 h-4 text-muted transition-transform", expanded && "rotate-180")} /></span>
                      <AnimatePresence>{expanded && (
                        <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                          <ul className="mt-2 text-sm bg-surface border border-border rounded-lg p-3 space-y-1 w-max max-w-md">
                            {s.sale_items.map((it) => (
                              <li key={it.id}>
                                <div className="flex gap-4"><span className="text-muted w-8">{it.quantity}×</span><span className="font-medium flex-1">{it.name}</span><span className="text-muted">{formatCurrency(it.total)}</span></div>
                                {it.sale_item_components.map((c) => <div key={c.id} className="text-xs text-muted pl-12">– {c.quantity} {c.name}</div>)}
                              </li>
                            ))}
                            {s.notes && <li className="text-xs italic text-muted pt-1 border-t border-border">{s.notes}</li>}
                          </ul>
                        </m.div>
                      )}</AnimatePresence>
                    </td>
                    <td className="p-4 font-bold text-lg">{formatCurrency(s.total)}</td>
                    <td className="p-4">{due > 0.01 ? <span className="stock-badge bg-danger-soft text-danger whitespace-nowrap">Due {formatCurrency(due)}</span> : <span className="stock-badge bg-secondary-soft text-secondary">Paid</span>}</td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setReceipt(s)} className="p-2 rounded-lg text-muted hover:text-primary hover:bg-primary-soft cursor-pointer" aria-label="Receipt"><FileText className="w-4 h-4" /></button>
                        <button onClick={() => { if (confirm("Delete this bill? Stock will not be restored.")) del.mutate(s.id, { onError: (e) => toast.error(errorMessage(e)), onSuccess: () => toast.success("Bill deleted") }); }} className="p-2 rounded-lg text-muted hover:text-danger hover:bg-danger-soft cursor-pointer" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <ReceiptDialog sale={receipt} open={!!receipt} onOpenChange={(o) => !o && setReceipt(null)} />
    </div>
  );
}
