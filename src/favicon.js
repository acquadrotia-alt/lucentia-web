// Imposta favicon e titolo della scheda con il brand del salone, quando si è
// "dentro la pagina di un cliente" (app del salone o pagina pubblica di prenotazione).
export function setBrandTab(logo, title) {
  if (typeof document === "undefined") return;
  if (title) document.title = title;
  if (!logo) return;
  document.querySelectorAll("link[rel~='icon'], link[rel='apple-touch-icon'], link[rel='shortcut icon']").forEach((l) => { if (l.parentNode) l.parentNode.removeChild(l); });
  const link = document.createElement("link");
  link.rel = "icon";
  link.href = logo;
  document.head.appendChild(link);
}
