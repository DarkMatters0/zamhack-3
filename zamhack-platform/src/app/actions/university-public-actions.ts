"use server"

import { createClient } from "@/utils/supabase/server"

export async function getActiveUniversities(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("universities")
    .select("name")
    .eq("is_active", true)
    .eq("is_suggested", false)
    .order("name", { ascending: true })

  if (error || !data || data.length === 0) return []
  return [...data.map((u) => u.name), "Other"]
}

export async function suggestUniversity(
  name: string,
  suggestedBy: string | null
): Promise<{ error?: string }> {
  const trimmed = name.trim()
  if (!trimmed) return {}

  const supabase = await createClient()
  const { error } = await supabase
    .from("universities")
    .insert({
      name: trimmed,
      is_active: true,
      is_suggested: true,
      suggested_by: suggestedBy,
    })

  if (error) {
    if (error.code === "23505") return {}
    return { error: error.message }
  }

  return {}
}
