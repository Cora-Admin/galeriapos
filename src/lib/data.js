import { supabase } from "./supabase";

// ---------- Stores ----------
export async function getStores() {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .order("name");
  if (error) throw error;
  return data;
}

export async function getStore(id) {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function updateStore(id, patch) {
  const { data, error } = await supabase
    .from("stores")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------- Migrationsstatus (View) ----------
export async function getMigrationStatus() {
  const { data, error } = await supabase
    .from("store_migration_status")
    .select("*")
    .order("name");
  if (error) throw error;
  return data;
}

// ---------- Kassen ----------
export async function getKassen(storeId) {
  const { data, error } = await supabase
    .from("kassen")
    .select("*")
    .eq("store_id", storeId)
    .order("kassen_nr");
  if (error) throw error;
  return data;
}

export async function getKasse(id) {
  const { data, error } = await supabase
    .from("kassen")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

// Aktualisiert Kassen-Stammdaten (z. B. Standort, Etage, Bezeichnung, Hardware).
export async function updateKasse(id, patch) {
  const { data, error } = await supabase
    .from("kassen")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------- Checklisten-Vorlage ----------
export async function getTemplate() {
  const { data: groups, error: e1 } = await supabase
    .from("checklist_template_groups")
    .select("*")
    .order("sortierung");
  if (e1) throw e1;
  const { data: items, error: e2 } = await supabase
    .from("checklist_template_items")
    .select("*")
    .order("sortierung");
  if (e2) throw e2;
  return groups.map((g) => ({
    ...g,
    items: items.filter((i) => i.group_id === g.id),
  }));
}

// ---------- Vorlage bearbeiten: Gruppen ----------
export async function addTemplateGroup(titel, sortierung) {
  const { data, error } = await supabase
    .from("checklist_template_groups")
    .insert({ titel, sortierung })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTemplateGroup(id, titel) {
  const { error } = await supabase
    .from("checklist_template_groups")
    .update({ titel })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTemplateGroup(id) {
  const { error } = await supabase
    .from("checklist_template_groups")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ---------- Vorlage bearbeiten: Items ----------
export async function addTemplateItem(groupId, text, sortierung) {
  const { data, error } = await supabase
    .from("checklist_template_items")
    .insert({ group_id: groupId, text, sortierung })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTemplateItem(id, text) {
  const { error } = await supabase
    .from("checklist_template_items")
    .update({ text })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTemplateItem(id) {
  const { error } = await supabase
    .from("checklist_template_items")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ---------- Checklisten-Ergebnisse pro Kasse ----------
export async function getResults(kasseId) {
  const { data, error } = await supabase
    .from("checklist_results")
    .select("*")
    .eq("kasse_id", kasseId);
  if (error) throw error;
  return data;
}

export async function setResult(kasseId, itemId, erledigt, bearbeiter) {
  const { data, error } = await supabase
    .from("checklist_results")
    .update({
      erledigt,
      erledigt_am: erledigt ? new Date().toISOString() : null,
      bearbeiter: erledigt ? bearbeiter : null,
    })
    .eq("kasse_id", kasseId)
    .eq("item_id", itemId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Kommentar/Bemerkung bzw. Problem-/Fehlermeldung zu einem Checklisten-Punkt
// speichern. `patch` enthält die zu aktualisierenden Felder, z. B.
// { kommentar: "…" } oder { problem: "…" }.
export async function setResultText(kasseId, itemId, patch) {
  const { data, error } = await supabase
    .from("checklist_results")
    .update(patch)
    .eq("kasse_id", kasseId)
    .eq("item_id", itemId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------- Userverwaltung ----------
// Einheitliche Userverwaltung über Supabase Auth: `getAuthUsers()` liefert die
// in Supabase Auth hinterlegten User (Quelle der Wahrheit) für die Userübersicht.
// `getUsers()` liest das Verzeichnis `app_users` und dient der ATOS-Ingenieur-
// Zuordnung der Filialen (stabile id je User, inkl. evtl. reiner Verzeichnis-
// einträge ohne Login).
export async function getAuthUsers() {
  const data = await callManageUsers({ action: "list" });
  return data.users;
}

export async function getUsers() {
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .order("name", { nullsFirst: false });
  if (error) throw error;
  return data;
}

// Ruft die Edge Function `manage-users` (Service-Role, serverseitig) auf.
// Neue User werden ausschließlich in Supabase Auth angelegt – nicht aus der App.
async function callManageUsers(payload) {
  const { data, error } = await supabase.functions.invoke("manage-users", { body: payload });
  if (error) {
    // Fehlermeldung aus der Function-Antwort herausziehen, falls vorhanden.
    let msg = error.message;
    try { const body = await error.context?.json(); if (body?.error) msg = body.error; } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function deleteUserAccount(user) {
  await callManageUsers({ action: "delete", id: user.id, auth_user_id: user.auth_user_id });
}

export async function setUserPassword(user, password) {
  await callManageUsers({ action: "set_password", auth_user_id: user.auth_user_id, password });
}

export async function updateUser(id, patch) {
  const { data, error } = await supabase
    .from("app_users")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteUser(id) {
  const { error } = await supabase.from("app_users").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Storeabfrage: Vorlage (Gruppen + Fragen) ----------
export async function getQueryTemplate() {
  const { data: groups, error: e1 } = await supabase
    .from("store_query_groups")
    .select("*")
    .order("sortierung");
  if (e1) throw e1;
  const { data: items, error: e2 } = await supabase
    .from("store_query_items")
    .select("*")
    .order("sortierung");
  if (e2) throw e2;
  return groups.map((g) => ({
    ...g,
    items: items.filter((i) => i.group_id === g.id),
  }));
}

export async function addQueryGroup(titel, sortierung) {
  const { data, error } = await supabase
    .from("store_query_groups")
    .insert({ titel, sortierung })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateQueryGroup(id, titel) {
  const { error } = await supabase
    .from("store_query_groups")
    .update({ titel })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteQueryGroup(id) {
  const { error } = await supabase
    .from("store_query_groups")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function addQueryItem(groupId, frage, sortierung) {
  const { data, error } = await supabase
    .from("store_query_items")
    .insert({ group_id: groupId, frage, sortierung })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateQueryItem(id, frage) {
  const { error } = await supabase
    .from("store_query_items")
    .update({ frage })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteQueryItem(id) {
  const { error } = await supabase
    .from("store_query_items")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ---------- Storeabfrage: Antworten pro Filiale ----------
export async function getQueryAnswers(storeId) {
  const { data, error } = await supabase
    .from("store_query_answers")
    .select("*")
    .eq("store_id", storeId);
  if (error) throw error;
  return data;
}

export async function setQueryAnswer(storeId, itemId, antwort, bearbeiter) {
  const hatText = !!(antwort && antwort.trim());
  const { data, error } = await supabase
    .from("store_query_answers")
    .upsert(
      {
        store_id: storeId,
        item_id: itemId,
        antwort,
        beantwortet_am: hatText ? new Date().toISOString() : null,
        bearbeiter: hatText ? bearbeiter : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "store_id,item_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------- Problem-Cockpit ----------
// Alle gemeldeten Probleme (checklist_results.problem) filialübergreifend, inkl.
// Kasse, Filiale und Checklisten-Punkt. Leere Problemtexte werden entfernt.
export async function getAllProblems() {
  const { data, error } = await supabase
    .from("checklist_results")
    .select(
      "id, problem, problem_erledigt, problem_erledigt_am, problem_erledigt_von, updated_at, bearbeiter, " +
        "kasse:kassen!inner ( id, kassen_nr, standort, etage, " +
        "store:stores!inner ( id, name, filiale, stadt ) ), " +
        "item:checklist_template_items ( text )"
    )
    .not("problem", "is", null)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || [])
    .filter((r) => r.problem && r.problem.trim())
    .map((r) => ({
      id: r.id,
      problem: r.problem,
      erledigt: r.problem_erledigt,
      erledigt_am: r.problem_erledigt_am,
      erledigt_von: r.problem_erledigt_von,
      gemeldet_am: r.updated_at,
      bearbeiter: r.bearbeiter,
      punkt: r.item?.text || "",
      kasse_id: r.kasse?.id,
      kassen_nr: r.kasse?.kassen_nr,
      standort: r.kasse?.standort,
      etage: r.kasse?.etage,
      store_id: r.kasse?.store?.id,
      store_name: r.kasse?.store?.name,
      filiale: r.kasse?.store?.filiale,
      stadt: r.kasse?.store?.stadt,
    }));
}

// Markiert ein gemeldetes Problem als erledigt bzw. wieder offen.
export async function setProblemErledigt(id, erledigt, bearbeiter) {
  const { data, error } = await supabase
    .from("checklist_results")
    .update({
      problem_erledigt: erledigt,
      problem_erledigt_am: erledigt ? new Date().toISOString() : null,
      problem_erledigt_von: erledigt ? bearbeiter || null : null,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------- Kassen-Import (Excel) ----------
// Legt für eine Filiale eine Kasse an (für den Excel-Import verwendet).
export async function addKasse(storeId, kassenNr, bezeichnung) {
  const { data, error } = await supabase
    .from("kassen")
    .insert({ store_id: storeId, kassen_nr: kassenNr, bezeichnung })
    .select()
    .single();
  if (error) throw error;
  return data;
}
