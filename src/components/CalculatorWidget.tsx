import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Calculator, X, Delete } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { cn } from "@/lib/utils";

function evaluate(expr: string): string {
  const s = expr.replace(/[^-+*/().\d\s]/g, "");
  if (!s.trim()) return "0";
  try {
    const r = Function(`"use strict"; return (${s})`)() as number;
    return Number.isFinite(r) ? String(Number(r.toFixed(4))) : "Error";
  } catch {
    return "Error";
  }
}

export function CalculatorWidget() {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState("0");
  const [eq, setEq] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) ref.current?.focus(); }, [open]);

  const num = (n: string) => setDisplay((d) => (d === "0" || d === "Error" ? n : d + n));
  const op = (o: string) => { setEq(display + " " + o + " "); setDisplay("0"); };
  const calc = () => { setDisplay(evaluate(eq + display)); setEq(""); };
  const clear = () => { setDisplay("0"); setEq(""); };
  const back = () => setDisplay((d) => (d.length > 1 ? d.slice(0, -1) : "0"));

  const onKey = (e: KeyboardEvent) => {
    if (/^[0-9.]$/.test(e.key)) num(e.key);
    else if (["+", "-", "*", "/"].includes(e.key)) { e.preventDefault(); op(e.key); }
    else if (e.key === "Enter" || e.key === "=") { e.preventDefault(); calc(); }
    else if (e.key === "Backspace") back();
    else if (e.key === "Delete") clear();
    else if (e.key === "Escape") setOpen(false);
  };

  const k = "h-12 rounded-xl font-display font-semibold text-lg bg-surface border border-border hover:bg-background active:scale-95 transition-transform cursor-pointer";
  const o = "h-12 rounded-xl font-display font-semibold text-lg bg-primary-soft text-primary hover:bg-primary hover:text-white active:scale-95 transition-[transform,background-color] cursor-pointer";
  const keys: [string, () => void, string][] = [
    ["7", () => num("7"), k], ["8", () => num("8"), k], ["9", () => num("9"), k], ["×", () => op("*"), o],
    ["4", () => num("4"), k], ["5", () => num("5"), k], ["6", () => num("6"), k], ["−", () => op("-"), o],
    ["1", () => num("1"), k], ["2", () => num("2"), k], ["3", () => num("3"), k], ["+", () => op("+"), o],
  ];

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end lg:bottom-8 lg:right-8">
      <AnimatePresence>
        {open && (
          <m.div ref={ref} tabIndex={0} onKeyDown={onKey} initial={{ opacity: 0, y: 16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.95 }} transition={{ duration: 0.18 }}
            className="mb-3 w-72 card p-4 outline-none focus:ring-4 focus:ring-primary/15">
            <div className="flex justify-between items-center mb-3"><h3 className="text-base flex items-center gap-2"><Calculator className="w-4 h-4 text-primary" /> Calculator</h3><button onClick={() => setOpen(false)} className="p-1 rounded-full text-muted hover:bg-background cursor-pointer" aria-label="Close"><X className="w-4 h-4" /></button></div>
            <div className="bg-background border border-border rounded-xl p-3 mb-3 text-right"><div className="text-xs text-muted h-4 font-mono">{eq}</div><div className="text-3xl font-display font-bold truncate">{display}</div></div>
            <div className="grid grid-cols-4 gap-2">
              <button onClick={clear} className={cn(k, "col-span-2 text-danger bg-danger-soft border-danger/20")}>AC</button>
              <button onClick={back} className={cn(k, "flex items-center justify-center")} aria-label="Backspace"><Delete className="w-5 h-5" /></button>
              <button onClick={() => op("/")} className={o}>÷</button>
              {keys.map(([label, fn, cls]) => <button key={label} onClick={fn} className={cls}>{label}</button>)}
              <button onClick={() => num("0")} className={cn(k, "col-span-2")}>0</button>
              <button onClick={() => num(".")} className={k}>.</button>
              <button onClick={calc} className="h-12 rounded-xl font-display font-bold text-xl btn-primary">=</button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
      <button onClick={() => setOpen((v) => !v)} aria-label="Calculator"
        className={cn("w-14 h-14 rounded-full flex items-center justify-center shadow-rose transition-transform hover:scale-105 active:scale-95 cursor-pointer", open ? "bg-surface text-foreground border border-border" : "bg-linear-to-br from-primary to-accent text-white")}>
        {open ? <X className="w-6 h-6" /> : <Calculator className="w-6 h-6" />}
      </button>
    </div>
  );
}
