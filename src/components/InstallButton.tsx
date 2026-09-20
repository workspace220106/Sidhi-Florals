import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstallButton() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  if (!evt || window.matchMedia("(display-mode: standalone)").matches) return null;
  return (
    <button onClick={async () => { await evt.prompt(); await evt.userChoice; setEvt(null); }} className="btn-primary w-full">
      <Download className="w-4 h-4" /> Install App
    </button>
  );
}
