import { describe, it, expect } from "vitest";
import { bouquetCost, bouquetDefaultPrice, canMake, shortageText } from "@/lib/bouquet";

describe("bouquet helpers", () => {
  it("computes cost and default price", () => {
    const c = [{ quantity: 6, unitCost: 8, sellingPrice: 15 }, { quantity: 1, unitCost: 10, sellingPrice: 25 }];
    expect(bouquetCost(c)).toBe(58);
    expect(bouquetDefaultPrice(c)).toBe(115);
  });
  it("can make = min floor(stock/qty), 0 for empty recipe", () => {
    expect(canMake([{ quantity: 12, stock: 200 }, { quantity: 1, stock: 5 }])).toBe(5);
    expect(canMake([])).toBe(0);
  });
  it("formats shortage text", () => {
    expect(shortageText([{ name: "Rose Red", need: 12, have: 5 }])).toBe("Short: Rose Red (need 12, have 5)");
    expect(shortageText([{ name: "A", need: 1, have: 0 }, { name: "B", need: 2, have: 1 }])).toBe("Short: A (need 1, have 0), B (need 2, have 1)");
    expect(shortageText([])).toBe("");
  });
});
