export function bouquetCost(components: { quantity: number; unitCost: number }[]) {
  return components.reduce((s, c) => s + c.quantity * c.unitCost, 0);
}

export function bouquetDefaultPrice(components: { quantity: number; sellingPrice: number }[]) {
  return components.reduce((s, c) => s + c.quantity * c.sellingPrice, 0);
}

export function canMake(recipe: { quantity: number; stock: number }[]) {
  if (recipe.length === 0) return 0;
  return Math.min(...recipe.map((r) => Math.floor(r.stock / r.quantity)));
}

export function shortageText(shortages: { name: string; need: number; have: number }[]) {
  if (shortages.length === 0) return "";
  return "Short: " + shortages.map((s) => `${s.name} (need ${s.need}, have ${s.have})`).join(", ");
}
