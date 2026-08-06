import supabase from "../config/supabase.js";

const TABLE = "lessons";

export async function findByCourseId(courseId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("course_id", courseId)
    .order("order_number");

  if (error) throw error;

  return data;
}

export async function findById(id) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  return data;
}

export async function create(lesson) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert([lesson])
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function update(id, lesson) {
  const { data, error } = await supabase
    .from(TABLE)
    .update(lesson)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function remove(id) {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);

  if (error) throw error;
}
