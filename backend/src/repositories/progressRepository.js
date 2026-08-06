import supabase from "../config/supabase.js";

const TABLE = "lesson_progress";

export async function saveProgress(progress) {
  const { data, error } = await supabase
    .from(TABLE)
    .upsert([progress], {
      onConflict: "user_id,lesson_id",
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function findByUser(userId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("user_id", userId);

  if (error) throw error;

  return data;
}
