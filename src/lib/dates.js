// Datums-Helfer: DB speichert ISO (yyyy-mm-dd), Anzeige/Eingabe in DE (TT.MM.JJJJ).

export function isoToDE(iso) {
  if (!iso) return "";
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "";
  return `${m[3]}.${m[2]}.${m[1]}`;
}

// Gibt zurück: null = leer (gültig), undefined = ungültig, "yyyy-mm-dd" = gültig.
export function deToISO(text) {
  const t = (text || "").trim();
  if (!t) return null;
  const m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return undefined;
  const d = +m[1], mo = +m[2], y = +m[3];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return undefined;
  const pad = (n) => String(n).padStart(2, "0");
  return `${y}-${pad(mo)}-${pad(d)}`;
}

export function formatDateDE(iso, fallback = "—") {
  return isoToDE(iso) || fallback;
}
