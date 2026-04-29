import { type Metadata } from "next"
import { validateInviteToken } from "@/app/(company)/company/challenges/collaboration-actions"
import { AcceptanceCard } from "./acceptance-card"
import { InvalidInvite } from "./invalid-invite"

export const metadata: Metadata = {
  title: "Accept Collaboration Invite — ZamHack",
}

export default async function AcceptCollaborationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const params = await searchParams
  const token = params.token ?? null

  if (!token) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <InvalidInvite reason="missing_token" />
        </div>
      </div>
    )
  }

  let validation: Awaited<ReturnType<typeof validateInviteToken>>
  try {
    validation = await validateInviteToken(token)
  } catch {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <InvalidInvite reason="unauthorized" />
        </div>
      </div>
    )
  }

  if (!validation.valid) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <InvalidInvite reason={validation.reason} />
        </div>
      </div>
    )
  }

  const collab = validation.collaboration as { id: string; challenge_id: string }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <AcceptanceCard
          token={token}
          challengeTitle={validation.challengeTitle ?? "Untitled Challenge"}
          ownerOrgName={validation.ownerOrgName ?? "the challenge owner"}
          collaborationId={collab.id}
          challengeId={collab.challenge_id}
        />
      </div>
    </div>
  )
}
