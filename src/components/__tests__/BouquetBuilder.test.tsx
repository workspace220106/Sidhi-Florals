import { describe, it, expect, vi } from "vitest";
import { render as rtlRender, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LazyMotion, domAnimation } from "motion/react";
import { BouquetBuilder } from "@/components/BouquetBuilder";
import type { Product } from "@/api/types";
import type { ReactElement } from "react";

const render = (ui: ReactElement) => rtlRender(<LazyMotion features={domAnimation}>{ui}</LazyMotion>);

const p = (o: Partial<Product>): Product => ({
  id: 1, name: "Rose", variety: "Red", unit: "stem", category: "flower", purchase_price: 8, selling_price: 15, stock: 20, supplier: "", created_at: "", ...o,
});
const products = [p({}), p({ id: 2, name: "Lily", variety: "White", purchase_price: 35, selling_price: 70, stock: 2 }), p({ id: 3, name: "Red Rose Bouquet", variety: "", category: "bouquet" })];

describe("BouquetBuilder", () => {
  it("adds components, defaults price to selling total, and submits", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<BouquetBuilder open onOpenChange={() => {}} mode="custom" products={products} onSubmit={onSubmit} />);

    expect(screen.queryByText("Red Rose Bouquet")).toBeNull();

    await user.click(screen.getByRole("button", { name: /add rose · red/i }));
    await user.click(screen.getByRole("button", { name: /add rose · red/i }));
    await user.click(screen.getByRole("button", { name: /add lily · white/i }));

    const price = screen.getByLabelText(/^price/i) as HTMLInputElement;
    expect(price.value).toBe("100");
    expect(screen.getByText(/material cost/i).parentElement).toHaveTextContent("₹51");

    await user.clear(price);
    await user.type(price, "150");
    await user.click(screen.getByRole("button", { name: /add to bill/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const r = onSubmit.mock.calls[0][0];
    expect(r.price).toBe(150);
    expect(r.components).toEqual([
      expect.objectContaining({ productId: 1, quantity: 2 }),
      expect.objectContaining({ productId: 2, quantity: 1 }),
    ]);
  });

  it("blocks quantities above stock in custom mode", async () => {
    const user = userEvent.setup();
    render(<BouquetBuilder open onOpenChange={() => {}} mode="custom" products={products} onSubmit={() => {}} />);
    const add = screen.getByRole("button", { name: /add lily · white/i });
    await user.click(add); await user.click(add); await user.click(add);
    expect(screen.getByLabelText(/quantity of lily · white/i)).toHaveValue(2);
  });

  it("recipe mode hides price and shows Save recipe", () => {
    render(<BouquetBuilder open onOpenChange={() => {}} mode="recipe" products={products} onSubmit={() => {}} />);
    expect(screen.queryByLabelText(/^price/i)).toBeNull();
    expect(screen.getByRole("button", { name: /save recipe/i })).toBeInTheDocument();
  });
});
