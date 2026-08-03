# Deployment einrichten – „auf Knopfdruck"

Ziel: Push auf `main` → GitHub Actions baut die App und veröffentlicht sie
automatisch unter **galeria.everstore.consulting** auf deiner EC2 (52.29.185.200).

Die Pipeline nutzt dieselbe Methode wie deine landingpage (appleboy scp/ssh +
Deploy-Key). Vieles davon hast du also schon einmal gemacht.

---

## Übersicht der einmaligen Schritte

1. Supabase-Auth scharf schalten + Team-Nutzer anlegen
2. GitHub-Repo anlegen und Code pushen
3. Deploy-Key auf der EC2 hinterlegen (oder bestehenden wiederverwenden)
4. GitHub-Secrets eintragen
5. DNS-Eintrag für die Subdomain in Cloudflare
6. Nginx-Block auf der EC2 aktivieren
7. Ersten Deploy auslösen

Danach: nur noch `git push` – fertig.

---

## 1. Supabase-Auth (im Dashboard)

Ohne diesen Schritt kann sich niemand einloggen.

- **Authentication → Sign In / Providers → Email** aktivieren.
- Für eine interne App: „Confirm email" deaktivieren ODER Nutzer manuell anlegen,
  damit keine offene Registrierung möglich ist.
- **Authentication → Users → Add user**: für jedes Teammitglied E-Mail + Passwort.
- **Authentication → URL Configuration → Redirect URLs**:
  `https://galeria.everstore.consulting/**` eintragen (für Passwort-Reset-Links).

## 2. GitHub-Repo

```bash
cd galeria-pos
git init
git add .
git commit -m "Initial commit: POS Migration Cockpit"
git branch -M main
git remote add origin git@github.com:Cora-Admin/galeria-pos.git   # Repo vorher auf GitHub anlegen
git push -u origin main
```

Die `.env` wird durch `.gitignore` NICHT mitgepusht – korrekt so.

## 3. Deploy-Key auf der EC2

Wenn du den landingpage-Deploy-Key wiederverwenden willst, kannst du diesen Schritt
überspringen und in Schritt 4 denselben `SSH_PRIVATE_KEY` verwenden.

Andernfalls neuen Key erzeugen (auf deinem Mac):

```bash
ssh-keygen -t ed25519 -f ~/Desktop/pos-deploy-key -N "" -C "github-actions-pos"
cat ~/Desktop/pos-deploy-key.pub        # Public Key kopieren
```

Auf der EC2 hinterlegen:

```bash
ssh -i ~/Desktop/Website.pem ubuntu@52.29.185.200
echo "DEIN-PUBLIC-KEY" >> ~/.ssh/authorized_keys
```

Passwortloses sudo für die Deploy-Befehle (falls noch nicht von landingpage vorhanden):

```bash
sudo visudo -f /etc/sudoers.d/deploy
```
Inhalt:
```
ubuntu ALL=(ALL) NOPASSWD: /bin/mkdir, /bin/rm, /bin/cp, /bin/chown, /usr/bin/mkdir, /usr/bin/rm, /usr/bin/cp, /usr/bin/chown, /bin/systemctl, /usr/bin/systemctl
```

## 4. GitHub-Secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Name | Wert |
|------|------|
| `EC2_HOST` | `52.29.185.200` |
| `SSH_PRIVATE_KEY` | Inhalt von `cat ~/Desktop/pos-deploy-key` (komplett, inkl. BEGIN/END) |
| `VITE_SUPABASE_URL` | `https://vcdxucuwndifgszxbtcl.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_5oHzh_ghI8rJKSYwnB7bHQ_9p5Y1uaP` |

## 5. DNS in Cloudflare

Im Cloudflare-Dashboard der Zone `everstore.consulting`:

- **A-Record**: Name `galeria`, IPv4 `52.29.185.200`, Proxy aktiv (orange Wolke).

## 6. Nginx auf der EC2 aktivieren

Die Datei `deploy/nginx-pos-cockpit.conf` aus diesem Projekt auf den Server bringen:

```bash
scp -i ~/Desktop/Website.pem deploy/nginx-pos-cockpit.conf ubuntu@52.29.185.200:/tmp/
ssh -i ~/Desktop/Website.pem ubuntu@52.29.185.200
sudo mv /tmp/nginx-pos-cockpit.conf /etc/nginx/sites-available/pos-cockpit
sudo ln -s /etc/nginx/sites-available/pos-cockpit /etc/nginx/sites-enabled/
sudo mkdir -p /var/www/pos-cockpit
sudo nginx -t && sudo systemctl reload nginx
```

Für End-to-End-TLS (empfohlen): Cloudflare-SSL-Modus auf „Full (strict)" und ein
Origin-Zertifikat oder certbot einrichten.

## 7. Erster Deploy

Entweder einfach pushen:

```bash
git commit --allow-empty -m "Trigger deploy"
git push
```

…oder in GitHub unter **Actions → Deploy POS Cockpit → Run workflow** den Button drücken.

Nach ~1–2 Minuten ist die App live unter https://galeria.everstore.consulting

---

## Danach: der Alltag

Jede Änderung am Code:

```bash
git add .
git commit -m "…"
git push
```

Das ist der „Knopfdruck". Die Pipeline baut und veröffentlicht automatisch.
Über **Actions → Run workflow** kannst du zusätzlich jederzeit manuell deployen,
ohne etwas zu ändern.

---

# Alternative: Deployment auf Vercel

Statt EC2/Nginx kann die App auch auf **Vercel** laufen. Vercel erkennt Vite
automatisch, baut mit `npm run build` und liefert `dist/` aus. SPA-Routing
(Reload auf `/stores/:id` etc.) wird über die mitgelieferte `vercel.json`
(Rewrite aller Pfade auf `/index.html`) sichergestellt.

## Einmalige Schritte

1. **Projekt importieren**: auf [vercel.com](https://vercel.com) einloggen →
   **Add New… → Project** → das GitHub-Repo `Cora-Admin/galeriapos` auswählen.
   Framework „Vite", Build Command `npm run build`, Output `dist` werden
   automatisch erkannt (durch `vercel.json` bereits gesetzt).

2. **Environment Variables** (Project → Settings → Environment Variables) für
   **Production** (und Preview) hinterlegen – dieselben Werte wie bisher:

   | Name | Wert |
   |------|------|
   | `VITE_SUPABASE_URL` | `https://vcdxucuwndifgszxbtcl.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | `sb_publishable_5oHzh_ghI8rJKSYwnB7bHQ_9p5Y1uaP` |

   > Wichtig: Vite-Variablen werden zur **Build-Zeit** eingebacken. Nach dem
   > Setzen/Ändern der Variablen einmal neu deployen (Redeploy).

3. **Supabase-Redirect-URLs anpassen** (Supabase → Authentication →
   URL Configuration), damit Microsoft-Login und Passwort-Reset auf der neuen
   Domain funktionieren (die App nutzt `window.location.origin` als `redirectTo`):
   - **Site URL**: die Vercel-Produktions-Domain, z. B.
     `https://galeriapos.vercel.app` (oder die eigene Domain).
   - **Redirect URLs**: zusätzlich `https://<projekt>.vercel.app/**` und – falls
     Preview-Deployments genutzt werden – `https://*.vercel.app/**`.

   Die Azure-/Microsoft-App-Registrierung muss **nicht** geändert werden: deren
   Callback zeigt auf `https://vcdxucuwndifgszxbtcl.supabase.co/auth/v1/callback`
   (Supabase), das bleibt gleich.

4. **Eigene Domain** (optional): Project → Settings → Domains → Domain hinzufügen
   und den bei Vercel angezeigten DNS-Eintrag (CNAME bzw. A) in Cloudflare setzen.
   Danach diese Domain auch als Site-/Redirect-URL in Supabase eintragen.

## Alltag

Jeder Push auf `main` löst automatisch ein Vercel-Production-Deployment aus;
Pull Requests/Branches erhalten automatisch Preview-Deployments.

## Altes EC2-Deployment abschalten (empfohlen)

Damit nicht beide Pipelines gleichzeitig laufen, den GitHub-Actions-Workflow
`.github/workflows/deploy.yml` deaktivieren – entweder die Datei löschen oder den
Trigger `on: push: branches: [main]` entfernen (nur noch `workflow_dispatch`),
sodass EC2 nur manuell deployt wird.
