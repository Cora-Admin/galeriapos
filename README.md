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
   (z. B. `https://galeria.everstore.consulting`), damit Passwort-Reset-Links funktionieren.

> Hinweis: Aktuell darf jeder eingeloggte Nutzer alle Stores lesen und schreiben.
> Rollenrechte (z. B. Steering-Board nur lesen) lassen sich später über
> verfeinerte RLS-Policies ergänzen.

## 3. Produktions-Build

```bash
npm run build             # erzeugt dist/
npm run preview           # optional lokal testen
```

## 4. Deployment (Vercel)

Das Hosting läuft auf **Vercel** unter https://galeria.everstore.consulting.
Jeder Push auf `main` wird automatisch gebaut und veröffentlicht, jeder Pull
Request bekommt eine eigene Preview-URL.

Die Konfiguration steht in `vercel.json`:

- **SPA-Routing** – alle Pfade werden auf `/index.html` umgeschrieben, damit
  Deep-Links wie `/stores/:id` auch bei hartem Reload funktionieren. Statische
  Dateien liefert Vercel vor dem Rewrite direkt aus.
- **Caching** – die gehashten Dateien unter `/assets/` werden ein Jahr lang
  `immutable` gecacht, `index.html` bewusst nicht.

Die beiden Supabase-Werte müssen in Vercel als Environment-Variablen
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) hinterlegt sein – Vite backt sie
zur **Build-Zeit** ein, nach einer Änderung ist also ein neuer Deploy nötig.

Die vollständige Einrichtung (Vercel-Projekt, DNS in Cloudflare,
Supabase-Redirect-URLs) steht in **[DEPLOYMENT.md](DEPLOYMENT.md)**.

> Der frühere EC2-/Nginx-Deploy (`.github/workflows/deploy.yml`,
> `deploy/nginx-pos-cockpit.conf`) ist stillgelegt und läuft nur noch auf
> manuellen Start – Details am Ende von DEPLOYMENT.md.

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
    Badges.jsx         Store-Typ-Farbbadge + Probleme-Zähler
  pages/
    Login.jsx          E-Mail/Passwort-Login
    Dashboard.jsx      KPIs + Migrationsstatus (aus View store_migration_status)
    Stores.jsx         Filialliste mit Suche (inkl. Probleme-Spalte)
    StoreDetail.jsx    Stammdaten + Ansprechpartner + ATOS-Ingenieure + Kassen
    Checklist.jsx      Checkliste pro Kasse durchführen (Kommentar/Problem je Punkt)
    StoreQuery.jsx     Storeabfrage je Filiale beantworten
    Template.jsx       Vorlage Checkliste
    QueryTemplate.jsx  Vorlage Storeabfrage
    Users.jsx          Userverwaltung (zeigt die Supabase-Auth-User)
    Import.jsx         Excel-/CSV-Import Kassenliste (SheetJS, lazy)
```

## Datenbank (Supabase Projekt "Galeria Rollout")

- `stores` – 83 echte GALERIA-Filialen; zusätzlich `ansprechpartner(_email/_telefon)`
  und `atos_ingenieure uuid[]` (zugeordnete ATOS-Rollout-Ingenieure)
- `kassen` – Kassen pro Store (neue Kassen erhalten per Trigger automatisch
  Checklisten-Ergebniszeilen)
- `checklist_template_groups` / `checklist_template_items` – Checklisten-Vorlage
- `checklist_results` – abgehakte Punkte pro Kasse (mit Zeitstempel + Bearbeiter,
  je Punkt zusätzlich Freitextfelder `kommentar` und `problem`)
- `app_users` – Verzeichnis mit Metadaten je User (Name, E-Mail, Rolle, aktiv,
  `auth_user_id`). Dient als stabile Referenz für die ATOS-Ingenieur-Zuordnung der
  Filialen. **Quelle der Wahrheit für die Userübersicht ist Supabase Auth** – die
  Edge Function pflegt für jeden Auth-User automatisch eine Verzeichniszeile.
- Edge Function `manage-users` – einheitliche Userverwaltung über Supabase Auth
  (Service-Role serverseitig, eigene Auth-Prüfung): `list` liefert die in Supabase
  Auth hinterlegten User (inkl. Metadaten), ändert Passwörter (`set_password`) und
  löscht Login + Verzeichniszeile (`delete`). **Neue User werden ausschließlich in
  Supabase Auth angelegt (Authentication → Users), nicht aus der App.**
- `store_query_groups` / `store_query_items` / `store_query_answers` – Storeabfrage
  (Vorlage + Antworten je Filiale, analog zur Checkliste)
- View `store_migration_status` – Fortschritt/Status **und Anzahl Probleme** pro Store
