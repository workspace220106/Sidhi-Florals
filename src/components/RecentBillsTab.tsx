import { useState } from "react";
import { FileText, Calendar, Phone } from "lucide-react";
import { useSales } from "@/api/sales";
import type { Sale } from "@/api/types";
import { formatCurrency, padId } from "@/lib/utils";
import { SearchInput } from "@/components/ui/SearchInput";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";

export function RecentBillsTab({ onSelectSale }: { onSelectSale: (sale: Sale) => void }) {
  const { data: sales, isPending } = useSales();
  const [search, setSearch] = useState("");

  const filtered = (sales ?? []).filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const matchId = String(s.id).includes(q) || padId(s.id).includes(q);
    const matchCust = s.customers?.name.toLowerCase().includes(q) || s.customers?.phone.includes(q);
    const matchItems = s.sale_items.some((it) => it.name.toLowerCase().includes(q));
    return matchId || matchCust || matchItems;
  });

  return (
    <div className="card p-4 sm:p-6 shadow-sm border border-border space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-border">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" /> Generated Bills & Receipts
          </h2>
          <p className="text-xs sm:text-sm text-muted mt-0.5">
            View, print, download PDFs, or resend invoices on WhatsApp for recent transactions.
          </p>
        </div>

        <div className="w-full sm:w-72">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search bill #, customer, phone..."
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-secondary-soft text-muted font-bold text-xs uppercase tracking-wider border-b border-border">
            <tr>
              <th className="p-3">Receipt #</th>
              <th className="p-3">Date & Time</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Items Summary</th>
              <th className="p-3 text-right">Total Amount</th>
              <th className="p-3 text-right">Status</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {isPending && !sales ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={7} className="p-4">
                    <Skeleton className="h-6 w-full" />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted text-sm">
                  No generated bills found.
                </td>
              </tr>
            ) : (
              filtered.map((sale) => {
                const due = sale.total - sale.amount_paid;
                const isPaid = due <= 0.01;
                const totalItems = sale.sale_items.reduce((s, i) => s + i.quantity, 0);

                return (
                  <tr key={sale.id} className="hover:bg-secondary-soft/30 transition-colors">
                    <td className="p-3 font-mono font-bold text-primary">
                      #{padId(sale.id)}
                    </td>
                    <td className="p-3 text-xs text-muted whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-muted" />
                        {new Date(sale.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="p-3">
                      <p className="font-semibold text-foreground text-xs sm:text-sm">
                        {sale.customers?.name ?? "Walk-in Customer"}
                      </p>
                      {sale.customers?.phone && (
                        <p className="text-[11px] text-muted flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-emerald-600" /> {sale.customers.phone}
                        </p>
                      )}
                    </td>
                    <td className="p-3 text-xs text-muted max-w-xs truncate">
                      <span className="font-semibold text-foreground">{totalItems} items</span>
                      {" · "}
                      {sale.sale_items.map((i) => i.name).join(", ")}
                    </td>
                    <td className="p-3 text-right font-display font-bold text-foreground whitespace-nowrap">
                      {formatCurrency(sale.total)}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {isPaid ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                          Paid
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20">
                          Due: {formatCurrency(due)}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onSelectSale(sale)}
                        className="h-8 text-xs gap-1.5 px-3 shadow-xs"
                      >
                        <FileText className="w-3.5 h-3.5 text-primary" /> View & Share
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
