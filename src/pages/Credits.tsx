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
  const list = useMemo(() => { 
    const q = search.trim().toLowerCase(); 
    return credits.filter((s) => !q || (s.customers?.name ?? "").toLowerCase().includes(q) || (s.customers?.phone ?? "").includes(q)); 
  }, [credits, search]);
  const outstanding = credits.reduce((a, s) => a + due(s), 0);
  const debtors = new Set(credits.map((s) => s.customer_id).filter(Boolean)).size;

  const submit = (e: FormEvent) => {
    e.preventDefault(); if (!paying) return;
    const amt = parseFloat(amount);
    if (!(amt > 0)) { toast.error("Enter an amount greater than 0."); return; }
    if (amt > due(paying) + 0.005) { toast.error(`Maximum is ${formatCurrency(due(paying))}.`); return; }
    pay.mutate({ saleId: paying.id, amount: amt }, { 
      onSuccess: () => { toast.success("Payment recorded successfully"); setPaying(null); setAmount(""); }, 
      onError: (err) => toast.error(errorMessage(err)) 
    });
  };

  const stats = [
    { label: "Total Outstanding Dues", value: formatCurrency(outstanding), icon: Coins, isPrimary: true },
    { label: "Customers With Balance", value: String(debtors), icon: Users, isPrimary: false },
    { label: "Pending Invoices", value: String(credits.length), icon: FileText, isPrimary: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Credits & Outstanding Dues" subtitle="Manage accounts receivable, customer credit limits, and record partial settlements." actions={<SearchInput value={search} onChange={setSearch} placeholder="Search customer or phone…" className="w-full sm:w-72" />} />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {stats.map((s, i) => (
          <m.div key={s.label} 
            initial={{ opacity: 0, y: 14 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: i * 0.06 }} 
            whileHover={{ y: -5, scale: 1.01 }}
            className="card card-hover p-6 flex items-center justify-between border-t-4 border-t-primary">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted font-bold">{s.label}</p>
              <h3 className="text-3xl font-display font-bold text-foreground mt-1.5">{s.value}</h3>
            </div>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${s.isPrimary ? "bg-primary text-white shadow-rose" : "bg-secondary text-white shadow-slate"}`}>
              <s.icon className="w-7 h-7" />
            </div>
          </m.div>
        ))}
      </div>

      <div className="card overflow-hidden border-t-4 border-t-primary shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="table-head border-b border-border">
                <th className="p-4">Customer</th>
                <th className="p-4">Date</th>
                <th className="p-4">Items</th>
                <th className="p-4">Total</th>
                <th className="p-4">Paid</th>
                <th className="p-4 text-primary font-bold">Outstanding Due</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isPending && !sales ? (
                <tr><td colSpan={7}><TableSkeleton cols={7} /></td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan={7} className="p-12 text-center text-muted font-medium">{search ? "No matching credit records." : "✓ No outstanding credits — all accounts are fully settled!"}</td></tr>
              ) : list.map((s, idx) => (
                <m.tr key={s.id} 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  transition={{ delay: Math.min(idx, 15) * 0.02 }}
                  className="hover:bg-primary-soft/30 hover:translate-x-1 transition-all duration-150">
                  <td className="p-4">
                    <p className="font-bold text-foreground">{s.customers?.name ?? "Walk-in Customer"}</p>
                    <p className="text-xs text-muted font-mono">{s.customers?.phone || "No phone"}</p>
                  </td>
                  <td className="p-4 text-sm text-foreground whitespace-nowrap">{formatDate(s.date)}</td>
                  <td className="p-4 text-sm text-muted max-w-xs truncate">{s.sale_items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</td>
                  <td className="p-4 font-semibold text-foreground">{formatCurrency(s.total)}</td>
                  <td className="p-4 text-muted">{formatCurrency(s.amount_paid)}</td>
                  <td className="p-4 font-bold font-display text-primary text-xl">{formatCurrency(due(s))}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setReceipt(s)} className="p-2 rounded-lg text-muted hover:text-primary hover:bg-primary-soft cursor-pointer transition-colors" aria-label="Receipt">
                        <FileText className="w-4 h-4" />
                      </button>
                      <Button size="sm" onClick={() => { setPaying(s); setAmount(String(due(s))); }} className="shadow-rose">
                        <Coins className="w-3.5 h-3.5" /> Pay Now
                      </Button>
                    </div>
                  </td>
                </m.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!paying} onOpenChange={(o) => !o && setPaying(null)} title="Record Customer Settlement" size="sm">
        {paying && (
          <form onSubmit={submit} className="space-y-4">
            <div className="bg-secondary-soft/70 rounded-2xl p-4 text-sm space-y-1.5 border border-border">
              <div className="flex justify-between"><span className="text-muted">Customer</span><span className="font-bold text-foreground">{paying.customers?.name}</span></div>
              <div className="flex justify-between"><span className="text-muted">Invoice Ref</span><span>#{paying.id} · {formatDate(paying.date)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Total Invoice</span><span>{formatCurrency(paying.total)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Paid so far</span><span>{formatCurrency(paying.amount_paid)}</span></div>
              <div className="flex justify-between font-bold text-primary border-t border-border pt-2 mt-2 text-base"><span>Outstanding Balance</span><span>{formatCurrency(due(paying))}</span></div>
            </div>
            <Field label="Amount Received (₹)">
              <Input required type="number" step="0.01" min="0.01" max={due(paying)} value={amount} onChange={(e) => setAmount(e.target.value)} className="text-xl font-bold text-primary" autoFocus />
            </Field>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setPaying(null)}>Cancel</Button>
              <Button type="submit" loading={pay.isPending}><Check className="w-4 h-4" /> Record Settlement</Button>
            </div>
          </form>
        )}
      </Dialog>
      <ReceiptDialog sale={receipt} open={!!receipt} onOpenChange={(o) => !o && setReceipt(null)} />
    </div>
  );
}

