import { useState } from "react";
import { Menu } from "lucide-react";
import { Sheet } from "../ui/Dialog";
import { Logo } from "./Logo";
import { SidebarContent } from "./Sidebar";

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-surface/95 border-b border-border">
      <Logo compact />
      <button onClick={() => setOpen(true)} className="p-2 rounded-lg text-muted hover:bg-primary-soft hover:text-primary cursor-pointer" aria-label="Open menu"><Menu className="w-6 h-6" /></button>
      <Sheet open={open} onOpenChange={setOpen} side="left"><SidebarContent onNavigate={() => setOpen(false)} /></Sheet>
    </header>
  );
}
