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
// OWNER REVIEW ACTIONS
// ==========================================

export async function approveCollaborationEdit(
  editId: string
): Promise<{ success: true; branch: "direct" | "forwarded" }> {
  const { user, profile, supabase } = await getCompanyAdminProfile()

  // Fetch the collaboration edit with its challenge context
  const { data: edit, error: fetchError } = await supabase
    .from("challenge_collaboration_edits")
    .select(`
      *,
      challenge:challenges!challenge_collaboration_edits_challenge_id_fkey(id, title, status, organization_id)
    `)
    .eq("id", editId)
    .single()

  if (fetchError || !edit) throw new Error("Collaboration edit not found")

  const challenge = (edit as any).challenge
  if (!challenge) throw new Error("Associated challenge not found")

  // Verify caller is the primary owner
  if (challenge.organization_id !== profile.organization_id) throw new Error("Unauthorized")

  if (edit.status !== "pending_owner_review") throw new Error("Already reviewed")

  const payload = edit.payload as any
  const challengeId = edit.challenge_id

  const DIRECT_STATUSES = ["draft", "pending_approval", "rejected"]
  const LIVE_STATUSES = ["approved", "active", "in_progress"]

  let branch: "direct" | "forwarded"
  let newPendingEditId: string | null = null

  if (DIRECT_STATUSES.includes(challenge.status ?? "")) {
    // Branch A — apply directly to the challenge (mirrors approvePendingEdit two-step pattern)

    // Step A1: core fields
    const { error: coreError } = await supabase
      .from("challenges")
      .update({
        title: payload.title,
        description: payload.description,
        problem_brief: payload.problem_brief,
        industry: payload.industries?.[0] ?? payload.industry ?? null,
        difficulty: payload.difficulty,
        status: payload.status,
        participation_type: payload.participation_type,
        max_participants: payload.max_participants,
        max_teams: payload.max_teams,
        max_team_size: payload.max_team_size,
        start_date: payload.is_perpetual ? null : (payload.start_date || null),
        end_date: payload.is_perpetual ? null : (payload.end_date || null),
        registration_deadline: payload.is_perpetual ? null : (payload.registration_deadline || null),
        entry_fee_amount: payload.entry_fee_amount,
        currency: payload.currency,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", challengeId)

    if (coreError) throw new Error(`Failed to apply challenge edits: ${coreError.message}`)

    // Step A2: new-column fields
    const { error: newFieldsError } = await supabase
      .from("challenges")
      .update({
        industries: payload.industries ?? [],
        is_perpetual: payload.is_perpetual ?? false,
        location_type: payload.location_type ?? null,
        location_details: payload.location_type === "onsite"
          ? (payload.location_details ?? null)
          : null,
      } as any)
      .eq("id", challengeId)

    if (newFieldsError) throw new Error(`Failed to apply new fields: ${newFieldsError.message}`)

    // Step A3: milestone changes
    for (const milestone of payload.milestones ?? []) {
      if (milestone.id) {
        await supabase
          .from("milestones")
          .update({
            title: milestone.title,
            description: milestone.description,
            due_date: milestone.due_date || null,
            sequence_order: milestone.sequence_order,
            requires_github: milestone.requires_github,
            requires_url: milestone.requires_url,
            requires_text: milestone.requires_text,
          })
          .eq("id", milestone.id)
      } else {
        await supabase.from("milestones").insert({
          challenge_id: challengeId,
          title: milestone.title,
          description: milestone.description,
          due_date: milestone.due_date || null,
          sequence_order: milestone.sequence_order,
          requires_github: milestone.requires_github,
          requires_url: milestone.requires_url,
          requires_text: milestone.requires_text,
        })
      }
    }

    branch = "direct"

  } else if (LIVE_STATUSES.includes(challenge.status ?? "")) {
    // Branch B — forward into challenge_pending_edits for admin review
    const { data: pendingEdit, error: forwardError } = await supabase
      .from("challenge_pending_edits")
      .insert({
        challenge_id: challengeId,
        submitted_by: edit.submitted_by, // preserve collaborator attribution
        payload: edit.payload as any,
        status: "pending",
      } as any)
      .select("id")
      .single()

    if (forwardError || !pendingEdit) {
      throw new Error("Failed to forward edit to admin review")
    }

    newPendingEditId = pendingEdit.id
    branch = "forwarded"

  } else {
    throw new Error("Challenge is not in a state that allows edit approval")
  }

  // Mark the collaboration edit as approved
  const { error: markError } = await supabase
    .from("challenge_collaboration_edits")
    .update({
      status: "approved_by_owner",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", editId)

  if (markError) throw new Error("Failed to mark collaboration edit as approved")

  // Log to owner org + collaborator org (+ admin log if Branch B)
  const sharedMeta = {
    challenge_id: challengeId,
    branch: branch === "direct" ? "direct_apply" : "forwarded_to_admin",
    pending_edit_id: newPendingEditId,
  }

  await Promise.all([
    logActivity({
      log_type: "company",
      actor_id: user.id,
      organization_id: profile.organization_id,
      action: ActivityAction.COLLAB_EDIT_OWNER_APPROVED,
      entity_type: EntityType.COLLABORATION,
      entity_id: editId,
      entity_label: challenge.title,
      metadata: sharedMeta,
    }),
    logActivity({
      log_type: "company",
      actor_id: user.id,
      organization_id: edit.collaborator_org_id,
      action: ActivityAction.COLLAB_EDIT_OWNER_APPROVED,
      entity_type: EntityType.COLLABORATION,
      entity_id: editId,
      entity_label: challenge.title,
      metadata: sharedMeta,
    }),
    ...(branch === "forwarded" ? [
      logActivity({
        log_type: "admin",
        actor_id: user.id,
        action: ActivityAction.COLLAB_EDIT_OWNER_APPROVED,
        entity_type: EntityType.COLLABORATION,
        entity_id: editId,
        entity_label: challenge.title,
        metadata: { pending_edit_id: newPendingEditId, challenge_id: challengeId },
      }),
    ] : []),
  ])

  revalidatePath(`/company/challenges/${challengeId}`)
  revalidatePath("/company/challenges")

  if (branch === "forwarded") {
    revalidatePath("/admin/dashboard")
    revalidatePath(`/admin/challenges/${challengeId}`)
  }

  return { success: true, branch }
}

export async function rejectCollaborationEdit(
  editId: string,
  ownerNote?: string
): Promise<{ success: true }> {
  const { user, profile, supabase } = await getCompanyAdminProfile()

  const { data: edit, error: fetchError } = await supabase
    .from("challenge_collaboration_edits")
    .select(`
      *,
      challenge:challenges!challenge_collaboration_edits_challenge_id_fkey(id, title, organization_id)
    `)
    .eq("id", editId)
    .single()

  if (fetchError || !edit) throw new Error("Collaboration edit not found")

  const challenge = (edit as any).challenge
  if (!challenge) throw new Error("Associated challenge not found")

  if (challenge.organization_id !== profile.organization_id) throw new Error("Unauthorized")
  if (edit.status !== "pending_owner_review") throw new Error("Already reviewed")

  const { error: updateError } = await supabase
    .from("challenge_collaboration_edits")
    .update({
      status: "rejected_by_owner",
      owner_note: ownerNote ?? null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", editId)

  if (updateError) throw new Error("Failed to reject collaboration edit")

  const sharedLog = {
    action: ActivityAction.COLLAB_EDIT_OWNER_REJECTED,
    entity_type: EntityType.COLLABORATION,
    entity_id: editId,
    entity_label: challenge.title,
    metadata: {
      challenge_id: edit.challenge_id,
      owner_note: ownerNote,
      edit_id: editId,
    },
  }

  await Promise.all([
    logActivity({ log_type: "company", actor_id: user.id, organization_id: profile.organization_id, ...sharedLog }),
    logActivity({ log_type: "company", actor_id: user.id, organization_id: edit.collaborator_org_id, ...sharedLog }),
  ])

  revalidatePath(`/company/challenges/${edit.challenge_id}`)
  revalidatePath("/company/challenges")
  return { success: true }
}

export async function getPendingCollaborationEditsForOwner(challengeId: string) {
  const { profile, supabase } = await getCompanyAdminProfile()

  // Verify caller is the primary owner
  const { data: challenge, error: challengeError } = await supabase
    .from("challenges")
    .select("organization_id")
    .eq("id", challengeId)
    .single()

  if (challengeError || !challenge) throw new Error("Challenge not found")
  if (challenge.organization_id !== profile.organization_id) throw new Error("Unauthorized")

  const { data: edits, error } = await supabase
    .from("challenge_collaboration_edits")
    .select(`
      *,
      submitted_by_profile:profiles!challenge_collaboration_edits_submitted_by_fkey(first_name, last_name),
      collaborator_org:organizations!challenge_collaboration_edits_collaborator_org_id_fkey(id, name)
    `)
    .eq("challenge_id", challengeId)
    .eq("status", "pending_owner_review")
    .order("created_at", { ascending: true })

  if (error) throw new Error("Failed to fetch pending collaboration edits")
  return edits ?? []
}
