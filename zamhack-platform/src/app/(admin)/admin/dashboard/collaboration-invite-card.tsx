import Link from "next/link"
import { Handshake, CheckCircle2, ArrowRight } from "lucide-react"

type CollabInvite = {
  id: string
  created_at: string
  challenge: {
    id: string
    title: string
    status: string
    organization_id: string | null
    owner_org: { id: string; name: string; industry: string | null } | null
  } | null
  collaborator_org: { id: string; name: string; industry: string | null } | null
  invited_by_profile: { first_name: string | null; last_name: string | null } | null
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return "N/A"
  return new Date(dateString).toLocaleDateString()
}

export function CollaborationInviteCard({ invites }: { invites: CollabInvite[] }) {
  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <div>
          <div className="admin-card-title">Pending Collaboration Invites</div>
          <div className="admin-card-subtitle">Companies requesting to collaborate on challenges</div>
        </div>
        {invites.length > 0 && (
          <span className="admin-badge yellow">
            <span className="admin-badge-dot" />
            {invites.length} pending
          </span>
        )}
      </div>

      {invites.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="admin-empty-title">No pending collaboration requests</div>
          <div className="admin-empty-text">All collaboration invites are resolved</div>
        </div>
      ) : (
        <div>
          {invites.slice(0, 5).map((invite) => (
            <div key={invite.id} className="admin-action-card">
              <div className="admin-action-card-info">
                <div
                  className="admin-action-card-avatar"
                  style={{ background: "var(--admin-blue-light)", color: "var(--admin-blue)" }}
                >
                  <Handshake className="w-4 h-4" />
                </div>
                <div>
                  <div className="admin-action-card-name">
                    {invite.challenge?.title ?? "Unknown Challenge"}
                  </div>
                  <div className="admin-action-card-meta">
                    {(invite.challenge as any)?.owner_org?.name ?? "?"} → {invite.collaborator_org?.name ?? "?"} · {formatDate(invite.created_at)}
                  </div>
                </div>
              </div>
              <div className="admin-action-card-actions">
                <Link href={`/admin/collaborations/${invite.id}`}>
                  <button className="admin-btn admin-btn-coral admin-btn-sm">
                    Review
                  </button>
                </Link>
              </div>
            </div>
          ))}
          {invites.length > 5 && (
            <div className="p-4 text-center">
              <Link href="/admin/collaborations" className="admin-btn admin-btn-outline admin-btn-sm">
                View all {invites.length} pending
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
