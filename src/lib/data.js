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
