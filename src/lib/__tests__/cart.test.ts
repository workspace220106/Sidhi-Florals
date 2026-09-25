import { describe, it, expect } from "vitest";
import { cartSubtotal, cartCount, resolveTotals, validateCheckout, componentsSummary, type CartLine } from "@/lib/cart";

const line = (over: Partial<CartLine> = {}): CartLine => ({
  key: "p1", kind: "product", productId: 1, name: "Rose Red", price: 15, quantity: 2, maxQuantity: 100, components: [], ...over,
});

describe("cart math", () => {
  it("sums subtotal and count", () => {
    const lines = [line(), line({ key: "p2", price: 100, quantity: 1 })];
    expect(cartSubtotal(lines)).toBe(130);
    expect(cartCount(lines)).toBe(3);
  });
  it("uses subtotal when custom total and paid are blank", () => {
    expect(resolveTotals([line()], "", "")).toEqual({ subtotal: 30, total: 30, amountPaid: 30, due: 0 });
  });
  it("applies custom total and partial payment", () => {
    expect(resolveTotals([line()], "25", "10")).toEqual({ subtotal: 30, total: 25, amountPaid: 10, due: 15 });
  });
  it("ignores garbage input", () => {
    const t = resolveTotals([line()], "abc", "x");
    expect(t.total).toBe(30);
    expect(t.amountPaid).toBe(30);
  });
  it("requires a customer for credit sales", () => {
    const totals = resolveTotals([line()], "", "10");
    expect(validateCheckout([line()], totals, "")).toMatch(/customer/i);
    expect(validateCheckout([line()], totals, "3")).toBeNull();
  });
  it("rejects empty cart", () => {
    expect(validateCheckout([], resolveTotals([], "", ""), "")).toMatch(/empty/i);
  });

  it("rejects a zero or negative total", () => {
    expect(validateCheckout([line()], resolveTotals([line()], "0", ""), "")).toMatch(/₹0/);
    expect(validateCheckout([line()], resolveTotals([line()], "-5", ""), "")).toMatch(/valid amount/i);
  });

  it("rejects paying more than the total", () => {
    expect(validateCheckout([line()], resolveTotals([line()], "30", "50"), "")).toMatch(/more than the total/i);
  });

  it("accepts an exactly-paid bill with no customer", () => {
    expect(validateCheckout([line()], resolveTotals([line()], "30", "30"), "")).toBeNull();
  });
  it("summarises components", () => {
    expect(componentsSummary([
      { productId: 1, name: "Rose Red", quantity: 6, unitCost: 8, sellingPrice: 15 },
      { productId: 2, name: "Lily White", quantity: 4, unitCost: 35, sellingPrice: 70 },
    ])).toBe("6 Rose Red, 4 Lily White");
  });
});
