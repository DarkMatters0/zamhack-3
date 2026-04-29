"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Handshake, Copy, Check, Loader2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { revokeCollaboration } from "@/app/(company)/company/challenges/collaboration-actions"
import {
  approveCollaborationEdit,
  rejectCollaborationEdit,
} from "@/app/(company)/company/challenges/collaboration-review-actions"
import { OrgSearchAndInvite } from "./org-search-and-invite"
import { RefreshTokenButton } from "./refresh-token-button"
import { ProposeEditDrawer } from "./propose-edit-drawer"

type CollaborationStatus = "pending_admin_review" | "pending_acceptance" | "active" | "revoked"

type CollaborationData = {
  id: string
  challenge_id: string
  organization_id: string
  status: CollaborationStatus
  invite_token: string | null
  token_expires_at: string | null
  invited_by: string | null
  accepted_at: string | null
  revoked_at: string | null
  admin_note: string | null
  organization: { id: string; name: string; industry: string | null } | null
  invited_by_profile: { first_name: string | null; last_name: string | null } | null
}

type PendingEdit = {
  id: string
  challenge_id: string
  collaborator_org_id: string
  submitted_by: string
  payload: Record<string, unknown>
  status: string
  created_at: string
  submitted_by_profile: { first_name: string | null; last_name: string | null } | null
  collaborator_org: { id: string; name: string } | null
}

interface Props {
  challengeId: string
  challengeStatus: string
  challengeTitle: string
  isOwner: boolean
  collaboration: CollaborationData | null
  pendingEdits: PendingEdit[]
  ownerOrgName: string
}

const statusBadge = (status: CollaborationStatus) => {
  switch (status) {
    case "pending_admin_review":
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Awaiting Admin Approval</Badge>
    case "pending_acceptance":
      return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Invite Sent — Awaiting Acceptance</Badge>
    case "active":
      return <Badge className="bg-green-100 text-green-800 border-green-300">Active</Badge>
    case "revoked":
      return <Badge className="bg-gray-100 text-gray-700 border-gray-300">Revoked</Badge>
  }
}

const formatDate = (s: string | null) => (s ? new Date(s).toLocaleDateString() : "N/A")
const formatDateTime = (s: string | null) => (s ? new Date(s).toLocaleString() : "N/A")

function EditReviewCard({ edit, onDone }: { edit: PendingEdit; onDone: () => void }) {
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [note, setNote] = useState("")

  const payloadKeys = Object.keys(edit.payload).filter((k) => {
    const v = edit.payload[k]
    return v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)
  })

  const submitterName = edit.submitted_by_profile
    ? `${edit.submitted_by_profile.first_name ?? ""} ${edit.submitted_by_profile.last_name ?? ""}`.trim() || "Unknown"
    : "Unknown"

  async function handleApprove() {
    setIsApproving(true)
    try {
      await approveCollaborationEdit(edit.id)
      toast.success("Edit approved")
      onDone()
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to approve edit")
    } finally {
      setIsApproving(false)
    }
  }

  async function handleReject() {
    setIsRejecting(true)
    try {
      await rejectCollaborationEdit(edit.id, note.trim() || undefined)
      toast.success("Edit rejected")
      onDone()
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to reject edit")
    } finally {
      setIsRejecting(false)
    }
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Submitted by {submitterName}</p>
          <p className="text-xs text-muted-foreground">{formatDateTime(edit.created_at)}</p>
        </div>
        {edit.collaborator_org && (
          <Badge variant="outline" className="text-xs shrink-0">
            {edit.collaborator_org.name}
          </Badge>
        )}
      </div>
      {payloadKeys.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Proposes changes to:{" "}
          <span className="text-foreground font-medium">{payloadKeys.join(", ")}</span>
        </p>
      )}
      {!showReject ? (
        <div className="flex gap-2">
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={isApproving}
            onClick={handleApprove}
          >
            {isApproving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Approving…
              </>
            ) : (
              "Approve Edit"
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isApproving}
            onClick={() => setShowReject(true)}
          >
            Reject Edit
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason for rejection (optional)..."
            rows={2}
            disabled={isRejecting}
          />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" disabled={isRejecting} onClick={handleReject}>
              {isRejecting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Rejecting…
                </>
              ) : (
                "Confirm Rejection"
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isRejecting}
              onClick={() => { setShowReject(false); setNote("") }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function CollaborationPanel({
  challengeId,
  challengeStatus,
  challengeTitle,
  isOwner,
  collaboration,
  pendingEdits,
  ownerOrgName,
}: Props) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)

  const blockedStatuses = ["under_review", "completed", "cancelled"]
  const canInvite = !blockedStatuses.includes(challengeStatus)

  async function handleRevoke() {
    if (!collaboration) return
    setIsRevoking(true)
    try {
      await revokeCollaboration(challengeId, collaboration.id)
      toast.success("Collaboration revoked")
      setShowRevokeConfirm(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to revoke collaboration")
    } finally {
      setIsRevoking(false)
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // MODE C — Collaborator view
  if (!isOwner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5" />
            Your Collaboration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {collaboration ? (
            <>
              <div className="flex items-center gap-3">{statusBadge(collaboration.status)}</div>
              {collaboration.status === "active" && (
                <div className="space-y-3 text-sm">
                  <p>You are an active collaborator on this challenge.</p>
                  {ownerOrgName && (
                    <p className="text-muted-foreground">
                      Challenge owner:{" "}
                      <span className="text-foreground font-medium">{ownerOrgName}</span>
                    </p>
                  )}
                  <div className="pt-1">
                    <ProposeEditDrawer
                      challengeId={challengeId}
                      collaboratorOrgId={collaboration.organization_id}
                    />
                  </div>
                </div>
              )}
              {collaboration.status === "revoked" && (
                <p className="text-sm text-muted-foreground">
                  Your collaboration on this challenge has ended.
                </p>
              )}
              {collaboration.status === "pending_admin_review" && (
                <p className="text-sm text-muted-foreground">
                  Your collaboration invite is awaiting admin approval.
                </p>
              )}
              {collaboration.status === "pending_acceptance" && (
                <p className="text-sm text-muted-foreground">
                  Your invite has been approved. Check your invite link to accept.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active collaboration found for your organization on this challenge.
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  // MODE A — Owner, no collaboration yet
  if (!collaboration) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5" />
            Collaboration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Invite another company to co-own this challenge. They can propose edits which you
            review before they go to admin approval.
          </p>
          {canInvite ? (
            <OrgSearchAndInvite challengeId={challengeId} challengeTitle={challengeTitle} />
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Collaboration cannot be initiated at this stage.
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  // MODE B — Owner, collaboration exists
  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const inviteLink =
    collaboration.invite_token
      ? `${origin}/company/collaboration/accept?token=${collaboration.invite_token}`
      : null

  const isTokenExpired =
    collaboration.token_expires_at !== null &&
    new Date(collaboration.token_expires_at) < new Date()

  const collabOrgName = collaboration.organization?.name ?? "Unknown Organization"
  const collabOrgIndustry = collaboration.organization?.industry

  return (
    <div className="space-y-6">
      {/* Status card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5" />
            Collaboration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-medium">{collabOrgName}</span>
            {collabOrgIndustry && (
              <span className="text-sm text-muted-foreground">{collabOrgIndustry}</span>
            )}
            {statusBadge(collaboration.status)}
          </div>

          {collaboration.status === "pending_admin_review" && (
            <p className="text-sm text-muted-foreground">
              An admin must approve before the invite is sent to the collaborator organization.
            </p>
          )}

          {collaboration.status === "pending_acceptance" && (
            <div className="space-y-3">
              {inviteLink && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Invite Link
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-muted px-3 py-2 rounded border break-all">
                      {inviteLink}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => handleCopy(inviteLink)}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Expires:{" "}
                <span className={isTokenExpired ? "text-red-600 font-medium" : "text-foreground"}>
                  {formatDate(collaboration.token_expires_at)}
                </span>
                {isTokenExpired && " (expired)"}
              </p>
              {isTokenExpired && (
                <RefreshTokenButton
                  collaboratorId={collaboration.id}
                  challengeId={challengeId}
                />
              )}
            </div>
          )}

          {collaboration.status === "active" && (
            <div className="space-y-3 text-sm">
              {collaboration.invited_by_profile && (
                <p className="text-muted-foreground">
                  Invited by:{" "}
                  <span className="text-foreground">
                    {`${collaboration.invited_by_profile.first_name ?? ""} ${collaboration.invited_by_profile.last_name ?? ""}`.trim() || "—"}
                  </span>
                </p>
              )}
              {collaboration.accepted_at && (
                <p className="text-muted-foreground">
                  Active since:{" "}
                  <span className="text-foreground">{formatDateTime(collaboration.accepted_at)}</span>
                </p>
              )}
              {!showRevokeConfirm ? (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setShowRevokeConfirm(true)}
                >
                  Revoke Collaboration
                </Button>
              ) : (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-800">
                      This will immediately dissolve the collaboration. This action cannot be undone.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={isRevoking}
                      onClick={handleRevoke}
                    >
                      {isRevoking ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          Revoking…
                        </>
                      ) : (
                        "Confirm Revocation"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isRevoking}
                      onClick={() => setShowRevokeConfirm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {collaboration.status === "revoked" && (
            <div className="space-y-4 text-sm">
              <div className="text-muted-foreground space-y-1">
                <p>
                  Revoked:{" "}
                  <span className="text-foreground">{formatDateTime(collaboration.revoked_at)}</span>
                </p>
                {collaboration.admin_note && <p>Note: {collaboration.admin_note}</p>}
              </div>
              {canInvite && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground mb-3">Start a new collaboration:</p>
                  <OrgSearchAndInvite challengeId={challengeId} challengeTitle={challengeTitle} />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending edits from collaborator */}
      {collaboration.status === "active" && pendingEdits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              Proposed Edits from Collaborator
              <Badge variant="outline">{pendingEdits.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingEdits.map((edit) => (
              <EditReviewCard
                key={edit.id}
                edit={edit}
                onDone={() => router.refresh()}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
