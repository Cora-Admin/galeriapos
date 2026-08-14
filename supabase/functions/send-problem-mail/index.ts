// Edge Function `send-problem-mail`
//
// Verschickt eine E-Mail, sobald in der Kassen-Checkliste ein neues Problem
// gemeldet wurde. Aufgerufen wird sie aus dem Frontend (Checklist.jsx), direkt
// nachdem das Problemfeld von leer auf befüllt gewechselt ist.
//
// Absichtlich lädt die Function den Problemtext selbst aus der Datenbank und
// übernimmt ihn nicht aus dem Request – der Client bestimmt nur, um welchen
// Datensatz es geht, nicht was in der Mail steht.
//
// Konfiguration:
//   - Tabelle `app_settings`: problem_mail_aktiv, problem_mail_empfaenger,
//     problem_mail_absender, problem_mail_app_url (über die Seite Einstellungen)
//   - Secret `RESEND_API_KEY`: im Supabase-Dashboard hinterlegen
//     (Edge Functions → Secrets)
//
// verify_jwt ist deaktiviert, damit der CORS-Preflight durchgeht; die Function
// prüft den Bearer-Token stattdessen selbst – analog zu `manage-users`.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const MAX_TITEL_LAENGE = 60;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// Kurztitel für die Betreffzeile: erste Zeile des Problemtexts, gekürzt.
function kurztitel(problem: string, fallback: string) {
  const ersteZeile = problem.split("\n").map((z) => z.trim()).find(Boolean);
  if (!ersteZeile) return fallback;
  return ersteZeile.length > MAX_TITEL_LAENGE
    ? ersteZeile.slice(0, MAX_TITEL_LAENGE - 1).trimEnd() + "…"
    : ersteZeile;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function datumDe(iso: string | null) {
  if (!iso) return "–";
  return new Date(iso).toLocaleString("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1) Aufrufer muss ein eingeloggter App-Nutzer sein.
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Nicht angemeldet." }, 401);

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Nicht angemeldet." }, 401);

    // 2) Um welchen Problem-Datensatz geht es?
    const { result_id: resultId } = await req.json().catch(() => ({}));
    if (!resultId) return json({ error: "result_id fehlt." }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: row, error: rowErr } = await admin
      .from("checklist_results")
      .select(
        "id, problem, problem_gemeldet_von, problem_gemeldet_am, problem_mail_gesendet_am, " +
          "kasse:kassen!inner ( id, kassen_nr, standort, etage, " +
          "store:stores!inner ( id, name, filiale, stadt ) ), " +
          "item:checklist_template_items ( text )"
      )
      .eq("id", resultId)
      .single();
    if (rowErr) return json({ error: rowErr.message }, 400);

    const problem = (row.problem || "").trim();
    if (!problem) return json({ sent: false, reason: "kein Problemtext" });
    if (row.problem_mail_gesendet_am) {
      return json({ sent: false, reason: "bereits versendet" });
    }

    // 3) Einstellungen laden.
    const { data: settingsRows, error: setErr } = await admin
      .from("app_settings")
      .select("schluessel, wert");
    if (setErr) return json({ error: setErr.message }, 500);

    const settings: Record<string, string> = {};
    (settingsRows || []).forEach((s) => { settings[s.schluessel] = s.wert || ""; });

    if (settings.problem_mail_aktiv !== "true") {
      return json({ sent: false, reason: "Mailversand ist deaktiviert" });
    }

    const empfaenger = (settings.problem_mail_empfaenger || "")
      .split(/[,;]/)
      .map((e) => e.trim())
      .filter(Boolean);
    if (!empfaenger.length) {
      return json({ sent: false, reason: "kein Empfänger konfiguriert" });
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) return json({ error: "RESEND_API_KEY ist nicht hinterlegt." }, 500);

    // 4) Mail zusammenbauen.
    const store = row.kasse?.store;
    const filiale = store?.name || "Unbekannte Filiale";
    const kasse = `Kasse ${row.kasse?.kassen_nr ?? "?"}`;
    const punkt = row.item?.text || "–";
    const ort = [row.kasse?.standort, row.kasse?.etage].filter(Boolean).join(" · ");
    const betreff = `${filiale} · ${kasse} – ${kurztitel(problem, punkt)}`;

    const appUrl = (settings.problem_mail_app_url || "").replace(/\/+$/, "");
    const link = appUrl && store?.id && row.kasse?.id
      ? `${appUrl}/stores/${store.id}/kasse/${row.kasse.id}`
      : "";

    const zeilen: [string, string][] = [
      ["Filiale", `${filiale}${store?.filiale ? ` (${store.filiale})` : ""}`],
      ["Kasse", ort ? `${kasse} · ${ort}` : kasse],
      ["Checklistenpunkt", punkt],
      ["Gemeldet von", row.problem_gemeldet_von || "–"],
      ["Gemeldet am", datumDe(row.problem_gemeldet_am)],
    ];

    const text = [
      ...zeilen.map(([k, v]) => `${k}: ${v}`),
      "",
      "Problem:",
      problem,
      ...(link ? ["", `Im Cockpit öffnen: ${link}`] : []),
    ].join("\n");

    const html = `
      <div style="font-family:Inter,Helvetica,Arial,sans-serif;color:#1c2733;line-height:1.5">
        <h2 style="margin:0 0 4px;font-size:18px">${escapeHtml(filiale)}</h2>
        <div style="color:#6b7a8d;font-size:13px;margin-bottom:16px">
          ${escapeHtml(ort ? `${kasse} · ${ort}` : kasse)}
        </div>
        <table style="border-collapse:collapse;font-size:14px;margin-bottom:16px">
          ${zeilen.map(([k, v]) => `
            <tr>
              <td style="padding:3px 14px 3px 0;color:#6b7a8d;vertical-align:top;white-space:nowrap">
                ${escapeHtml(k)}
              </td>
              <td style="padding:3px 0">${escapeHtml(v)}</td>
            </tr>`).join("")}
        </table>
        <div style="font-weight:600;font-size:13px;color:#6b7a8d;margin-bottom:6px">PROBLEM</div>
        <div style="background:#f5f7fa;border-left:3px solid #e2574c;padding:12px 14px;
                    border-radius:6px;white-space:pre-wrap">${escapeHtml(problem)}</div>
        ${link ? `<p style="margin-top:20px">
          <a href="${escapeHtml(link)}" style="background:#1f3a5e;color:#fff;text-decoration:none;
             padding:10px 18px;border-radius:8px;display:inline-block;font-size:14px">
            Im Cockpit öffnen</a></p>` : ""}
      </div>`;

    // 5) Versand über Resend.
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: settings.problem_mail_absender || "POS Migration Cockpit <onboarding@resend.dev>",
        to: empfaenger,
        subject: betreff,
        text,
        html,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return json({ error: `Resend: ${res.status} ${detail}` }, 502);
    }

    // 6) Versand vermerken, damit dieselbe Meldung keine zweite Mail auslöst.
    await admin
      .from("checklist_results")
      .update({ problem_mail_gesendet_am: new Date().toISOString() })
      .eq("id", resultId);

    return json({ sent: true, to: empfaenger, subject: betreff });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
