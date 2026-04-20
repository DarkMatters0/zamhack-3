"use server"

import { createClient } from "@/utils/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

export async function toggleUserStatus(userId: string, currentStatus: string | null) {
  const supabase = await createClient()

  // 1. Fetch User
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // 2. Verify Admin
  const { data: currentUserProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (currentUserProfile?.role !== "admin") {
    return { error: "Unauthorized" }
  }

  const newStatus = currentStatus === "active" ? "disabled" : "active"

  // 3. Update profile status
  const { error } = await supabase
    .from("profiles")
    .update({ status: newStatus } as any)
    .eq("id", userId)

  if (error) return { error: error.message }

  // 4. Sync with Supabase Auth so the ban actually blocks login
  const serviceClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const banDuration = newStatus === "disabled" ? "87600h" : "none"
  const { error: authError } = await serviceClient.auth.admin.updateUserById(userId, {
    ban_duration: banDuration,
  })

  if (authError) return { error: `Profile updated but auth ban failed: ${authError.message}` }

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