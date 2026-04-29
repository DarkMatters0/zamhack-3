"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { logActivity, ActivityAction, EntityType } from "@/lib/activity-log"

// ==========================================
// AUTH GUARD
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

// ==========================================
// COMPANY COLLABORATION ACTIONS
// ==========================================

export async function sendCollaborationInvite(
  challengeId: string,
  targetOrganizationId: string
): Promise<{ success: true; collaboratorId: string }> {
  const { user, profile, supabase } = await getCompanyAdminProfile()

  // Fetch the challenge
  const { data: challenge, error: challengeError } = await supabase
    .from("challenges")
    .select("id, organization_id, status, title")
    .eq("id", challengeId)
    .single()

  if (challengeError || !challenge) throw new Error("Challenge not found")
  if (challenge.organization_id !== profile.organization_id) throw new Error("Unauthorized")

  const allowedStatuses = ["draft", "pending_approval", "approved", "active", "in_progress"]
  if (!allowedStatuses.includes(challenge.status ?? "")) {
    throw new Error("Cannot invite: challenge must be in draft, pending_approval, or approved status")
  }

  // Self-referential guard
  if (targetOrganizationId === profile.organization_id) {
    throw new Error("Cannot collaborate with your own organization")
  }

  // Fetch and validate target org
  const { data: targetOrg, error: targetOrgError } = await supabase
    .from("organizations")
    .select("id, status, name")
    .eq("id", targetOrganizationId)
    .single()

  if (targetOrgError || !targetOrg) throw new Error("Target organization not found")
  if (targetOrg.status !== "active") throw new Error("Target organization is not active")

  // Enforce 1-collaborator limit at application layer with per-status messages
  const { data: existingCollabs } = await supabase
    .from("challenge_collaborators")
    .select("id, status, organization_id")
    .eq("challenge_id", challengeId)
    .neq("status", "revoked")

  if (existingCollabs && existingCollabs.length > 0) {
    const existing = existingCollabs[0]
    if (existing.status === "pending_admin_review") {
      throw new Error("A collaboration invite is already awaiting admin approval for this challenge.")
    }
    if (existing.status === "pending_acceptance") {
      throw new Error("A collaboration invite has already been sent and is awaiting acceptance.")
    }
    if (existing.status === "active") {
      throw new Error("This challenge already has an active collaborator.")
    }
    throw new Error("This challenge already has a collaborator in progress.")
  }

  // Generate invite token (7-day expiry)
  const token = crypto.randomUUID()
  const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: inserted, error: insertError } = await supabase
    .from("challenge_collaborators")
    .insert({
      challenge_id: challengeId,
      organization_id: targetOrganizationId,
      invited_by: user.id,
      status: "pending_admin_review",
      invite_token: token,
      token_expires_at: tokenExpiresAt,
    })
    .select("id")
    .single()

  if (insertError || !inserted) throw new Error("Failed to create collaboration invite")

  // Log to both organizations
  const sharedLog = {
    action: ActivityAction.COLLAB_INVITE_SENT,
    entity_type: EntityType.COLLABORATION,
    entity_id: inserted.id,
    entity_label: challenge.title,
    metadata: {
      challenge_id: challengeId,
      target_org_id: targetOrganizationId,
      target_org_name: targetOrg.name,
    },
  }

  await Promise.all([
    logActivity({ log_type: "company", actor_id: user.id, organization_id: profile.organization_id, ...sharedLog }),
    logActivity({ log_type: "company", actor_id: user.id, organization_id: targetOrganizationId, ...sharedLog }),
  ])

  revalidatePath(`/company/challenges/${challengeId}`)
  return { success: true, collaboratorId: inserted.id }
}

export async function revokeCollaboration(
  challengeId: string,
  collaboratorId: string
): Promise<{ success: true }> {
  const { user, profile, supabase } = await getCompanyAdminProfile()

  // Fetch the collaboration row
  const { data: collaboration, error: fetchError } = await supabase
    .from("challenge_collaborators")
    .select("id, status, organization_id, challenge_id")
    .eq("id", collaboratorId)
    .eq("challenge_id", challengeId)
    .single()

  if (fetchError || !collaboration) throw new Error("Collaboration not found")

  // Verify caller is the primary owner
  const { data: challenge, error: challengeError } = await supabase
    .from("challenges")
    .select("organization_id")
    .eq("id", challengeId)
    .single()

  if (challengeError || !challenge) throw new Error("Challenge not found")
  if (challenge.organization_id !== profile.organization_id) throw new Error("Unauthorized")

  if (collaboration.status === "revoked") {
    throw new Error("Cannot revoke — collaboration is not active or pending")
  }

  const { error: updateError } = await supabase
    .from("challenge_collaborators")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revoked_by: user.id,
      invite_token: null,
    })
    .eq("id", collaboratorId)

  if (updateError) throw new Error("Failed to revoke collaboration")

  const sharedLog = {
    action: ActivityAction.COLLAB_REVOKED_BY_OWNER,
    entity_type: EntityType.COLLABORATION,
    entity_id: collaboratorId,
    metadata: { challenge_id: challengeId, collaboration_id: collaboratorId },
  }

  await Promise.all([
    logActivity({ log_type: "company", actor_id: user.id, organization_id: profile.organization_id, ...sharedLog }),
    logActivity({ log_type: "company", actor_id: user.id, organization_id: collaboration.organization_id, ...sharedLog }),
  ])

  revalidatePath(`/company/challenges/${challengeId}`)
  return { success: true }
}

export async function getCollaborationForChallenge(challengeId: string) {
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

  // Verify caller is the owner or an active/pending collaborator
  const { data: challenge } = await supabase
    .from("challenges")
    .select("organization_id")
    .eq("id", challengeId)
    .single()

  const isOwner = challenge?.organization_id === profile.organization_id

  if (!isOwner) {
    const { data: collabCheck } = await supabase
      .from("challenge_collaborators")
      .select("id")
      .eq("challenge_id", challengeId)
      .eq("organization_id", profile.organization_id)
      .neq("status", "revoked")
      .limit(1)

    if (!collabCheck || collabCheck.length === 0) throw new Error("Unauthorized")
  }

  // Fetch most recent collaboration row with related org and inviter name
  const { data: collaboration } = await supabase
    .from("challenge_collaborators")
    .select(`
      *,
      organization:organizations!challenge_collaborators_organization_id_fkey(id, name, industry),
      invited_by_profile:profiles!challenge_collaborators_invited_by_fkey(first_name, last_name)
    `)
    .eq("challenge_id", challengeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return collaboration ?? null
}

export async function validateInviteToken(token: string): Promise<
  | { valid: false; reason: "not_found" | "already_used" | "wrong_organization" | "expired" }
  | { valid: true; collaboration: unknown; challengeTitle: string | null; ownerOrgName: string | null }
> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error("Unauthorized")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "company_admin") throw new Error("Unauthorized")

  const { data: collaboration, error } = await supabase
    .from("challenge_collaborators")
    .select(`
      *,
      challenge:challenges!challenge_collaborators_challenge_id_fkey(
        id, title, status, organization_id,
        owner_org:organizations!challenges_organization_id_fkey(id, name)
      ),
      invited_org:organizations!challenge_collaborators_organization_id_fkey(id, name)
    `)
    .eq("invite_token", token)
    .maybeSingle()

  if (error || !collaboration) return { valid: false, reason: "not_found" }
  if (collaboration.status !== "pending_acceptance") return { valid: false, reason: "already_used" }
  if (collaboration.organization_id !== profile.organization_id) return { valid: false, reason: "wrong_organization" }
  if (
    collaboration.token_expires_at !== null &&
    new Date(collaboration.token_expires_at) < new Date()
  ) {
    return { valid: false, reason: "expired" }
  }

  const challenge = (collaboration as any).challenge
  const ownerOrg = challenge?.owner_org

  return {
    valid: true,
    collaboration,
    challengeTitle: challenge?.title ?? null,
    ownerOrgName: ownerOrg?.name ?? null,
  }
}

export async function acceptCollaborationInvite(
  token: string
): Promise<{ success: true; challengeId: string }> {
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

  // Inline validation — avoids a double auth check from calling validateInviteToken
  const { data: collaboration, error: fetchError } = await supabase
    .from("challenge_collaborators")
    .select("id, status, organization_id, challenge_id, token_expires_at")
    .eq("invite_token", token)
    .maybeSingle()

  if (fetchError || !collaboration) throw new Error("Invalid invite link")
  if (collaboration.status !== "pending_acceptance") {
    throw new Error("This invite has already been used or is no longer valid")
  }
  if (collaboration.organization_id !== profile.organization_id) {
    throw new Error("This invite is for a different organization")
  }
  if (
    collaboration.token_expires_at !== null &&
    new Date(collaboration.token_expires_at) < new Date()
  ) {
    throw new Error("This invite link has expired")
  }

  const { error: updateError } = await supabase
    .from("challenge_collaborators")
    .update({
      status: "active",
      accepted_by: user.id,
      accepted_at: new Date().toISOString(),
      invite_token: null,
      token_expires_at: null,
    })
    .eq("id", collaboration.id)

  if (updateError) throw new Error("Failed to accept collaboration invite")

  // Fetch owner org + title for log entry
  const { data: challenge } = await supabase
    .from("challenges")
    .select("organization_id, title")
    .eq("id", collaboration.challenge_id)
    .single()

  const sharedLog = {
    action: ActivityAction.COLLAB_INVITE_ACCEPTED,
    entity_type: EntityType.COLLABORATION,
    entity_id: collaboration.id,
    entity_label: challenge?.title ?? undefined,
    metadata: {
      challenge_id: collaboration.challenge_id,
      collaboration_id: collaboration.id,
    },
  }

  await Promise.all([
    logActivity({ log_type: "company", actor_id: user.id, organization_id: profile.organization_id, ...sharedLog }),
    logActivity({ log_type: "company", actor_id: user.id, organization_id: challenge?.organization_id ?? undefined, ...sharedLog }),
  ])

  revalidatePath(`/company/challenges/${collaboration.challenge_id}`)
  revalidatePath("/company/challenges")
  return { success: true, challengeId: collaboration.challenge_id }
}

export async function submitCollaborationEdit(
  challengeId: string,
  payload: Record<string, unknown>
): Promise<{ success: true; editId: string }> {
  const { user, profile, supabase } = await getCompanyAdminProfile()

  // Verify caller is the active COLLABORATOR (not the owner)
  const { data: collaboration, error: collabError } = await supabase
    .from("challenge_collaborators")
    .select("id, status, challenge_id")
    .eq("challenge_id", challengeId)
    .eq("organization_id", profile.organization_id)
    .eq("status", "active")
    .maybeSingle()

  if (collabError || !collaboration) {
    throw new Error("Your organization is not an active collaborator on this challenge")
  }

  // Fetch challenge and validate its status
  const { data: challenge, error: challengeError } = await supabase
    .from("challenges")
    .select("id, title, organization_id, status")
    .eq("id", challengeId)
    .single()

  if (challengeError || !challenge) throw new Error("Challenge not found")

  const blockedStatuses = ["under_review", "completed", "cancelled"]
  if (blockedStatuses.includes(challenge.status ?? "")) {
    throw new Error("Challenge is not open for edits")
  }

  // Conflict gate A: existing collaboration edit pending owner review
  const { data: existingCollabEdit } = await supabase
    .from("challenge_collaboration_edits")
    .select("id")
    .eq("challenge_id", challengeId)
    .eq("status", "pending_owner_review")
    .limit(1)

  if (existingCollabEdit && existingCollabEdit.length > 0) {
    throw new Error(
      "You already have an edit pending the owner's review. Wait for it to be resolved before submitting another."
    )
  }

  // Conflict gate B: existing pending_edit awaiting admin review
  const { data: existingPendingEdit } = await supabase
    .from("challenge_pending_edits")
    .select("id")
    .eq("challenge_id", challengeId)
    .eq("status", "pending")
    .limit(1)

  if (existingPendingEdit && existingPendingEdit.length > 0) {
    throw new Error(
      "This challenge already has an edit pending admin review. Wait for it to be resolved before proposing changes."
    )
  }

  // Insert the collaboration edit proposal
  const { data: inserted, error: insertError } = await supabase
    .from("challenge_collaboration_edits")
    .insert({
      challenge_id: challengeId,
      collaborator_org_id: profile.organization_id,
      submitted_by: user.id,
      payload: JSON.parse(JSON.stringify(payload)),
      status: "pending_owner_review",
    })
    .select("id")
    .single()

  if (insertError || !inserted) throw new Error("Failed to submit collaboration edit")

  const editId = inserted.id

  const sharedLog = {
    action: ActivityAction.COLLAB_EDIT_PROPOSED,
    entity_type: EntityType.COLLABORATION,
    entity_id: editId,
    entity_label: challenge.title,
    metadata: { challenge_id: challengeId, collaboration_id: collaboration.id },
  }

  await Promise.all([
    logActivity({ log_type: "company", actor_id: user.id, organization_id: profile.organization_id, ...sharedLog }),
    logActivity({ log_type: "company", actor_id: user.id, organization_id: challenge.organization_id ?? undefined, ...sharedLog }),
  ])

  revalidatePath(`/company/challenges/${challengeId}`)
  revalidatePath("/company/challenges")
  return { success: true, editId }
}

export async function getCollaborationEditsForChallenge(challengeId: string) {
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

  // Verify caller is the owner or an active collaborator
  const { data: challenge } = await supabase
    .from("challenges")
    .select("organization_id")
    .eq("id", challengeId)
    .single()

  const isOwner = challenge?.organization_id === profile.organization_id

  if (!isOwner) {
    const { data: collabCheck } = await supabase
      .from("challenge_collaborators")
      .select("id")
      .eq("challenge_id", challengeId)
      .eq("organization_id", profile.organization_id)
      .eq("status", "active")
      .limit(1)

    if (!collabCheck || collabCheck.length === 0) throw new Error("Unauthorized")
  }

  const { data: edits } = await supabase
    .from("challenge_collaboration_edits")
    .select(`
      *,
      submitted_by_profile:profiles!challenge_collaboration_edits_submitted_by_fkey(first_name, last_name),
      collaborator_org:organizations!challenge_collaboration_edits_collaborator_org_id_fkey(id, name)
    `)
    .eq("challenge_id", challengeId)
    .order("created_at", { ascending: false })

  return edits ?? []
}
