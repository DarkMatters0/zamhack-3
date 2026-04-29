import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { ApproveCollaborationModal } from "./approve-collaboration-modal"
import { RejectCollaborationModal } from "./reject-collaboration-modal"
import { RevokeCollaborationModal } from "./revoke-collaboration-modal"

const formatDate = (dateString: string | null) => {
  if (!dateString) return "N/A"
  return new Date(dateString).toLocaleDateString()
}

const formatDateTime = (dateString: string | null) => {
  if (!dateString) return "N/A"
  return new Date(dateString).toLocaleString()
}

const statusBadge = (status: string) => {
  switch (status) {
    case "pending_admin_review":
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending Admin Review</Badge>
    case "pending_acceptance":
      return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Pending Acceptance</Badge>
    case "active":
      return <Badge className="bg-green-100 text-green-800 border-green-300">Active</Badge>
    case "revoked":
      return <Badge className="bg-red-100 text-red-800 border-red-300">Revoked</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

const orgStatusBadge = (status: string | null) => {
  switch (status) {
    case "active":
      return <Badge className="bg-green-100 text-green-800 border-green-300">Active</Badge>
    case "suspended":
      return <Badge className="bg-red-100 text-red-800 border-red-300">Suspended</Badge>
    case "pending":
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>
    case "rejected":
      return <Badge className="bg-red-100 text-red-800 border-red-300">Rejected</Badge>
    default:
      return <Badge variant="outline">{status ?? "Unknown"}</Badge>
  }
}

export default async function CollaborationReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") redirect("/login")

  const { data: collaboration, error } = await supabase
    .from("challenge_collaborators")
    .select(`
      *,
      challenge:challenges!challenge_collaborators_challenge_id_fkey(
        id, title, status, organization_id,
        owner_org:organizations!challenges_organization_id_fkey(id, name, industry, status)
      ),
      collaborator_org:organizations!challenge_collaborators_organization_id_fkey(id, name, industry, status),
      invited_by_profile:profiles!challenge_collaborators_invited_by_fkey(first_name, last_name),
      admin_approved_by_profile:profiles!challenge_collaborators_admin_approved_by_fkey(first_name, last_name)
    `)
    .eq("id", id)
    .single()

  if (error || !collaboration) {
    return (
      <div className="container max-w-3xl py-8 space-y-6">
        <Button variant="ghost" asChild className="pl-0 hover:bg-transparent hover:text-primary">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Collaboration invite not found.
          </CardContent>
        </Card>
      </div>
    )
  }

  const challenge = (collaboration as any).challenge
  const ownerOrg = challenge?.owner_org
  const collaboratorOrg = (collaboration as any).collaborator_org
  const invitedByProfile = (collaboration as any).invited_by_profile

  const sameIndustry =
    ownerOrg?.industry &&
    collaboratorOrg?.industry &&
    ownerOrg.industry === collaboratorOrg.industry

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      <Button variant="ghost" asChild className="pl-0 hover:bg-transparent hover:text-primary">
        <Link href="/admin/dashboard" className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>

      {/* Title + status */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h1 className="text-2xl font-bold">Collaboration Review</h1>
        {statusBadge(collaboration.status)}
      </div>

      {/* Same-industry conflict warning */}
      {sameIndustry && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800">
            <span className="font-semibold">⚠ Industry conflict: </span>
            Both organizations are in the same industry (
            <span className="font-medium">{ownerOrg.industry}</span>). Review for potential
            conflicts of interest before approving.
          </p>
        </div>
      )}

      {/* Status banners */}
      {collaboration.status === "pending_acceptance" && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          Invite approved. Waiting for the collaborator organization to accept via their invite link.
        </div>
      )}

      {collaboration.status === "revoked" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 space-y-1">
          <p className="font-semibold">This collaboration has been revoked.</p>
          <p>Revoked: {formatDateTime(collaboration.revoked_at)}</p>
          {collaboration.admin_note && (
            <p>Note: {collaboration.admin_note}</p>
          )}
        </div>
      )}

      {/* Two info cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Primary Owner */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Primary Owner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-lg font-bold">{ownerOrg?.name ?? "Unknown"}</p>
              {ownerOrg?.industry && (
                <p className="text-muted-foreground">{ownerOrg.industry}</p>
              )}
            </div>
            <div>{orgStatusBadge(ownerOrg?.status ?? null)}</div>
            <div className="pt-1 border-t space-y-1">
              <p className="text-muted-foreground">Challenge</p>
              <Link
                href={`/admin/challenges/${challenge?.id}`}
                className="font-medium text-blue-600 hover:underline"
              >
                {challenge?.title ?? "Unknown"}
              </Link>
              <div className="mt-1">
                <Badge variant="outline" className="text-xs">{challenge?.status}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Proposed Collaborator */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Proposed Collaborator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-lg font-bold">{collaboratorOrg?.name ?? "Unknown"}</p>
              {collaboratorOrg?.industry && (
                <p className="text-muted-foreground">{collaboratorOrg.industry}</p>
              )}
            </div>
            <div>{orgStatusBadge(collaboratorOrg?.status ?? null)}</div>
            <div className="pt-1 border-t space-y-1.5">
              <p>
                <span className="text-muted-foreground">Invited by: </span>
                {invitedByProfile
                  ? `${invitedByProfile.first_name ?? ""} ${invitedByProfile.last_name ?? ""}`.trim() || "—"
                  : "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Sent: </span>
                {formatDate(collaboration.created_at)}
              </p>
              <p>
                <span className="text-muted-foreground">Token expires: </span>
                {collaboration.token_expires_at ? formatDate(collaboration.token_expires_at) : "N/A"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action buttons */}
      {collaboration.status === "pending_admin_review" && (
        <div className="flex items-center gap-3">
          <ApproveCollaborationModal
            collaboratorId={collaboration.id}
            challengeTitle={challenge?.title ?? "this challenge"}
          />
          <RejectCollaborationModal collaboratorId={collaboration.id} />
        </div>
      )}

      {collaboration.status === "active" && (
        <div>
          <RevokeCollaborationModal
            collaboratorId={collaboration.id}
            challengeTitle={challenge?.title ?? "this challenge"}
          />
        </div>
      )}
    </div>
  )
}
