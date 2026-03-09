// src/app/(company)/company/challenges/[id]/edit/page.tsx
import { notFound, redirect } from "next/navigation";
import { getChallengeForEdit } from "@/app/challenges/edit-actions";
import { createClient } from "@/utils/supabase/server";
import EditChallengeForm from "./edit-challenge-form";

export default async function EditChallengePage({
  params,
}: {
  params: Promise<{ id: string }>;  // ← FIX: params is a Promise in Next.js 15+
}) {
  const { id } = await params;  // ← FIX: await it before accessing id

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const challenge = await getChallengeForEdit(id);
  if (!challenge) notFound();

  // Only the creator can edit
  if (challenge.created_by !== user.id) redirect(`/company/challenges/${id}`);

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Edit Challenge</h1>
      <EditChallengeForm challenge={challenge} />
    </div>
  );
}