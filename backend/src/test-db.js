import supabase from "./config/supabase.js";

const { data, error } = await supabase.from("courses").select("*");

console.log(data);
console.log(error);
