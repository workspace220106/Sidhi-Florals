import { useMemo, useState, type FormEvent } from "react";
import { m } from "motion/react";
import { Plus, Pencil, Trash2, History, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useCustomers, useCustomerSales, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from "@/api/customers";
import type { Customer, CustomerInput } from "@/api/types";
import { PageHeader } from "@/components/layout/AppLayout";
import { SearchInput } from "@/components/ui/SearchInput";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Field } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { errorMessage } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";

const empty: CustomerInput = { name: "", phone: "", business: "", address: "", notes: "" };

export default function Customers() {
  const [search, setSearch] = useState("");
  const { data: customers, isPending } = useCustomers();
  const create = useCreateCustomer(); const update = useUpdateCustomer(); const del = useDeleteCustomer();
  const [form, setForm] = useState<CustomerInput | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [historyId, setHistoryId] = useState<number | null>(null);
  const { data: history } = useCustomerSales(historyId);

  const list = useMemo(() => { 
    const q = search.trim().toLowerCase(); 
    return (customers ?? []).filter((c) => !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.business.toLowerCase().includes(q)); 
  }, [customers, search]);

  const openEdit = (c: Customer) => { setEditId(c.id); setForm({ name: c.name, phone: c.phone, business: c.business, address: c.address, notes: c.notes }); };
  const submit = (e: FormEvent) => {
    e.preventDefault(); if (!form) return;
    const opts = { onSuccess: () => { setForm(null); toast.success(editId ? "Customer profile updated" : "Customer registered"); }, onError: (err: unknown) => toast.error(errorMessage(err)) };
    if (editId) update.mutate({ id: editId, ...form }, opts); else create.mutate(form, opts);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Customer Directory" subtitle="Decorators, event planners, temples and valued regulars."
        actions={<>
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, phone, company…" className="flex-1 sm:w-64" />
          <Button onClick={() => { setEditId(null); setForm(empty); }}>
            <Plus className="w-4 h-4" /> Add Customer
          </Button>
        </>} />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {isPending && !customers ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />) : list.map((c, i) => (
          <m.div key={c.id} 
            initial={{ opacity: 0, y: 14 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: Math.min(i, 12) * 0.035, duration: 0.25 }} 
            whileHover={{ y: -5, scale: 1.01 }}
            className="card card-hover p-5 flex flex-col border-t-4 border-t-primary relative group">
            <div className="flex justify-between items-start gap-2 mb-3">
              <div>
                <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">{c.name}</h3>
                {c.business && <p className="text-primary font-semibold text-xs mt-0.5">{c.business}</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => setHistoryId(c.id)} className="p-2 rounded-lg text-muted hover:text-primary hover:bg-primary-soft cursor-pointer transition-colors" aria-label="Purchase History"><History className="w-4 h-4" /></button>
                <button onClick={() => openEdit(c)} className="p-2 rounded-lg text-muted hover:text-primary hover:bg-primary-soft cursor-pointer transition-colors" aria-label="Edit Profile"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => { if (confirm(`Delete ${c.name}?`)) del.mutate(c.id, { onError: (e) => toast.error(errorMessage(e)) }); }} className="p-2 rounded-lg text-muted hover:text-primary hover:bg-primary-soft cursor-pointer transition-colors" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            
            <div className="text-sm text-muted space-y-1.5 mt-auto pt-2">
              <p className="flex items-center gap-2 text-foreground font-medium"><Phone className="w-4 h-4 text-primary" /> {c.phone}</p>
              {c.address && <p className="flex items-center gap-2 text-muted text-xs line-clamp-2"><MapPin className="w-3.5 h-3.5 text-muted shrink-0" /> {c.address}</p>}
              {c.notes && <p className="italic text-xs bg-secondary-soft/70 p-2.5 rounded-xl border border-border mt-2 text-muted">{c.notes}</p>}
            </div>
          </m.div>
        ))}
        {!isPending && list.length === 0 && <p className="col-span-full text-center text-muted p-12">No customers found.</p>}
      </div>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)} title={editId ? "Edit customer" : "Add customer"}>
        {form && (
          <form onSubmit={submit} className="space-y-4">
            <Field label="Full Name"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Meera Sharma" /></Field>
            <Field label="Phone Number"><Input required inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="e.g. +91 98765 43210" /></Field>
            <Field label="Business / Event Category (optional)"><Input value={form.business} onChange={(e) => setForm({ ...form, business: e.target.value })} placeholder="Wedding Decorator, Temple, Hotel…" /></Field>
            <Field label="Address (optional)"><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Studio or venue address" /></Field>
            <Field label="Notes (optional)"><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Special preferences or delivery instructions" /></Field>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
              <Button type="submit" loading={create.isPending || update.isPending}>{editId ? "Update" : "Save"}</Button>
            </div>
          </form>
        )}
      </Dialog>

      <Dialog open={historyId != null} onOpenChange={(o) => !o && setHistoryId(null)} title="Purchase History" size="lg">
        {!history ? <Skeleton className="h-28 rounded-xl" /> : history.length === 0 ? <p className="text-center text-muted py-6">No previous bills recorded.</p> : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {history.map((s) => (
              <div key={s.id} className="border border-border rounded-xl p-4 bg-secondary-soft/50 hover:bg-secondary-soft transition-colors">
                <div className="flex justify-between font-bold mb-2">
                  <span className="text-foreground">{formatDate(s.date)}</span>
                  <span className="text-primary">{formatCurrency(s.total)}{s.total - s.amount_paid > 0.01 && <span className="ml-2 text-xs font-bold text-primary bg-primary-soft px-2 py-0.5 rounded-full border border-primary-border/60">due {formatCurrency(s.total - s.amount_paid)}</span>}</span>
                </div>
                <ul className="text-xs text-muted space-y-1">{s.sale_items.map((it) => <li key={it.id} className="flex justify-between font-medium"><span>{it.quantity} × {it.name}</span><span className="text-foreground font-semibold">{formatCurrency(it.total)}</span></li>)}</ul>
              </div>
            ))}
          </div>
        )}
      </Dialog>
    </div>
  );
}

