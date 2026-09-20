import { useMemo, useState, type FormEvent } from "react";
import { m } from "motion/react";
import { Coins, Users, FileText, Check } from "lucide-react";
import { toast } from "sonner";
import { useSales, useRecordPayment } from "@/api/sales";
import type { Sale } from "@/api/types";
import { PageHeader } from "@/components/layout/AppLayout";
import { SearchInput } from "@/components/ui/SearchInput";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { ReceiptDialog } from "@/components/ReceiptDialog";
import { errorMessage } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";

const due = (s: Sale) => Math.max(0, s.total - s.amount_paid);

export default function Credits() {
  const { data: sales, isPending } = useSales();
  const pay = useRecordPayment();
  const [search, setSearch] = useState("");
  const [paying, setPaying] = useState<Sale | null>(null);
  const [amount, setAmount] = useState("");
  const [receipt, setReceipt] = useState<Sale | null>(null);

  const credits = useMemo(() => (sales ?? []).filter((s) => due(s) > 0.01), [sales]);
  const list = useMemo(() => { const q = search.trim().toLowerCase(); return credits.filter((s) => !q || (s.customers?.name ?? "").toLowerCase().includes(q) || (s.customers?.phone ?? "").includes(q)); }, [credits, search]);
  const outstanding = credits.reduce((a, s) => a + due(s), 0);
  const debtors = new Set(credits.map((s) => s.customer_id).filter(Boolean)).size;

  const submit = (e: FormEvent) => {
    e.preventDefault(); if (!paying) return;
    const amt = parseFloat(amount);
    if (!(amt > 0)) { toast.error("Enter an amount greater than 0."); return; }
    if (amt > due(paying) + 0.005) { toast.error(`Maximum is ${formatCurrency(due(paying))}.`); return; }
    pay.mutate({ saleId: paying.id, amount: amt }, { onSuccess: () => { toast.success("Payment recorded"); setPaying(null); setAmount(""); }, onError: (err) => toast.error(errorMessage(err)) });
  };

  const stats = [
    { label: "Total outstanding", value: formatCurrency(outstanding), icon: Coins, tone: "text-danger bg-danger-soft" },
    { label: "Customers with dues", value: String(debtors), icon: Users, tone: "text-amber-800 bg-accent-soft" },
    { label: "Pending bills", value: String(credits.length), icon: FileText, tone: "text-primary bg-primary-soft" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Credits & Dues" subtitle="Bills that still have a balance." actions={<SearchInput value={search} onChange={setSearch} placeholder="Search customer or phone…" className="w-full sm:w-72" />} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {stats.map((s, i) => (
          <m.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="card p-5 flex items-center justify-between">
            <div><p className="text-xs uppercase tracking-wider text-muted font-semibold">{s.label}</p><h3 className="text-3xl mt-1">{s.value}</h3></div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.tone}`}><s.icon className="w-6 h-6" /></div>
          </m.div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="table-head border-b border-border"><th className="p-4">Customer</th><th className="p-4">Date</th><th className="p-4">Items</th><th className="p-4">Total</th><th className="p-4">Paid</th><th className="p-4 text-danger">Due</th><th className="p-4 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-border">
              {isPending && !sales ? <tr><td colSpan={7}><TableSkeleton cols={7} /></td></tr> : list.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-muted">{search ? "No matching credits." : "No outstanding credits — everything is settled!"}</td></tr> : list.map((s) => (
                <tr key={s.id} className="hover:bg-background/60">
                  <td className="p-4"><p className="font-semibold">{s.customers?.name ?? "Walk-in"}</p><p className="text-xs text-muted">{s.customers?.phone}</p></td>
                  <td className="p-4 text-sm whitespace-nowrap">{formatDate(s.date)}</td>
                  <td className="p-4 text-sm text-muted max-w-xs truncate">{s.sale_items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</td>
                  <td className="p-4 font-medium">{formatCurrency(s.total)}</td>
                  <td className="p-4 text-muted">{formatCurrency(s.amount_paid)}</td>
                  <td className="p-4 font-bold text-danger text-lg">{formatCurrency(due(s))}</td>
                  <td className="p-4"><div className="flex justify-end gap-2">
                    <button onClick={() => setReceipt(s)} className="p-2 rounded-lg text-muted hover:text-primary hover:bg-primary-soft cursor-pointer" aria-label="Receipt"><FileText className="w-4 h-4" /></button>
                    <Button variant="secondary" size="sm" onClick={() => { setPaying(s); setAmount(String(due(s))); }}><Coins className="w-3.5 h-3.5" /> Pay</Button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!paying} onOpenChange={(o) => !o && setPaying(null)} title="Record payment" size="sm">
        {paying && (
          <form onSubmit={submit} className="space-y-4">
            <div className="bg-background rounded-xl p-4 text-sm space-y-1 border border-border">
              <div className="flex justify-between"><span className="text-muted">Customer</span><span className="font-semibold">{paying.customers?.name}</span></div>
              <div className="flex justify-between"><span className="text-muted">Bill</span><span>#{paying.id} · {formatDate(paying.date)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Total</span><span>{formatCurrency(paying.total)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Paid so far</span><span>{formatCurrency(paying.amount_paid)}</span></div>
              <div className="flex justify-between font-bold text-danger border-t border-border pt-1 mt-1"><span>Balance due</span><span>{formatCurrency(due(paying))}</span></div>
            </div>
            <Field label="Amount received (₹)"><Input required type="number" step="0.01" min="0.01" max={due(paying)} value={amount} onChange={(e) => setAmount(e.target.value)} className="text-lg font-semibold" autoFocus /></Field>
            <div className="flex justify-end gap-3"><Button type="button" variant="ghost" onClick={() => setPaying(null)}>Cancel</Button><Button type="submit" variant="secondary" loading={pay.isPending}><Check className="w-4 h-4" /> Record</Button></div>
          </form>
        )}
      </Dialog>
      <ReceiptDialog sale={receipt} open={!!receipt} onOpenChange={(o) => !o && setReceipt(null)} />
    </div>
  );
}
