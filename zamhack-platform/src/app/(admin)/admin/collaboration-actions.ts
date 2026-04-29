"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { logActivity, ActivityAction, EntityType } from "@/lib/activity-log"

// ==========================================
// AUTH GUARD
// ==========================================

async function getAdminUser() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") throw new Error("Unauthorized")

  return { user, supabase }
}

// ==========================================
// ADMIN COLLABORATION ACTIONS
// ==========================================

export async function adminApproveCollaboration(
  collaboratorId: string
): Promise<{ success: true }> {
  const { user, supabase } = await getAdminUser()

  const { data: collaboration, error: fetchError } = await supabase
    .from("challenge_collaborators")
    .select("id, status, organization_id, challenge_id")
    .eq("id", collaboratorId)
    .single()

  if (fetchError || !collaboration) throw new Error("Collaboration invite not found")
  if (collaboration.status !== "pending_admin_review") throw new Error("Already reviewed")

  const { data: challenge, error: challengeError } = await supabase
    .from("challenges")
    .select("id, title, organization_id")
    .eq("id", collaboration.challenge_id)
    .single()

  if (challengeError || !challenge) throw new Error("Challenge not found")

  // Transition: pending_admin_review → pending_acceptance
  // The invite_token was set when the invite was created — do NOT regenerate it here.
  const { error: updateError } = await supabase
    .from("challenge_collaborators")
    .update({
      status: "pending_acceptance",
      admin_approved_by: user.id,
      admin_approved_at: new Date().toISOString(),
    })
    .eq("id", collaboratorId)

  if (updateError) throw new Error("Failed to approve collaboration invite")

  const sharedLog = {
    action: ActivityAction.COLLAB_INVITE_ADMIN_APPROVED,
    entity_type: EntityType.COLLABORATION,
    entity_id: collaboratorId,
    entity_label: challenge.title,
  }

  await Promise.all([
    logActivity({ log_type: "admin", actor_id: user.id, ...sharedLog }),
    logActivity({ log_type: "company", actor_id: user.id, organization_id: challenge.organization_id ?? undefined, ...sharedLog }),
    logActivity({ log_type: "company", actor_id: user.id, organization_id: collaboration.organization_id, ...sharedLog }),
  ])

  revalidatePath("/admin/dashboard")
  revalidatePath(`/admin/challenges/${challenge.id}`)
  return { success: true }
}

export async function adminRejectCollaboration(
  collaboratorId: string,
  adminNote?: string
): Promise<{ success: true }> {
  const { user, supabase } = await getAdminUser()

  const { data: collaboration, error: fetchError } = await supabase
    .from("challenge_collaborators")
    .select("id, status, organization_id, challenge_id")
    .eq("id", collaboratorId)
    .single()

  if (fetchError || !collaboration) throw new Error("Collaboration invite not found")
  if (collaboration.status !== "pending_admin_review") throw new Error("Already reviewed")

  const { data: challenge, error: challengeError } = await supabase
    .from("challenges")
    .select("id, title, organization_id")
    .eq("id", collaboration.challenge_id)
    .single()

  if (challengeError || !challenge) throw new Error("Challenge not found")

  // Admin rejection hard-terminates the invite — status goes to 'revoked', token is cleared
  const { error: updateError } = await supabase
    .from("challenge_collaborators")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revoked_by: user.id,
      admin_note: adminNote ?? null,
      invite_token: null,
    })
    .eq("id", collaboratorId)

  if (updateError) throw new Error("Failed to reject collaboration invite")

  const sharedLog = {
    action: ActivityAction.COLLAB_INVITE_ADMIN_REJECTED,
    entity_type: EntityType.COLLABORATION,
    entity_id: collaboratorId,
    entity_label: challenge.title,
    metadata: { admin_note: adminNote },
  }

  await Promise.all([
    logActivity({ log_type: "admin", actor_id: user.id, ...sharedLog }),
    logActivity({ log_type: "company", actor_id: user.id, organization_id: challenge.organization_id ?? undefined, ...sharedLog }),
    logActivity({ log_type: "company", actor_id: user.id, organization_id: collaboration.organization_id, ...sharedLog }),
  ])

  revalidatePath("/admin/dashboard")
  revalidatePath(`/admin/challenges/${challenge.id}`)
  return { success: true }
}

export async function adminRevokeCollaboration(
  collaboratorId: string,
  adminNote?: string
): Promise<{ success: true }> {
  const { user, supabase } = await getAdminUser()

  const { data: collaboration, error: fetchError } = await supabase
    .from("challenge_collaborators")
    .select("id, status, organization_id, challenge_id")
    .eq("id", collaboratorId)
    .single()

  if (fetchError || !collaboration) throw new Error("Collaboration not found")
  if (collaboration.status === "revoked") throw new Error("Collaboration is already revoked")

  const { data: challenge, error: challengeError } = await supabase
    .from("challenges")
    .select("id, title, organization_id")
    .eq("id", collaboration.challenge_id)
    .single()

  if (challengeError || !challenge) throw new Error("Challenge not found")

  const { error: updateError } = await supabase
    .from("challenge_collaborators")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revoked_by: user.id,
      admin_note: adminNote ?? null,
      invite_token: null,
    })
    .eq("id", collaboratorId)

  if (updateError) throw new Error("Failed to revoke collaboration")

  const sharedLog = {
    action: ActivityAction.COLLAB_REVOKED_BY_ADMIN,
    entity_type: EntityType.COLLABORATION,
    entity_id: collaboratorId,
    entity_label: challenge.title,
    metadata: { admin_note: adminNote },
  }

  await Promise.all([
    logActivity({ log_type: "admin", actor_id: user.id, ...sharedLog }),
    logActivity({ log_type: "company", actor_id: user.id, organization_id: challenge.organization_id ?? undefined, ...sharedLog }),
    logActivity({ log_type: "company", actor_id: user.id, organization_id: collaboration.organization_id, ...sharedLog }),
  ])

  revalidatePath("/admin/dashboard")
  revalidatePath(`/admin/challenges/${challenge.id}`)
  return { success: true }
}

export async function getPendingCollaborationInvites() {
  const { supabase } = await getAdminUser()

  const { data, error } = await supabase
    .from("challenge_collaborators")
    .select(`
      *,
      challenge:challenges!challenge_collaborators_challenge_id_fkey(
        id, title, status, organization_id,
        owner_org:organizations!challenges_organization_id_fkey(id, name, industry)
      ),
      collaborator_org:organizations!challenge_collaborators_organization_id_fkey(id, name, industry),
      invited_by_profile:profiles!challenge_collaborators_invited_by_fkey(first_name, last_name)
    `)
    .eq("status", "pending_admin_review")
    .order("created_at", { ascending: true })

  if (error) throw new Error("Failed to fetch pending collaboration invites")
  return data ?? []
}
