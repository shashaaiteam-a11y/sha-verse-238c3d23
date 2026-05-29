// Owner contact + entry-point config for the "Promote with Us" system.
// NOTE: Set OWNER_WHATSAPP to the owner's number (digits only, with country
// code, e.g. "919999999999") once available — the WhatsApp button uses it.

export const OWNER_EMAIL = "SHASHAAITEAM@GMAIL.COM";

/** Digits only, country code first, no "+". Empty = WhatsApp button hidden. */
export const OWNER_WHATSAPP = "";

/** Routes where the floating Promote button is hidden (mirrors BottomNav). */
export const PROMOTE_HIDDEN_PREFIXES = [
  "/auth",
  "/messages",
  "/movion",
  "/bookshelf/read/",
];

export function isPromoteHidden(pathname: string): boolean {
  if (pathname === "/auth" || pathname === "/messages") return true;
  if (pathname.includes("/watch/")) return true;
  return PROMOTE_HIDDEN_PREFIXES.some((p) =>
    p.endsWith("/") ? pathname.startsWith(p) : pathname.startsWith(p),
  );
}

export function buildWhatsAppLink(text: string): string | null {
  if (!OWNER_WHATSAPP) return null;
  return `https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

export function buildMailtoLink(subject: string, body?: string): string {
  const params = new URLSearchParams();
  params.set("subject", subject);
  if (body) params.set("body", body);
  return `mailto:${OWNER_EMAIL}?${params.toString()}`;
}
