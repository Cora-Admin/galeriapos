# Deployment einrichten – Vercel

Ziel: Push auf `main` → Vercel baut die App und veröffentlicht sie automatisch
unter **galeria.everstore.consulting**.

Vercel übernimmt Build, Hosting, HTTPS-Zertifikat und CDN. Es gibt keinen Server
mehr zu pflegen – kein Nginx, kein certbot, kein SSH-Deploy-Key.

> Vorher lief die App auf der EC2 (52.29.185.200) hinter Nginx.
> Der dazugehörige Workflow `.github/workflows/deploy.yml` ist stillgelegt und
> startet nur noch manuell. Siehe „Rückfallebene EC2" am Ende.

---

## Übersicht der einmaligen Schritte

1. Supabase-Auth scharf schalten + Team-Nutzer anlegen
2. Vercel-Projekt mit dem GitHub-Repo verbinden
3. Environment-Variablen in Vercel hinterlegen
4. Domain in Vercel hinzufügen
5. DNS-Eintrag in Cloudflare setzen
6. Supabase-Redirect-URLs ergänzen
7. Ersten Deploy auslösen

Danach: nur noch `git push` – fertig.

---

## 1. Supabase-Auth (im Dashboard)

Ohne diesen Schritt kann sich niemand einloggen.

- **Authentication → Sign In / Providers → Email** aktivieren.
- Für eine interne App: „Confirm email" deaktivieren ODER Nutzer manuell anlegen,
  damit keine offene Registrierung möglich ist.
- **Authentication → Users → Add user**: für jedes Teammitglied E-Mail + Passwort.

Die Redirect-URLs folgen in Schritt 6.

Für die E-Mail-Benachrichtigung bei Rollout-Problemen zusätzlich unter
**Edge Functions → Secrets** das Secret `RESEND_API_KEY` hinterlegen. Empfänger
und Absender werden nicht hier, sondern in der App unter **Einstellungen**
gepflegt – Details in der README.

## 2. Vercel-Projekt anlegen

1. Auf [vercel.com](https://vercel.com) mit dem GitHub-Account anmelden.
2. **Add New → Project** → Repository `Cora-Admin/galeriapos` importieren.
3. Framework-Preset: **Vite** (wird automatisch erkannt).

Build-Command (`npm run build`), Output-Verzeichnis (`dist`) und das
SPA-Rewriting stehen bereits in der `vercel.json` des Repos – dort muss im
Vercel-UI nichts nachgetragen werden.

## 3. Environment-Variablen in Vercel

**Project → Settings → Environment Variables**. Beide Werte für die Umgebungen
**Production**, **Preview** und **Development** eintragen:

| Name | Wert |
|------|------|
| `VITE_SUPABASE_URL` | `https://vcdxucuwndifgszxbtcl.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_5oHzh_ghI8rJKSYwnB7bHQ_9p5Y1uaP` |

Wichtig: Vite backt diese Werte **zur Build-Zeit** in das Bundle ein. Nach einer
Änderung ist immer ein neuer Deploy nötig – ein Neustart reicht nicht.

Fehlen die Variablen, bricht die App beim Start ab
(`Supabase-Konfiguration fehlt`, siehe `src/lib/supabase.js`) und zeigt eine
weiße Seite.

Der anon/publishable Key ist öffentlich und gehört legitim ins Frontend – RLS
schützt den Datenzugriff serverseitig. Der `service_role`-Key gehört NIEMALS
hierher.

## 4. Domain in Vercel hinzufügen

**Project → Settings → Domains → Add**: `galeria.everstore.consulting`.

Vercel zeigt danach den benötigten DNS-Eintrag an – für eine Subdomain in der
Regel ein CNAME auf `cname.vercel-dns.com`. Den konkret angezeigten Wert
verwenden, nicht den hier dokumentierten raten.

## 5. DNS in Cloudflare

Im Cloudflare-Dashboard der Zone `everstore.consulting`:

- Den **bisherigen A-Record** `galeria` → `52.29.185.200` (EC2) **löschen**.
- **CNAME-Record**: Name `galeria`, Ziel `cname.vercel-dns.com`
  (bzw. der von Vercel angezeigte Wert).
- **Proxy-Status: DNS only (graue Wolke)** – nicht orange.

Der letzte Punkt ist entscheidend: Mit aktivem Cloudflare-Proxy kann Vercel kein
Zertifikat ausstellen, und es kommt zu Zertifikatsfehlern oder Redirect-Loops.
Vercel liefert selbst über ein CDN aus, ein vorgelagerter Proxy bringt hier
keinen Vorteil.

Die Zone bleibt bei Cloudflare – nur dieser eine Record wird umgestellt. Andere
Records (z. B. die Landingpage auf `everstore.consulting`) bleiben unberührt.

Nach ein paar Minuten steht in Vercel unter Domains ein grüner Haken und das
Zertifikat ist ausgestellt.

## 6. Supabase-Redirect-URLs

**Authentication → URL Configuration**:

- **Site URL**: `https://galeria.everstore.consulting`
- **Redirect URLs**: `https://galeria.everstore.consulting/**`

Wer auch Preview-Deployments nutzen will (Vercel baut für jeden Branch eine
eigene URL), trägt zusätzlich `https://*.vercel.app/**` ein – sonst schlagen
Login-Redirects und Passwort-Reset-Links in Previews fehl.

## 7. Erster Deploy

Vercel deployt automatisch bei jedem Push auf `main`. Manuell geht es über
**Deployments → Redeploy**.

Nach ~1 Minute ist die App live unter https://galeria.everstore.consulting

---

## Danach: der Alltag

Jede Änderung am Code:

```bash
git add .
git commit -m "…"
git push
```

Das ist der „Knopfdruck". Vercel baut und veröffentlicht automatisch.
Pull Requests bekommen zusätzlich eine eigene Preview-URL zum Testen, bevor
etwas auf `main` landet.

---

## Rückfallebene EC2

Der alte Weg ist nicht gelöscht, nur abgeschaltet:

- `.github/workflows/deploy.yml` – startet nur noch manuell über
  **Actions → Deploy POS Cockpit (EC2, stillgelegt) → Run workflow**.
  Die dafür nötigen Secrets (`EC2_HOST`, `SSH_PRIVATE_KEY`,
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) bleiben im Repo hinterlegt.
- `deploy/nginx-pos-cockpit.conf` – der zugehörige Nginx-Server-Block.

Zwei Dinge, die man dabei wissen muss:

1. Die Nginx-Config lauscht **nur auf Port 80**. HTTPS kam bisher von außen
   (Cloudflare-Proxy). Wer direkt auf die EC2 zeigt, braucht dort erst einen
   443-Block mit Zertifikat.
2. Der Deploy-Schritt kopiert diese Config über
   `/etc/nginx/sites-enabled/pos-cockpit`. Ein per certbot ergänzter TLS-Block
   auf dem Server würde dabei überschrieben.

Wenn der Vercel-Betrieb stabil läuft, können der Workflow, `deploy/` und der
Nginx-vHost auf der EC2 (`/etc/nginx/sites-enabled/pos-cockpit`) entfernt
werden.
