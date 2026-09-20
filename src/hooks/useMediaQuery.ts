import { useEffect, useState } from "react";
export function useMediaQuery(q: string) {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q); const h = () => setM(mq.matches);
    mq.addEventListener("change", h); return () => mq.removeEventListener("change", h);
  }, [q]);
  return m;
}
