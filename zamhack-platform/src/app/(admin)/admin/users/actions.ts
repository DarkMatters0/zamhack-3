"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function toggleUserStatus(userId: string, currentStatus: string | null) {
  const supabase = await createClient()

  // 1. Fetch User
  const { data: { user } } = await supabase.auth.getUser()
  
  // FIX: Explicitly handle the 'null' user case so TypeScript knows 'user' exists below
  if (!user) {
    return { error: "Not authenticated" }
  }

  // 2. Verify Admin
  const { data: currentUserProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id) // FIX: Removed '?' because we checked (!user) above
    .single()

  if (currentUserProfile?.role !== "admin") {
    return { error: "Unauthorized" }
  }

  const newStatus = currentStatus === "active" ? "disabled" : "active"

  // 3. Update Status
  const { error } = await supabase
    .from("profiles")
    // FIX: Cast as any because 'status' column is not in your types/supabase.ts file yet
    .update({ status: newStatus } as any)
    .eq("id", userId)

  if (error) return { error: error.message }

  revalidatePath("/admin/users")
  return { success: `User ${newStatus === "active" ? "enabled" : "disabled"} successfully` }
}

export async function deleteUser(userId: string) {
  const supabase = await createClient()

  // 1. Fetch User
  const { data: { user } } = await supabase.auth.getUser()

  // FIX: Explicitly handle the 'null' user case
  if (!user) {
    return { error: "Not authenticated" }
  }

  // 2. Verify Admin
  const { data: currentUserProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id) // FIX: Removed '?'
    .single()

  if (currentUserProfile?.role !== "admin") {
    return { error: "Unauthorized" }
  }

  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", userId)

  if (error) return { error: error.message }

  revalidatePath("/admin/users")
  return { success: "User profile deleted" }
}