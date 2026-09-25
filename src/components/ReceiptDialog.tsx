import { Fragment, useState, useEffect } from "react";
import { Printer, Send, Download, X, Phone } from "lucide-react";
import { toast } from "sonner";
import type { Sale } from "@/api/types";
import { SHOP, shopHeaderLines } from "@/config/shop";
import { formatCurrency, padId } from "@/lib/utils";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

async function buildPdf(sale: Sale) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  let y = 25;
  const line = () => { doc.line(20, y, 190, y); y += 6; };

  // Header
  doc.setFont("courier", "bold");
  doc.setFontSize(20);
  doc.text(SHOP.name.toUpperCase(), 105, y, { align: "center" });
  y += 7;

  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  for (const l of shopHeaderLines()) {
    doc.text(l, 105, y, { align: "center" });
    y += 5;
  }
  y += 2;
  line();

  // Receipt & Customer Info
  doc.setFont("courier", "bold");
  doc.text(`RECEIPT #${padId(sale.id)}`, 20, y);
  doc.setFont("courier", "normal");
  doc.text(new Date(sale.date).toLocaleString("en-IN"), 190, y, { align: "right" });
  y += 6;

  doc.text(`Customer: ${sale.customers?.name ?? "Walk-in Customer"}`, 20, y);
  y += 6;
  if (sale.customers?.phone) {
    doc.text(`Phone: ${sale.customers.phone}`, 20, y);
    y += 6;
  }
  line();

  // Table Headers
  doc.setFont("courier", "bold");
  doc.text("Item", 20, y);
  doc.text("Qty", 125, y, { align: "center" });
  doc.text("Price", 158, y, { align: "right" });
  doc.text("Total", 190, y, { align: "right" });
  y += 3;
  line();
  doc.setFont("courier", "normal");

  // Items
  const row = (name: string, qty: string, price: string, total: string, small = false) => {
    if (y > 265) {
      doc.addPage();
      y = 25;
      doc.setFont("courier", "bold");
      doc.text("Item", 20, y);
      doc.text("Qty", 125, y, { align: "center" });
      doc.text("Price", 158, y, { align: "right" });
      doc.text("Total", 190, y, { align: "right" });
      y += 3;
      line();
      doc.setFont("courier", "normal");
    }
    doc.setFontSize(small ? 8 : 9);
    doc.text(name.length > 34 ? name.slice(0, 31) + "..." : name, small ? 26 : 20, y);
    doc.text(qty, 125, y, { align: "center" });
    doc.text(price, 158, y, { align: "right" });
    doc.text(total, 190, y, { align: "right" });
    y += small ? 4.5 : 6;
  };

  for (const it of sale.sale_items) {
    row(it.name, String(it.quantity), `INR ${it.price.toFixed(2)}`, `INR ${it.total.toFixed(2)}`);
    for (const c of it.sale_item_components) {
      row(`- ${c.name}`, String(c.quantity), "", "", true);
    }
  }
  line();

  // Summary
  const subtotal = sale.sale_items.reduce((s, i) => s + i.total, 0);
  const discount = subtotal - sale.total;
  doc.setFontSize(9);
  if (discount > 0.01) {
    doc.text("Subtotal:", 130, y);
    doc.text(`INR ${subtotal.toFixed(2)}`, 190, y, { align: "right" });
    y += 6;
    doc.text(`Discount (${((discount / subtotal) * 100).toFixed(2)}%):`, 130, y);
    doc.text(`-INR ${discount.toFixed(2)}`, 190, y, { align: "right" });
    y += 6;
  }
  doc.setFont("courier", "bold");
  doc.text("GRAND TOTAL:", 130, y);
  doc.text(`INR ${sale.total.toFixed(2)}`, 190, y, { align: "right" });
  y += 6;
  doc.setFont("courier", "normal");
  doc.text("Amount Paid:", 130, y);
  doc.text(`INR ${sale.amount_paid.toFixed(2)}`, 190, y, { align: "right" });
  y += 6;

  if (sale.total - sale.amount_paid > 0.01) {
    doc.setFont("courier", "bold");
    doc.text("Balance Due:", 130, y);
    doc.text(`INR ${(sale.total - sale.amount_paid).toFixed(2)}`, 190, y, { align: "right" });
    y += 6;
    doc.setFont("courier", "normal");
  }

  y += 8;
  doc.setFont("courier", "italic");
  doc.setFontSize(9);
  doc.text(SHOP.receiptFooter, 105, y, { align: "center" });
  y += 5;
  doc.text("Please visit again!", 105, y, { align: "center" });
  return doc;
}

const fileNameFor = (sale: Sale) => `${SHOP.name.replace(/\s+/g, "-")}-Receipt-${padId(sale.id)}.pdf`;

export function ReceiptDialog({ sale, open, onOpenChange }: { sale: Sale | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [busy, setBusy] = useState<"print" | "pdf" | "share" | null>(null);
  const [phoneInput, setPhoneInput] = useState("");
  const [showPhoneEditor, setShowPhoneEditor] = useState(false);

  useEffect(() => {
    if (sale?.customers?.phone) {
      setPhoneInput(sale.customers.phone);
    } else {
      setPhoneInput("");
    }
    setShowPhoneEditor(false);
  }, [sale]);

  if (!sale) return null;

  const subtotal = sale.sale_items.reduce((s, i) => s + i.total, 0);
  const discount = subtotal - sale.total;
  const due = sale.total - sale.amount_paid;

  const print = () => {
    const html = document.getElementById("receipt-content")?.innerHTML;
    if (!html) { toast.error("Receipt is not ready yet."); return; }
    setBusy("print");
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText = "position:fixed;width:0;height:0;border:0;opacity:0";
    document.body.appendChild(iframe);
    const d = iframe.contentDocument;
    if (!d) { iframe.remove(); setBusy(null); toast.error("Could not open print view."); return; }
    d.open();
    d.write(`<html><head><title>Receipt ${padId(sale.id)}</title><style>
      body{font-family:Courier,monospace;font-size:12px;color:#000;margin:0;padding:8mm 6mm}
      table{width:100%;border-collapse:collapse} th,td{padding:3px 2px;text-align:left}
      .r{text-align:right} .c{text-align:center} .dash{border-top:1px dashed #000}
      .comp{font-size:10px;color:#444} .center{text-align:center} .b{font-weight:bold}
      .muted{color:#555;font-size:10px} @page{margin:0}</style></head><body>${html}</body></html>`);
    d.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => { iframe.remove(); setBusy(null); }, 1000);
    }, 250);
  };

  const downloadPdf = async () => {
    setBusy("pdf");
    try {
      const doc = await buildPdf(sale);
      doc.save(fileNameFor(sale));
      toast.success("PDF receipt downloaded successfully");
    } catch (e) {
      console.error(e);
      toast.error("Could not create the PDF.");
    } finally { setBusy(null); }
  };

  const shareOnWhatsApp = async () => {
    setBusy("share");
    try {
      const doc = await buildPdf(sale);
      const filename = fileNameFor(sale);
      const pdfBlob = doc.output("blob");
      const file = new File([pdfBlob], filename, { type: "application/pdf" });

      // Clean phone number
      const targetPhone = (phoneInput || sale.customers?.phone || "").replace(/\D/g, "");
      const formattedPhone = targetPhone.length === 10 ? "91" + targetPhone : targetPhone;

      // Itemized message text
      const itemsText = sale.sale_items
        .map((it) => `• ${it.name} (x${it.quantity}) - ₹${it.total.toFixed(2)}`)
        .join("\n");

      const message = `*🌸 ${SHOP.name.toUpperCase()} 🌸*\n`
        + `*RECEIPT #${padId(sale.id)}*\n`
        + `--------------------------------\n`
        + `📅 *Date:* ${new Date(sale.date).toLocaleString("en-IN")}\n`
        + `👤 *Customer:* ${sale.customers?.name ?? "Valued Customer"}\n`
        + `--------------------------------\n`
        + `*Items:*\n${itemsText}\n`
        + `--------------------------------\n`
        + (discount > 0.01 ? `Subtotal: ₹${subtotal.toFixed(2)}\nDiscount: -₹${discount.toFixed(2)}\n` : "")
        + `*GRAND TOTAL:* ₹${sale.total.toFixed(2)}\n`
        + `Amount Paid: ₹${sale.amount_paid.toFixed(2)}\n`
        + (due > 0.01 ? `*⚠️ BALANCE DUE:* ₹${due.toFixed(2)}\n` : "")
        + `--------------------------------\n`
        + `${SHOP.receiptFooter}\n`
        + `_Thank you for your business!_`;

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Receipt #${padId(sale.id)} - ${SHOP.name}`,
          text: message,
        });
        toast.success("Receipt shared!");
      } else {
        // Desktop / Browser fallback: download the PDF and open WhatsApp web
        doc.save(filename);
        const waUrl = formattedPhone
          ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
          : `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(waUrl, "_blank", "noopener,noreferrer");
        toast.success("PDF saved! WhatsApp tab opened with the bill message.");
      }
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError")) {
        console.error(e);
        toast.error("Could not share receipt on WhatsApp.");
      }
    } finally { setBusy(null); }
  };

  const anyBusy = busy !== null;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Receipt #${padId(sale.id)}`}
      size="sm"
      footer={
        <div className="w-full space-y-3">
          {/* Quick Phone input for WhatsApp if needed */}
          <div className="bg-secondary-soft p-2.5 rounded-xl border border-border">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-xs font-semibold text-muted flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-primary" /> WhatsApp Number
              </span>
              {!showPhoneEditor && (
                <button
                  type="button"
                  onClick={() => setShowPhoneEditor(true)}
                  className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                >
                  {phoneInput ? "Edit Phone" : "+ Add Phone"}
                </button>
              )}
            </div>
            {showPhoneEditor || !phoneInput ? (
              <div className="flex gap-2">
                <Input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="h-8 text-xs bg-surface"
                />
                {showPhoneEditor && (
                  <Button size="sm" variant="secondary" onClick={() => setShowPhoneEditor(false)} className="h-8 text-xs px-2.5">
                    Done
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-xs font-mono font-bold text-foreground">
                {phoneInput}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={print} loading={busy === "print"} disabled={anyBusy && busy !== "print"}>
              <Printer className="w-4 h-4" /> Print
            </Button>
            <Button variant="outline" onClick={downloadPdf} loading={busy === "pdf"} disabled={anyBusy && busy !== "pdf"}>
              <Download className="w-4 h-4" /> Download PDF
            </Button>
          </div>

          <Button
            variant="primary"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md hover:shadow-emerald-600/20"
            onClick={shareOnWhatsApp}
            loading={busy === "share"}
            disabled={anyBusy && busy !== "share"}
          >
            <Send className="w-4 h-4" /> Send PDF via WhatsApp
          </Button>

          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)} disabled={anyBusy}>
            <X className="w-4 h-4" /> Close
          </Button>
        </div>
      }
    >
      <div id="receipt-content" className="font-mono text-sm bg-surface p-2 rounded-xl">
        <div className="center text-center mb-4">
          <p className="b font-bold text-base uppercase tracking-widest text-foreground">{SHOP.name}</p>
          {shopHeaderLines().map((l) => (
            <p key={l} className="muted text-xs text-muted">{l}</p>
          ))}
          <div className="dash border-t border-dashed border-border mt-2 pt-2 text-xs">
            <p className="font-bold">RECEIPT #{padId(sale.id)}</p>
            <p>{new Date(sale.date).toLocaleString("en-IN")}</p>
          </div>
        </div>

        <div className="mb-3">
          <span className="muted text-xs text-muted uppercase">Customer: </span>
          <span className="b font-bold text-foreground">{sale.customers?.name ?? "Walk-in Customer"}</span>
          {(phoneInput || sale.customers?.phone) && (
            <p className="muted text-xs text-muted">Phone: {phoneInput || sale.customers?.phone}</p>
          )}
        </div>

        <table className="w-full">
          <thead>
            <tr className="muted text-xs text-muted border-b border-border">
              <th className="text-left py-1">Item</th>
              <th className="c text-center py-1">Qty</th>
              <th className="r text-right py-1">Price</th>
              <th className="r text-right py-1">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.sale_items.map((it) => (
              <Fragment key={it.id}>
                <tr>
                  <td className="py-1">{it.name}</td>
                  <td className="c text-center py-1">{it.quantity}</td>
                  <td className="r text-right py-1">{formatCurrency(it.price)}</td>
                  <td className="r text-right b font-bold py-1">{formatCurrency(it.total)}</td>
                </tr>
                {it.sale_item_components.map((c) => (
                  <tr key={`c${c.id}`} className="comp text-xs text-muted">
                    <td className="pl-3">– {c.quantity} {c.name}</td><td /><td /><td />
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
          <tfoot>
            {discount > 0.01 && (
              <>
                <tr className="dash border-t border-dashed border-border">
                  <td colSpan={3} className="muted text-xs text-muted pt-2">Subtotal</td>
                  <td className="r text-right pt-2 text-xs">{formatCurrency(subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="muted text-xs text-muted">Discount ({((discount / subtotal) * 100).toFixed(2)}%)</td>
                  <td className="r text-right text-xs font-semibold text-red-600">-{formatCurrency(discount)}</td>
                </tr>
              </>
            )}
            <tr className="dash border-t border-dashed border-border">
              <td colSpan={3} className="b font-bold pt-2 uppercase text-foreground">Grand Total</td>
              <td className="r text-right b font-bold pt-2 text-primary">{formatCurrency(sale.total)}</td>
            </tr>
            <tr>
              <td colSpan={3} className="muted text-xs text-muted">Amount Paid</td>
              <td className="r text-right text-xs font-semibold">{formatCurrency(sale.amount_paid)}</td>
            </tr>
            {due > 0.01 && (
              <tr>
                <td colSpan={3} className="b font-bold text-amber-600">Balance due</td>
                <td className="r text-right b font-bold text-amber-600">{formatCurrency(due)}</td>
              </tr>
            )}
          </tfoot>
        </table>

        {sale.notes && <p className="muted text-xs text-muted mt-3 italic bg-secondary-soft p-2 rounded">{sale.notes}</p>}
        <p className="center text-center mt-5 pt-3 dash border-t border-dashed border-border italic text-xs text-muted">{SHOP.receiptFooter}</p>
      </div>
    </Dialog>
  );
}
