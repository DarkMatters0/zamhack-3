"use server"

import { revalidatePath } from "next/cache"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

export type University = Database["public"]["Tables"]["universities"]["Row"]

function createServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function getUniversities(): Promise<University[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("universities")
    .select("*")
    .order("is_suggested", { ascending: false })
    .order("name", { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function addUniversity(name: string): Promise<{ error?: string }> {
  const trimmed = name.trim()
  if (!trimmed) return { error: "University name cannot be empty." }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from("universities")
    .insert({ name: trimmed, is_active: true, is_suggested: false })

  if (error) {
    if (error.code === "23505") return { error: "A university with that name already exists." }
    return { error: error.message }
  }

  revalidatePath("/admin/universities")
  return {}
}

export async function updateUniversityName(id: string, name: string): Promise<{ error?: string }> {
  const trimmed = name.trim()
  if (!trimmed) return { error: "Name cannot be empty." }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from("universities")
    .update({ name: trimmed })
    .eq("id", id)

  if (error) {
    if (error.code === "23505") return { error: "A university with that name already exists." }
    return { error: error.message }
  }

  revalidatePath("/admin/universities")
  return {}
}

export async function toggleUniversityActive(id: string, isActive: boolean): Promise<{ error?: string }> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from("universities")
    .update({ is_active: isActive })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/admin/universities")
  return {}
}

export async function approveUniversitySuggestion(id: string): Promise<{ error?: string }> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from("universities")
    .update({ is_suggested: false, is_active: true })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/admin/universities")
  return {}
}

export async function updateUniversityRegion(id: string, region: string | null): Promise<{ error?: string }> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from("universities")
    .update({ region })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/admin/universities")
  return {}
}

export async function deleteUniversity(id: string): Promise<{ error?: string }> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from("universities")
    .delete()
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/admin/universities")
  return {}
}
