import { describe, it, expect } from "vitest";
import { resolveTotals, validateCheckout, type CartLine } from "@/lib/cart";

/**
 * Both billing screens (POS Catalog and Quick Bill) must enforce identical
 * rules. These lock the shared contract so a future third path can't quietly
 * diverge the way Quick Bill originally did.
 */
const productLine = (over: Partial<CartLine> = {}): CartLine => ({
  key: "row-1",
  kind: "product",
  productId: 9,
  name: "Carnation · Pink",
  price: 22,
  quantity: 1,
  maxQuantity: null,
  components: [],
  ...over,
});

describe("checkout rules shared by both billing screens", () => {
  it("accepts a straightforward fully-paid walk-in bill", () => {
    const lines = [productLine()];
    const totals = resolveTotals(lines, "", "");
    expect(totals.total).toBe(22);
    expect(totals.due).toBe(0);
    expect(validateCheckout(lines, totals, "")).toBeNull();
  });

  it("refuses a bill with no items", () => {
    expect(validateCheckout([], resolveTotals([], "", ""), "")).toMatch(/empty/i);
  });

  it("refuses a zero total even when items are present", () => {
    const lines = [productLine()];
    expect(validateCheckout(lines, resolveTotals(lines, "0", ""), "")).toMatch(/₹0/);
  });

  it("refuses a negative total", () => {
    const lines = [productLine()];
    expect(validateCheckout(lines, resolveTotals(lines, "-10", ""), "")).toMatch(/valid amount/i);
  });

  it("refuses paying more than the bill", () => {
    const lines = [productLine()];
    expect(validateCheckout(lines, resolveTotals(lines, "22", "50"), "")).toMatch(/more than the total/i);
  });

  it("refuses a credit sale with no customer to chase", () => {
    const lines = [productLine()];
    const totals = resolveTotals(lines, "22", "10");
    expect(totals.due).toBe(12);
    expect(validateCheckout(lines, totals, "")).toMatch(/customer/i);
  });

  it("allows the same credit sale once a customer is attached", () => {
    const lines = [productLine()];
    const totals = resolveTotals(lines, "22", "10");
    expect(validateCheckout(lines, totals, "4")).toBeNull();
  });

  it("treats a discounted total as the amount actually owed", () => {
    const lines = [productLine({ price: 100, quantity: 2 })];
    const totals = resolveTotals(lines, "150", "150");
    expect(totals.subtotal).toBe(200);
    expect(totals.total).toBe(150);
    expect(validateCheckout(lines, totals, "")).toBeNull();
  });

  it("carries a multi-line bill through to the right total", () => {
    const lines = [
      productLine({ key: "a", price: 22, quantity: 3 }),
      productLine({ key: "b", productId: 6, name: "Lily · White", price: 70, quantity: 2 }),
    ];
    const totals = resolveTotals(lines, "", "");
    expect(totals.total).toBe(3 * 22 + 2 * 70);
  });
});
