import { Fragment, useState } from "react";
import { Printer, Send } from "lucide-react";
import { toast } from "sonner";
import type { Sale } from "@/api/types";
import { SHOP } from "@/config/shop";
import { formatCurrency, padId } from "@/lib/utils";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";

async function buildPdf(sale: Sale) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 22;
  const line = () => { doc.line(20, y, 190, y); y += 6; };
  doc.setFont("courier", "bold"); doc.setFontSize(18); doc.text(SHOP.name.toUpperCase(), 105, y, { align: "center" }); y += 7;
  doc.setFont("courier", "normal"); doc.setFontSize(9);
  doc.text(SHOP.tagline, 105, y, { align: "center" }); y += 5;
  doc.text(`${SHOP.address} | ${SHOP.phone}`, 105, y, { align: "center" }); y += 5;
  doc.text(SHOP.gstin, 105, y, { align: "center" }); y += 6; line();
  doc.setFont("courier", "bold"); doc.text(`RECEIPT #${padId(sale.id)}`, 20, y);
  doc.setFont("courier", "normal"); doc.text(new Date(sale.date).toLocaleString("en-IN"), 190, y, { align: "right" }); y += 6;
  doc.text(`Customer: ${sale.customers?.name ?? "Walk-in Customer"}`, 20, y); y += 6; line();
  doc.setFont("courier", "bold"); doc.text("Item", 20, y); doc.text("Qty", 125, y, { align: "center" }); doc.text("Price", 158, y, { align: "right" }); doc.text("Total", 190, y, { align: "right" }); y += 3; line();
  doc.setFont("courier", "normal");
  const row = (name: string, qty: string, price: string, total: string, small = false) => {
    if (y > 270) { doc.addPage(); y = 22; }
    doc.setFontSize(small ? 8 : 9);
    doc.text(name.length > 34 ? name.slice(0, 31) + "..." : name, small ? 26 : 20, y);
    doc.text(qty, 125, y, { align: "center" }); doc.text(price, 158, y, { align: "right" }); doc.text(total, 190, y, { align: "right" }); y += small ? 4.5 : 6;
  };
  for (const it of sale.sale_items) {
    row(it.name, String(it.quantity), it.price.toFixed(2), it.total.toFixed(2));
    for (const c of it.sale_item_components) row(`- ${c.name}`, String(c.quantity), "", "", true);
  }
  line();
  const subtotal = sale.sale_items.reduce((s, i) => s + i.total, 0);
  doc.setFontSize(9);
  if (subtotal - sale.total > 0.01) {
    doc.text("Subtotal:", 130, y); doc.text(subtotal.toFixed(2), 190, y, { align: "right" }); y += 6;
    doc.text(`Discount (${(((subtotal - sale.total) / subtotal) * 100).toFixed(2)}%):`, 130, y); doc.text(`-${(subtotal - sale.total).toFixed(2)}`, 190, y, { align: "right" }); y += 6;
  }
  doc.setFont("courier", "bold"); doc.text("GRAND TOTAL:", 130, y); doc.text(`INR ${sale.total.toFixed(2)}`, 190, y, { align: "right" }); y += 6;
  doc.setFont("courier", "normal"); doc.text("Paid:", 130, y); doc.text(sale.amount_paid.toFixed(2), 190, y, { align: "right" }); y += 6;
  if (sale.total - sale.amount_paid > 0.01) { doc.text("Balance due:", 130, y); doc.text((sale.total - sale.amount_paid).toFixed(2), 190, y, { align: "right" }); y += 6; }
  y += 8; doc.setFont("courier", "italic"); doc.text(SHOP.receiptFooter, 105, y, { align: "center" });
  return doc;
}

export function ReceiptDialog({ sale, open, onOpenChange }: { sale: Sale | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [busy, setBusy] = useState<"print" | "share" | null>(null);
  if (!sale) return null;
  const subtotal = sale.sale_items.reduce((s, i) => s + i.total, 0);
  const discount = subtotal - sale.total;
  const due = sale.total - sale.amount_paid;

  const print = () => {
    const html = document.getElementById("receipt-content")?.innerHTML;
    if (!html) return;
    setBusy("print");
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;width:0;height:0;border:0;opacity:0";
    document.body.appendChild(iframe);
    const d = iframe.contentDocument;
    if (!d) { iframe.remove(); setBusy(null); return; }
    d.open();
    d.write(`<html><head><title>Receipt</title><style>
      body{font-family:Courier,monospace;font-size:12px;color:#000;margin:0;padding:8mm 6mm}
      table{width:100%;border-collapse:collapse} th,td{padding:3px 2px;text-align:left} .r{text-align:right} .c{text-align:center}
      .dash{border-top:1px dashed #000} .comp{font-size:10px;color:#444} .center{text-align:center} .b{font-weight:bold} .muted{color:#555;font-size:10px}
      @page{margin:0}</style></head><body>${html}</body></html>`);
    d.close();
    setTimeout(() => { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); setTimeout(() => { iframe.remove(); setBusy(null); }, 800); }, 250);
  };

  const share = async () => {
    setBusy("share");
    try {
      const doc = await buildPdf(sale);
      const blob = doc.output("blob");
      const file = new File([blob], `Receipt_${padId(sale.id)}.pdf`, { type: "application/pdf" });
      const text = `*${SHOP.name}*\nReceipt #${padId(sale.id)} — ${formatCurrency(sale.total)}${due > 0 ? ` (balance due ${formatCurrency(due)})` : ""}\n${SHOP.receiptFooter}`;
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Receipt #${padId(sale.id)}`, text });
      } else {
        doc.save(file.name);
        const phone = (sale.customers?.phone ?? "").replace(/\D/g, "");
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text + "\n(PDF downloaded — attach it to this chat)")}`, "_blank");
      }
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError")) toast.error("Could not share the receipt.");
    } finally { setBusy(null); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={`Receipt #${padId(sale.id)}`} size="sm"
      footer={<>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        <Button variant="outline" onClick={print} loading={busy === "print"}><Printer className="w-4 h-4" /> Print</Button>
        <Button variant="secondary" onClick={share} loading={busy === "share"}><Send className="w-4 h-4" /> WhatsApp</Button>
      </>}>
      <div id="receipt-content" className="font-mono text-sm">
        <div className="center text-center mb-4">
          <p className="b font-bold text-base uppercase tracking-widest">{SHOP.name}</p>
          <p className="muted text-xs text-muted">{SHOP.tagline}</p>
          <p className="muted text-xs text-muted">{SHOP.address} · {SHOP.phone}</p>
          <p className="muted text-xs text-muted">{SHOP.gstin}</p>
          <div className="dash border-t border-dashed border-border mt-2 pt-2 text-xs">
            <p>RECEIPT #{padId(sale.id)}</p><p>{new Date(sale.date).toLocaleString("en-IN")}</p>
          </div>
        </div>
        <p className="mb-3"><span className="muted text-xs text-muted uppercase">Customer: </span><span className="b font-bold">{sale.customers?.name ?? "Walk-in Customer"}</span></p>
        <table className="w-full">
          <thead><tr className="muted text-xs text-muted"><th className="text-left">Item</th><th className="c text-center">Qty</th><th className="r text-right">Price</th><th className="r text-right">Total</th></tr></thead>
          <tbody>
            {sale.sale_items.map((it) => (
              <Fragment key={it.id}>
                <tr><td>{it.name}</td><td className="c text-center">{it.quantity}</td><td className="r text-right">{formatCurrency(it.price)}</td><td className="r text-right b font-bold">{formatCurrency(it.total)}</td></tr>
                {it.sale_item_components.map((c) => <tr key={`c${c.id}`} className="comp text-xs text-muted"><td className="pl-3">– {c.quantity} {c.name}</td><td /><td /><td /></tr>)}
              </Fragment>
            ))}
          </tbody>
          <tfoot>
            {discount > 0.01 && <>
              <tr className="dash border-t border-dashed"><td colSpan={3} className="muted text-xs text-muted pt-2">Subtotal</td><td className="r text-right pt-2 text-xs">{formatCurrency(subtotal)}</td></tr>
              <tr><td colSpan={3} className="muted text-xs text-muted">Discount ({((discount / subtotal) * 100).toFixed(2)}%)</td><td className="r text-right text-xs">-{formatCurrency(discount)}</td></tr>
            </>}
            <tr className="dash border-t border-dashed"><td colSpan={3} className="b font-bold pt-2 uppercase">Grand Total</td><td className="r text-right b font-bold pt-2">{formatCurrency(sale.total)}</td></tr>
            <tr><td colSpan={3} className="muted text-xs text-muted">Paid</td><td className="r text-right text-xs">{formatCurrency(sale.amount_paid)}</td></tr>
            {due > 0.01 && <tr><td colSpan={3} className="b font-bold text-danger">Balance due</td><td className="r text-right b font-bold text-danger">{formatCurrency(due)}</td></tr>}
          </tfoot>
        </table>
        {sale.notes && <p className="muted text-xs text-muted mt-3 italic">{sale.notes}</p>}
        <p className="center text-center mt-5 pt-3 dash border-t border-dashed border-border italic">{SHOP.receiptFooter}</p>
      </div>
    </Dialog>
  );
}
