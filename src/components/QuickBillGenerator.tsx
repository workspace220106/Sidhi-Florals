import { useState, useMemo } from "react";
import { Plus, Trash2, User, Phone, Sparkles, Receipt, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useProducts } from "@/api/products";
import { useCustomers, useCreateCustomer } from "@/api/customers";
import { useCreateSale } from "@/api/sales";
import type { Sale, CreateSaleItem } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { formatCurrency, displayName } from "@/lib/utils";
import { burstPetals } from "@/components/PetalBurst";

interface CustomBillRow {
  id: string;
  productId: number | null;
  name: string;
  quantity: number;
  price: number;
}

export function QuickBillGenerator({ onBillGenerated }: { onBillGenerated: (sale: Sale) => void }) {
  const { data: products } = useProducts();
  const { data: customers } = useCustomers();
  const createSale = useCreateSale();
  const createCustomer = useCreateCustomer();

  // Customer state
  const [customerMode, setCustomerMode] = useState<"existing" | "new" | "walkin">("walkin");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");

  // Bill items state
  const [items, setItems] = useState<CustomBillRow[]>([
    { id: "1", productId: null, name: "", quantity: 1, price: 0 },
  ]);

  // Billing & Payment state
  const [customTotalStr, setCustomTotalStr] = useState("");
  const [discountPercentStr, setDiscountPercentStr] = useState("");
  const [amountPaidStr, setAmountPaidStr] = useState("");
  const [notes, setNotes] = useState("");

  // Quick product add selector
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>("");

  const addRow = () => {
    setItems((prev) => [
      ...prev,
      { id: `row-${Date.now()}-${Math.random()}`, productId: null, name: "", quantity: 1, price: 0 },
    ]);
  };

  const removeRow = (id: string) => {
    if (items.length === 1) {
      setItems([{ id: `row-${Date.now()}`, productId: null, name: "", quantity: 1, price: 0 }]);
      return;
    }
    setItems((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRow = (id: string, updates: Partial<CustomBillRow>) => {
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const handleProductSelect = (productIdStr: string) => {
    if (!productIdStr) return;
    const p = products?.find((prod) => String(prod.id) === productIdStr);
    if (!p) return;

    // Check if an empty row exists, otherwise add a new row
    const emptyRowIndex = items.findIndex((r) => !r.name && r.price === 0);
    if (emptyRowIndex !== -1) {
      setItems((prev) =>
        prev.map((r, idx) =>
          idx === emptyRowIndex
            ? { ...r, productId: p.id, name: displayName(p), price: p.selling_price, quantity: 1 }
            : r
        )
      );
    } else {
      setItems((prev) => [
        ...prev,
        { id: `row-${Date.now()}`, productId: p.id, name: displayName(p), price: p.selling_price, quantity: 1 },
      ]);
    }
    setSelectedProductToAdd("");
  };

  // Calculations
  const calculatedSubtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
  }, [items]);

  const discountPercent = parseFloat(discountPercentStr) || 0;
  const discountAmount = calculatedSubtotal * (discountPercent / 100);
  const totalAfterDiscount = Math.max(0, calculatedSubtotal - discountAmount);

  const parsedCustomTotal = parseFloat(customTotalStr);
  const finalTotal = customTotalStr.trim() !== "" && !isNaN(parsedCustomTotal) ? parsedCustomTotal : totalAfterDiscount;

  const parsedAmountPaid = parseFloat(amountPaidStr);
  const finalAmountPaid = amountPaidStr.trim() !== "" && !isNaN(parsedAmountPaid) ? parsedAmountPaid : finalTotal;
  const balanceDue = Math.max(0, finalTotal - finalAmountPaid);

  const handleGenerateBill = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate valid items
    const validItems = items.filter((it) => it.name.trim() !== "" && (Number(it.quantity) || 0) > 0);
    if (validItems.length === 0) {
      toast.error("Please add at least one item with a name and quantity.");
      return;
    }

    let customerIdToUse: number | null = null;

    // Handle customer assignment
    if (customerMode === "existing" && selectedCustomerId) {
      customerIdToUse = Number(selectedCustomerId);
    } else if (customerMode === "new") {
      if (!newCustomerName.trim()) {
        toast.error("Please enter the customer name.");
        return;
      }
      try {
        const createdCust = await createCustomer.mutateAsync({
          name: newCustomerName.trim(),
          phone: newCustomerPhone.trim(),
          business: "",
          address: "",
          notes: "Created during Quick Bill Generation",
        });
        customerIdToUse = createdCust.id;
      } catch (err) {
        console.error("Failed to create customer:", err);
        toast.error("Failed to save customer. Proceeding with walk-in.");
      }
    }

    // Validation: credit sales require a customer
    if (balanceDue > 0.01 && !customerIdToUse) {
      toast.warning("Please select or create a customer to record a credit/due transaction.");
      return;
    }

    const saleItems: CreateSaleItem[] = validItems.map((it) => {
      if (it.productId) {
        return {
          kind: "product",
          product_id: it.productId,
          quantity: it.quantity,
          price: it.price,
        };
      }
      return {
        kind: "custom_bouquet",
        name: it.name.trim(),
        quantity: it.quantity,
        price: it.price,
        components: [],
      };
    });

    try {
      const sale = await createSale.mutateAsync({
        customer_id: customerIdToUse,
        items: saleItems,
        total: finalTotal,
        amount_paid: finalAmountPaid,
        notes: notes.trim() ? notes.trim() : null,
      });

      // Reset form
      setItems([{ id: `row-${Date.now()}`, productId: null, name: "", quantity: 1, price: 0 }]);
      setCustomTotalStr("");
      setDiscountPercentStr("");
      setAmountPaidStr("");
      setNotes("");
      if (customerMode === "new") {
        setNewCustomerName("");
        setNewCustomerPhone("");
        setCustomerMode("existing");
      }

      toast.success(`Bill #${sale.id} generated successfully!`);
      burstPetals(undefined, 18);
      onBillGenerated(sale);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate bill.");
    }
  };

  return (
    <div className="card p-4 sm:p-6 shadow-sm border border-border">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-5 border-b border-border">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" /> Quick Bill Generator
          </h2>
          <p className="text-xs sm:text-sm text-muted mt-0.5">
            Create custom invoices with custom line items, instant WhatsApp delivery & PDF generation.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-secondary-soft p-1 rounded-xl border border-border text-xs">
          <button
            type="button"
            onClick={() => setCustomerMode("walkin")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              customerMode === "walkin" ? "bg-surface text-primary shadow-xs font-bold" : "text-muted"
            }`}
          >
            Walk-in
          </button>
          <button
            type="button"
            onClick={() => setCustomerMode("existing")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              customerMode === "existing" ? "bg-surface text-primary shadow-xs font-bold" : "text-muted"
            }`}
          >
            Registered
          </button>
          <button
            type="button"
            onClick={() => setCustomerMode("new")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              customerMode === "new" ? "bg-surface text-primary shadow-xs font-bold" : "text-muted"
            }`}
          >
            + New Customer
          </button>
        </div>
      </div>

      <form onSubmit={handleGenerateBill} className="mt-5 space-y-6">
        {/* Customer Details section */}
        {customerMode === "existing" && (
          <div className="p-3.5 bg-secondary-soft/60 rounded-xl border border-border flex flex-col sm:flex-row gap-3 items-center">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground shrink-0">
              <User className="w-4 h-4 text-primary" /> Select Customer:
            </div>
            <Select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="flex-1 bg-surface text-sm"
            >
              <option value="">-- Choose Registered Customer --</option>
              {customers?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ""} {c.business ? `· ${c.business}` : ""}
                </option>
              ))}
            </Select>
          </div>
        )}

        {customerMode === "new" && (
          <div className="p-4 bg-primary-soft/40 rounded-xl border border-primary-border/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">Customer Full Name *</label>
              <Input
                placeholder="e.g. Priya Sharma"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                className="bg-surface text-sm"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-foreground mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp / Mobile Number
              </label>
              <Input
                type="tel"
                placeholder="e.g. 9876543210"
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                className="bg-surface text-sm"
              />
            </div>
          </div>
        )}

        {/* Quick Inventory Item Picker */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-surface p-3 rounded-xl border border-border">
          <span className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" /> Quick add from flower catalog:
          </span>
          <div className="w-full sm:w-72">
            <Select
              value={selectedProductToAdd}
              onChange={(e) => handleProductSelect(e.target.value)}
              className="text-xs sm:text-sm bg-secondary-soft"
            >
              <option value="">+ Pick a flower or bouquet...</option>
              {products?.map((p) => (
                <option key={p.id} value={p.id}>
                  {displayName(p)} · ₹{p.selling_price} (Stock: {p.stock})
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Bill Items Table */}
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-secondary-soft text-muted font-bold text-xs uppercase tracking-wider border-b border-border">
              <tr>
                <th className="p-3 w-8 text-center">#</th>
                <th className="p-3">Item / Description</th>
                <th className="p-3 w-28 text-center">Quantity</th>
                <th className="p-3 w-32 text-right">Price (₹)</th>
                <th className="p-3 w-32 text-right">Total (₹)</th>
                <th className="p-3 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {items.map((row, idx) => {
                const rowTotal = (Number(row.quantity) || 0) * (Number(row.price) || 0);
                return (
                  <tr key={row.id} className="hover:bg-secondary-soft/30 transition-colors">
                    <td className="p-3 text-center text-xs font-mono text-muted">{idx + 1}</td>
                    <td className="p-3">
                      <Input
                        placeholder="e.g. Red Rose Garland, Orchid Bunch, Stage Decoration"
                        value={row.name}
                        onChange={(e) => updateRow(row.id, { name: e.target.value })}
                        className="h-9 text-xs sm:text-sm bg-surface font-medium"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={row.quantity || ""}
                        onChange={(e) => updateRow(row.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="h-9 text-xs sm:text-sm text-center font-bold"
                      />
                    </td>
                    <td className="p-3 text-right">
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0.00"
                        value={row.price || ""}
                        onChange={(e) => updateRow(row.id, { price: Math.max(0, parseFloat(e.target.value) || 0) })}
                        className="h-9 text-xs sm:text-sm text-right font-bold text-primary"
                      />
                    </td>
                    <td className="p-3 text-right font-display font-bold text-foreground">
                      {formatCurrency(rowTotal)}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="p-1.5 text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center">
          <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add Item Line
          </Button>
          <span className="text-xs text-muted font-medium">
            {items.filter((i) => i.name.trim()).length} active item(s)
          </span>
        </div>

        {/* Calculation & Checkout Summary Panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
          {/* Left: Notes & terms */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-foreground block">Bill Notes / Special Instructions</label>
            <textarea
              rows={3}
              placeholder="e.g. Delivery requested by 4 PM, Included message card: 'Happy Anniversary!'"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 text-xs sm:text-sm bg-surface rounded-xl border border-border outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
            />
            <div className="p-3 bg-secondary-soft rounded-xl border border-border text-xs text-muted space-y-1">
              <p className="font-semibold text-foreground flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp & PDF Ready
              </p>
              <p>Generates an itemized printable PDF invoice and connects directly to WhatsApp.</p>
            </div>
          </div>

          {/* Right: Totals & Payments */}
          <div className="p-4 sm:p-5 bg-secondary-soft/70 rounded-2xl border border-border space-y-3.5">
            <div className="flex justify-between items-center text-xs sm:text-sm">
              <span className="text-muted font-semibold">Subtotal</span>
              <span className="font-mono font-bold text-foreground">{formatCurrency(calculatedSubtotal)}</span>
            </div>

            <div className="flex justify-between items-center gap-3">
              <span className="text-muted font-semibold text-xs sm:text-sm">Discount (%)</span>
              <div className="w-24">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={discountPercentStr}
                  onChange={(e) => setDiscountPercentStr(e.target.value)}
                  className="h-8 text-right text-xs sm:text-sm font-bold bg-surface"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="text-sm sm:text-base font-bold text-foreground">Grand Total</span>
              <div className="flex items-center gap-1 border-b-2 border-primary focus-within:border-primary-dark">
                <span className="text-lg font-bold text-primary">₹</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={String(totalAfterDiscount)}
                  value={customTotalStr}
                  onChange={(e) => setCustomTotalStr(e.target.value.replace(/[^0-9.]/g, ""))}
                  className="w-28 text-right text-2xl font-display font-black text-foreground bg-transparent outline-none"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs sm:text-sm font-semibold text-muted">Amount Paid</span>
              <div className="flex items-center gap-1 border-b-2 border-border focus-within:border-primary">
                <span className="text-base font-bold text-muted">₹</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={String(finalTotal)}
                  value={amountPaidStr}
                  onChange={(e) => setAmountPaidStr(e.target.value.replace(/[^0-9.]/g, ""))}
                  className="w-24 text-right text-xl font-bold text-foreground bg-transparent outline-none"
                />
              </div>
            </div>

            {balanceDue > 0.01 && (
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 text-xs sm:text-sm font-bold">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" /> Credit Balance Due
                </span>
                <span>{formatCurrency(balanceDue)}</span>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full shadow-rose mt-2"
              loading={createSale.isPending}
            >
              Generate Bill & Send WhatsApp <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
