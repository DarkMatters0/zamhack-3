"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function joinChallenge(challengeId: string, forceJoin: boolean = false) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "You must be logged in to join a challenge." }
  }

  // 1. Fetch Target Challenge Details
  const { data: targetChallenge, error: fetchError } = await supabase
    .from("challenges")
    .select("title, start_date, end_date, status, registration_deadline")
    .eq("id", challengeId)
    .single()

  if (fetchError || !targetChallenge) {
    return { error: "Challenge not found." }
  }

  // FIX: Ensure dates exist before processing
  if (!targetChallenge.start_date || !targetChallenge.end_date || !targetChallenge.registration_deadline) {
    return { error: "This challenge has missing date information and cannot be joined." }
  }

  const now = new Date()
  const startDate = new Date(targetChallenge.start_date)
  const endDate = new Date(targetChallenge.end_date)
  const regDeadline = new Date(targetChallenge.registration_deadline)

  // 2. Validate Challenge Status
  if (targetChallenge.status !== 'approved' && targetChallenge.status !== 'in_progress') {
    return { error: "This challenge is not open for registration." }
  }

  // 3. Late-Join Policy
  // Rule: Cannot join if registration deadline passed OR if less than 24 hours to end
  const oneDay = 24 * 60 * 60 * 1000
  const isEndingSoon = (endDate.getTime() - now.getTime()) < oneDay

  if (now > regDeadline) {
    return { error: "Registration deadline has passed." }
  }

  if (isEndingSoon) {
    return { error: "Registration closed: This challenge ends in less than 24 hours." }
  }

  // 4. Check for Existing Participation
  const { data: existing } = await supabase
    .from("challenge_participants")
    .select("id")
    .eq("user_id", user.id)
    .eq("challenge_id", challengeId)
    .single()

  if (existing) {
    return { error: "You are already joined in this challenge." }
  }

  // 5. Schedule Overlap Check (Skip if forceJoin is true)
  if (!forceJoin) {
    // Fetch user's other active challenges
    const { data: activeParticipations } = await supabase
      .from("challenge_participants")
      .select(`
        challenge:challenges (
          id,
          title,
          start_date,
          end_date
        )
      `)
      .eq("user_id", user.id)
      .eq("status", "active") // Only check active ones

    if (activeParticipations && activeParticipations.length > 0) {
      const overlappingChallenge = activeParticipations.find((p: any) => {
        if (!p.challenge) return false
        if (!p.challenge.start_date || !p.challenge.end_date) return false // Skip invalid data
        
        const currentStart = new Date(p.challenge.start_date)
        const currentEnd = new Date(p.challenge.end_date)

        // Overlap Formula: (StartA <= EndB) and (EndA >= StartB)
        return (startDate <= currentEnd) && (endDate >= currentStart)
      })

      if (overlappingChallenge) {
        // Return a specific status to trigger the UI Dialog
        return { 
          status: "overlap_warning", 
          message: `This overlaps with "${(overlappingChallenge.challenge as any).title}". Do you still want to join?`,
          conflictingId: (overlappingChallenge.challenge as any).id
        }
      }
    }
  }

  // 6. Proceed to Join
  const { error: joinError } = await supabase
    .from("challenge_participants")
    .insert({
      challenge_id: challengeId,
      user_id: user.id,
      status: 'active',
      joined_at: new Date().toISOString()
    })

  if (joinError) {
    console.error("Join error:", joinError)
    return { error: "Failed to join challenge. Please try again." }
  }

  revalidatePath(`/challenges/${challengeId}`)
  revalidatePath(`/dashboard`)
  return { success: true }
}