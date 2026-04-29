"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { logActivity, ActivityAction, EntityType } from "@/lib/activity-log"

// ==========================================
// AUTH GUARDS
// ==========================================

async function getCompanyAdminProfile() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error("Unauthorized")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "company_admin") throw new Error("Unauthorized")
  if (!profile.organization_id) throw new Error("No organization associated with this account")

  return { user, profile: profile as { role: string; organization_id: string }, supabase }
}

async function getCompanyMemberProfile() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error("Unauthorized")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single()

  if (!profile || !["company_admin", "company_member"].includes(profile.role ?? "")) {
    throw new Error("Unauthorized")
  }
  if (!profile.organization_id) throw new Error("No organization associated with this account")

  return { user, profile: profile as { role: string; organization_id: string }, supabase }
}

// ==========================================
// TOKEN ACTIONS
// ==========================================

export async function refreshCollaborationInviteToken(
  collaboratorId: string
): Promise<{ success: true; newToken: string; tokenExpiresAt: string }> {
  const { user, profile, supabase } = await getCompanyAdminProfile()

  const { data: collaboration, error: fetchError } = await supabase
    .from("challenge_collaborators")
    .select("id, challenge_id, organization_id, status, invite_token, token_expires_at")
    .eq("id", collaboratorId)
    .single()

  if (fetchError || !collaboration) throw new Error("Collaboration not found")

  const { data: challenge, error: challengeError } = await supabase
    .from("challenges")
    .select("id, title, organization_id")
    .eq("id", collaboration.challenge_id)
    .single()

  if (challengeError || !challenge) throw new Error("Challenge not found")
  if (challenge.organization_id !== profile.organization_id) throw new Error("Unauthorized")

  if (collaboration.status !== "pending_acceptance") {
    throw new Error("Cannot refresh token: collaboration is not in pending_acceptance state")
  }

  if (
    collaboration.token_expires_at !== null &&
    new Date(collaboration.token_expires_at) > new Date()
  ) {
    throw new Error("Token has not expired yet. The existing invite link is still valid.")
  }

  const newToken = crypto.randomUUID()
  const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { error: updateError } = await supabase
    .from("challenge_collaborators")
    .update({
      invite_token: newToken,
      token_expires_at: tokenExpiresAt,
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", collaboratorId)

  if (updateError) throw new Error("Failed to refresh invite token")

  await logActivity({
    log_type: "company",
    actor_id: user.id,
    organization_id: profile.organization_id,
    action: ActivityAction.COLLAB_INVITE_SENT,
    entity_type: EntityType.COLLABORATION,
    entity_id: collaboratorId,
    entity_label: challenge.title,
    metadata: {
      challenge_id: collaboration.challenge_id,
      target_org_id: collaboration.organization_id,
      refresh: true,
    },
  })

  revalidatePath(`/company/challenges/${collaboration.challenge_id}`)
  return { success: true, newToken, tokenExpiresAt }
}

export async function checkTokenExpiry(collaboratorId: string): Promise<{
  isExpired: boolean
  expiresAt: string | null
  status: string
}> {
  const { profile, supabase } = await getCompanyMemberProfile()

  const { data: collaboration, error: fetchError } = await supabase
    .from("challenge_collaborators")
    .select("id, challenge_id, status, token_expires_at")
    .eq("id", collaboratorId)
    .single()

  if (fetchError || !collaboration) throw new Error("Collaboration not found")

  // Dual-org authorization: caller must be the challenge owner OR an active collaborator
  const { data: challenge } = await supabase
    .from("challenges")
    .select("organization_id")
    .eq("id", collaboration.challenge_id)
    .single()

  const isOwner = challenge?.organization_id === profile.organization_id

  if (!isOwner) {
    const { data: collabCheck } = await supabase
      .from("challenge_collaborators")
      .select("id")
      .eq("challenge_id", collaboration.challenge_id)
      .eq("organization_id", profile.organization_id)
      .neq("status", "revoked")
      .limit(1)

    if (!collabCheck || collabCheck.length === 0) throw new Error("Unauthorized")
  }

  const isExpired =
    collaboration.token_expires_at !== null &&
    new Date(collaboration.token_expires_at) < new Date()

  return {
    isExpired,
    expiresAt: collaboration.token_expires_at,
    status: collaboration.status,
  }
}
