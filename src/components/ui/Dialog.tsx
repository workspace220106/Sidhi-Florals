import * as RD from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface DialogProps {
  open: boolean; onOpenChange: (o: boolean) => void; title: ReactNode; description?: string;
  children: ReactNode; footer?: ReactNode; size?: "sm" | "md" | "lg" | "xl";
}
const sizes = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

export function Dialog({ open, onOpenChange, title, description, children, footer, size = "md" }: DialogProps) {
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <RD.Portal forceMount>
            <RD.Overlay asChild forceMount>
              <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
                className="fixed inset-0 z-50 bg-foreground/35" />
            </RD.Overlay>
            <RD.Content asChild forceMount aria-describedby={description ? undefined : ""}>
              <m.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={cn("fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-h-[90vh] flex flex-col card overflow-hidden", sizes[size])}>
                <div className="px-6 py-4 border-b border-border flex items-start justify-between gap-4 bg-background/60">
                  <div>
                    <RD.Title className="font-display text-xl font-semibold">{title}</RD.Title>
                    {description && <RD.Description className="text-sm text-muted mt-0.5">{description}</RD.Description>}
                  </div>
                  <RD.Close className="p-1.5 rounded-lg text-muted hover:bg-primary-soft hover:text-primary transition-colors cursor-pointer" aria-label="Close"><X className="w-5 h-5" /></RD.Close>
                </div>
                <div className="p-6 overflow-y-auto flex-1">{children}</div>
                {footer && <div className="px-6 py-4 border-t border-border bg-background/60 flex flex-wrap justify-end gap-3">{footer}</div>}
              </m.div>
            </RD.Content>
          </RD.Portal>
        )}
      </AnimatePresence>
    </RD.Root>
  );
}

interface SheetProps { open: boolean; onOpenChange: (o: boolean) => void; side?: "left" | "bottom"; children: ReactNode; title?: string }
export function Sheet({ open, onOpenChange, side = "left", children, title = "Menu" }: SheetProps) {
  const isLeft = side === "left";
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <RD.Portal forceMount>
            <RD.Overlay asChild forceMount>
              <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="fixed inset-0 z-50 bg-foreground/35" />
            </RD.Overlay>
            <RD.Content asChild forceMount aria-describedby="">
              <m.div
                initial={isLeft ? { x: "-100%" } : { y: "100%" }} animate={{ x: 0, y: 0 }} exit={isLeft ? { x: "-100%" } : { y: "100%" }}
                transition={{ type: "spring", stiffness: 380, damping: 36 }}
                className={cn("fixed z-50 bg-surface shadow-2xl flex flex-col", isLeft ? "top-0 left-0 h-full w-72" : "left-0 right-0 bottom-0 max-h-[92vh] rounded-t-3xl")}>
                <RD.Title className="sr-only">{title}</RD.Title>
                {children}
              </m.div>
            </RD.Content>
          </RD.Portal>
        )}
      </AnimatePresence>
    </RD.Root>
  );
}
