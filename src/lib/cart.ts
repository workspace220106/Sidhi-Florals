export interface CartComponent {
  productId: number;
  name: string;
  quantity: number;
  unitCost: number;
  sellingPrice: number;
}

export interface CartLine {
  key: string;
  kind: "product" | "custom_bouquet";
  productId: number | null;
  name: string;
  price: number;
  quantity: number;
  maxQuantity: number | null;
  components: CartComponent[];
}

export interface CartTotals {
  subtotal: number;
  total: number;
  amountPaid: number;
  due: number;
}

export function cartSubtotal(lines: CartLine[]) {
  return lines.reduce((s, l) => s + l.price * l.quantity, 0);
}

export function cartCount(lines: CartLine[]) {
  return lines.reduce((s, l) => s + l.quantity, 0);
}

function parseMoney(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

export function resolveTotals(lines: CartLine[], customTotalStr: string, amountPaidStr: string): CartTotals {
  const subtotal = cartSubtotal(lines);
  const total = parseMoney(customTotalStr) ?? subtotal;
  const amountPaid = parseMoney(amountPaidStr) ?? total;
  return { subtotal, total, amountPaid, due: Math.max(0, total - amountPaid) };
}

export function validateCheckout(lines: CartLine[], totals: CartTotals, customerId: string): string | null {
  if (lines.length === 0) return "Cart is empty.";
  if (totals.amountPaid < totals.total && !customerId) return "Select a registered customer to record a credit sale.";
  return null;
}

export function componentsSummary(components: CartComponent[]) {
  return components.map((c) => `${c.quantity} ${c.name}`).join(", ");
}
