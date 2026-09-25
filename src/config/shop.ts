/**
 * Shop details printed on every receipt.
 *
 * Fill these in once before going live. Any field left as an empty string is
 * simply left off the receipt — nothing placeholder-looking is ever printed
 * for a customer.
 */
export const SHOP = {
  name: "Sidhi Florals",
  tagline: "Fresh flowers, bouquets & garlands",
  address: "",
  phone: "",
  gstin: "",
  receiptFooter: "Thank you for choosing Sidhi Florals!",
} as const;

/** Header lines for the receipt, with blank fields dropped. */
export function shopHeaderLines(): string[] {
  const contact = [SHOP.address, SHOP.phone].filter(Boolean).join(" · ");
  return [
    SHOP.tagline,
    contact,
    SHOP.gstin ? `GSTIN: ${SHOP.gstin}` : "",
  ].filter(Boolean);
}
