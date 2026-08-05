import supabase from "../config/supabase.js";

export async function findAll() {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .order("id");

  if (error) throw error;

  return data;
}

export async function findById(id) {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  return data;
}

export async function create(course) {
  const { data, error } = await supabase
    .from("courses")
    .insert(course)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function update(id, course) {
  const { data, error } = await supabase
    .from("courses")
    .update(course)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function remove(id) {
  const { error } = await supabase.from("courses").delete().eq("id", id);

  if (error) throw error;
}
