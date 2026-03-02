// src/app/challenges/edit-actions.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type Enums } from "@/types/supabase";

export type MilestoneInput = {
  id?: string;
  title: string;
  description: string;
  due_date: string;
  sequence_order: number;
  requires_github: boolean;
  requires_url: boolean;
  requires_text: boolean;
};

export type UpdateChallengeInput = {
  title: string;
  description: string;
  problem_brief: string;
  industry: string;
  difficulty: Enums<"proficiency_level">;
  status: Enums<"challenge_status">;
  participation_type: "solo" | "team" | "both";
  max_participants: number;
  max_teams: number;
  max_team_size: number;
  start_date: string;
  end_date: string;
  registration_deadline: string;
  entry_fee_amount: number;
  currency: string;
  milestones: MilestoneInput[];
};

export async function updateChallenge(
  challengeId: string,
  data: UpdateChallengeInput
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Unauthorized");

  const { error: challengeError } = await supabase
    .from("challenges")
    .update({
      title: data.title,
      description: data.description,
      problem_brief: data.problem_brief,
      industry: data.industry,
      difficulty: data.difficulty,
      status: data.status,
      participation_type: data.participation_type,
      max_participants: data.max_participants,
      max_teams: data.max_teams,
      max_team_size: data.max_team_size,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      registration_deadline: data.registration_deadline || null,
      entry_fee_amount: data.entry_fee_amount,
      currency: data.currency,
      updated_at: new Date().toISOString(),
    })
    .eq("id", challengeId)
    .eq("created_by", user.id);

  if (challengeError) throw new Error(challengeError.message);

  for (const milestone of data.milestones) {
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
        .eq("id", milestone.id);
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
      });
    }
  }

  revalidatePath(`/company/challenges/${challengeId}`);
  redirect(`/company/challenges/${challengeId}`);
}

export async function getChallengeForEdit(challengeId: string) {
  const supabase = await createClient();

  const { data: challenge, error } = await supabase
    .from("challenges")
    .select(`*, milestones(*)`)
    .eq("id", challengeId)
    .single();

  if (error || !challenge) return null;
  return challenge;
}