/** Spawns petals from the centre of `el`; each removes itself when its CSS animation ends. */
export function burstPetals(el: HTMLElement, count = 5) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const r = el.getBoundingClientRect();
  for (let i = 0; i < count; i++) {
    const img = document.createElement("img");
    img.src = "/petal.svg"; img.alt = ""; img.className = "petal-burst"; img.width = 12; img.height = 12;
    const angle = Math.PI + (Math.PI * (i + 0.5)) / count; // upward fan
    img.style.position = "fixed"; img.style.zIndex = "60";
    img.style.left = `${r.left + r.width / 2}px`; img.style.top = `${r.top + r.height / 2}px`;
    img.style.setProperty("--bx", `${Math.cos(angle) * 60}px`); img.style.setProperty("--by", `${Math.sin(angle) * 60}px`);
    document.body.appendChild(img);
    img.addEventListener("animationend", () => img.remove());
    setTimeout(() => img.remove(), 1000);
  }
}
