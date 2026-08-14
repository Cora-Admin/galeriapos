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

## 2a. E-Mail bei Rollout-Problemen (einmalig)

Wird in einer Kassen-Checkliste ein Problem gemeldet, verschickt die App eine
E-Mail. Betreff: Filiale, Kasse und ein Kurztitel; im Text die vollständige
Problembeschreibung samt Checklistenpunkt, Melder und Link ins Cockpit.

Verschickt wird **nur beim erstmaligen Melden** – wer den Text nachträglich
ändert, löst keine weitere Mail aus. Der Versand wird auf dem Datensatz
vermerkt (`checklist_results.problem_mail_gesendet_am`); wird das Problem
gelöscht, ist der Weg für eine spätere Neumeldung wieder frei.

Einrichtung:

1. **Resend-Account** anlegen, API-Key erzeugen und die Absenderdomain
   verifizieren (ohne eigene Domain funktioniert `onboarding@resend.dev`).
2. Im **Supabase-Dashboard → Edge Functions → Secrets** das Secret
   `RESEND_API_KEY` hinterlegen. Der Key gehört nicht ins Repo und nicht
   in die `.env` des Frontends.
3. In der App unter **Einstellungen** Empfänger, Absender und die Adresse des
   Cockpits eintragen und den Versand aktivieren.

Der Versand läuft über die Edge Function `send-problem-mail`
(`supabase/functions/send-problem-mail/`). Sie lädt den Problemtext selbst aus
der Datenbank – der Client übergibt nur, um welchen Datensatz es geht.

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
    Settings.jsx       Einstellungen (Empfänger der Problem-Mails)
    Import.jsx         Excel-/CSV-Import Kassenliste (SheetJS, lazy)
supabase/
  functions/
    send-problem-mail/ Edge Function: Mail bei neu gemeldetem Problem (Resend)
```

## Datenbank (Supabase Projekt "Galeria Rollout")

- `stores` – 83 echte GALERIA-Filialen; zusätzlich `ansprechpartner(_email/_telefon)`
  und `atos_ingenieure uuid[]` (zugeordnete ATOS-Rollout-Ingenieure)
- `kassen` – Kassen pro Store (neue Kassen erhalten per Trigger automatisch
  Checklisten-Ergebniszeilen)
- `checklist_template_groups` / `checklist_template_items` – Checklisten-Vorlage
- `checklist_results` – abgehakte Punkte pro Kasse (mit Zeitstempel + Bearbeiter,
  je Punkt zusätzlich Freitextfelder `kommentar` und `problem`;
  `problem_mail_gesendet_am` hält fest, ob die Benachrichtigung raus ist)
- `app_settings` – Key/Value-Einstellungen der App (Empfänger, Absender und
  Aktiv-Schalter der Problem-Mails, Basis-URL für den Link in der Mail).
  Gepflegt über die Seite **Einstellungen**
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
