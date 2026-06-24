# GALERIA POS Migration Cockpit

Web-App zur Steuerung der POS-Migration über alle GALERIA-Filialen.
React (Vite) + Supabase (PostgreSQL, Auth). Datenhaltung zentral in Supabase,
Authentifizierung per E-Mail + Passwort.

## 1. Lokal starten

```bash
cp .env.example .env      # Werte sind bereits eingetragen
npm install
npm run dev               # http://localhost:5173
```

Die `.env` enthält die Supabase Project-URL und den öffentlichen anon/publishable Key.
Der Key ist bewusst öffentlich – der Datenzugriff wird serverseitig durch
Row-Level-Security (RLS) geschützt. Der `service_role`-Key gehört NIEMALS ins Frontend.

## 2. Authentifizierung vorbereiten (einmalig im Supabase-Dashboard)

1. **Authentication → Providers → Email** aktivieren.
2. Für den internen Rollout empfiehlt sich **"Confirm email" deaktivieren** oder
   Nutzer manuell anlegen, damit keine offene Registrierung möglich ist.
3. Nutzer anlegen unter **Authentication → Users → Add user**
   (E-Mail + Passwort vergeben). Diese Konten können sich dann anmelden.
4. **URL Configuration**: unter "Redirect URLs" die produktive Domain eintragen
   (z. B. `https://pos.everstore.consulting`), damit Passwort-Reset-Links funktionieren.

> Hinweis: Aktuell darf jeder eingeloggte Nutzer alle Stores lesen und schreiben.
> Rollenrechte (z. B. Steering-Board nur lesen) lassen sich später über
> verfeinerte RLS-Policies ergänzen.

## 3. Produktions-Build

```bash
npm run build             # erzeugt dist/
npm run preview           # optional lokal testen
```

## 4. Deployment auf EC2 (Nginx)

Das Vorgehen entspricht deinem bestehenden everstore-Setup.

```bash
# auf der EC2, im Projektverzeichnis nach git pull:
npm ci
npm run build
# dist/ in das von Nginx ausgelieferte Verzeichnis kopieren, z. B.:
sudo rsync -a --delete dist/ /var/www/pos-cockpit/
```

**Nginx-Server-Block** (SPA-Routing: alle Pfade auf index.html, sonst 404 bei Reload):

```nginx
server {
    listen 80;
    server_name pos.everstore.consulting;

    root /var/www/pos-cockpit;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Danach `sudo nginx -t && sudo systemctl reload nginx`.
TLS wie gewohnt über Cloudflare bzw. certbot.

### GitHub Actions (optional, analog zur landingpage-Pipeline)

Build-Step `npm ci && npm run build`, anschließend `dist/` per rsync/scp auf die EC2
in `/var/www/pos-cockpit/` übertragen. Die `.env`-Werte als Repository-Secrets
hinterlegen und im Build-Step als `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
bereitstellen.

## Projektstruktur

```
src/
  lib/
    supabase.js        Supabase-Client
    AuthContext.jsx    Session/Login/Logout
    data.js            Alle DB-Queries (stores, kassen, vorlage, ergebnisse)
  components/
    Layout.jsx         Header-Navigation + Logout
    StatusBadge.jsx    Statusanzeige
  pages/
    Login.jsx          E-Mail/Passwort-Login
    Dashboard.jsx      KPIs + Migrationsstatus (aus View store_migration_status)
    Stores.jsx         Filialliste mit Suche
    StoreDetail.jsx    Stammdaten + Kassen + Checklisten-Einstieg
    Checklist.jsx      Checkliste pro Kasse durchführen
    Template.jsx       Vorlagen-Übersicht
```

## Datenbank (Supabase Projekt "Galeria Rollout")

- `stores` – 83 echte GALERIA-Filialen
- `kassen` – Kassen pro Store
- `checklist_template_groups` / `checklist_template_items` – Checklisten-Vorlage
- `checklist_results` – abgehakte Punkte pro Kasse (mit Zeitstempel + Bearbeiter,
  je Punkt zusätzlich Freitextfeld `problem` zum Melden eines Problems)
- View `store_migration_status` – berechnet Fortschritt/Status pro Store
