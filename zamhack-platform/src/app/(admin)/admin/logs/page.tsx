import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Database } from "@/types/supabase"
import { ScrollText, Search, Activity, ShieldCheck, Building2 } from "lucide-react"
import "@/app/(admin)/admin.css"
import { LogsExportButtons } from "./logs-export-buttons"

type ActivityLog = Database["public"]["Tables"]["activity_logs"]["Row"] & {
  actor: { first_name: string | null; last_name: string | null; role: string | null } | null
  organization: { name: string | null } | null
}

const PER_PAGE = 20

const ACTION_LABELS: Record<string, string> = {
  "org.approved":           "Approved organization",
  "org.rejected":           "Rejected organization",
  "org.profile_updated":    "Updated org profile",
  "challenge.approved":     "Approved challenge",
  "challenge.rejected":     "Rejected challenge",
  "challenge.created":      "Created challenge",
  "challenge.edited":       "Edited challenge",
  "challenge.submitted":    "Submitted for review",
  "challenge.cancelled":    "Cancelled challenge",
  "pending_edit.approved":  "Approved pending edit",
  "pending_edit.rejected":  "Rejected pending edit",
  "user.suspended":         "Suspended user",
  "user.unsuspended":       "Unsuspended user",
  "user.role_changed":      "Changed user role",
  "settings.updated":       "Updated platform settings",
  "evaluator.assigned":     "Assigned evaluator",
  "evaluator.removed":      "Removed evaluator",
  "evaluation.submitted":   "Submitted evaluation",
  "evaluation.edited":      "Edited submitted evaluation",
  "chief_evaluator.set":    "Set chief evaluator",
  "tie.resolved":           "Resolved tie",
  "member.invited":         "Invited member",
  "member.removed":         "Removed member",
  // Collaboration
  "collab.invite_sent":            "Sent collaboration invite",
  "collab.invite_admin_approved":  "Approved collaboration invite",
  "collab.invite_admin_rejected":  "Rejected collaboration invite",
  "collab.invite_accepted":        "Accepted collaboration invite",
  "collab.revoked_by_owner":       "Revoked collaboration (owner)",
  "collab.revoked_by_admin":       "Revoked collaboration (admin)",
  "collab.revoked_via_suspension": "Collaboration revoked — org suspended",
  "collab.edit_proposed":          "Proposed collaboration edit",
  "collab.edit_owner_approved":    "Approved collaboration edit",
  "collab.edit_owner_rejected":    "Rejected collaboration edit",
}

const formatTimestamp = (dateString: string) => {
  const date = new Date(dateString)
  const datePart = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  const timePart = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
  return `${datePart} · ${timePart}`
}

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; page?: string }>
}) {
  const params = await searchParams

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: currentUserProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (currentUserProfile?.role !== "admin") redirect("/dashboard")

  const activeTab   = params.tab || "all"
  const searchQuery = (params.q || "").toLowerCase()
  const currentPage = Math.max(1, parseInt(params.page || "1", 10))
  const offset      = (currentPage - 1) * PER_PAGE

  // Fetch counts for stat cards
  const { count: totalCount }   = await supabase.from("activity_logs").select("*", { count: "exact", head: true })
  const { count: adminCount }   = await supabase.from("activity_logs").select("*", { count: "exact", head: true }).eq("log_type", "admin")
  const { count: companyCount } = await supabase.from("activity_logs").select("*", { count: "exact", head: true }).eq("log_type", "company")

  // Build base query
  let query = supabase
    .from("activity_logs")
    .select(`*, actor:profiles!activity_logs_actor_id_fkey(first_name, last_name, role), organization:organizations(name)`, { count: "exact" })
    .order("created_at", { ascending: false })

  if (activeTab === "admin" || activeTab === "company") {
    query = query.eq("log_type", activeTab)
  }

  if (searchQuery) {
    query = query.or(
      `action.ilike.%${searchQuery}%,entity_label.ilike.%${searchQuery}%`
    )
  }

  query = query.range(offset, offset + PER_PAGE - 1)

  const { data: logs, count: filteredCount } = await query

  const typedLogs = (logs || []) as ActivityLog[]
  const safeTotal  = filteredCount ?? 0
  const totalPages = Math.max(1, Math.ceil(safeTotal / PER_PAGE))
  const safePage   = Math.min(currentPage, totalPages)

  const buildUrl = (overrides: Record<string, string | number | undefined>) => {
    const base: Record<string, string> = {
      tab:  activeTab,
      page: String(safePage),
    }
    if (params.q) base.q = params.q
    const merged = {
      ...base,
      ...Object.fromEntries(
        Object.entries(overrides)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      ),
    }
    Object.keys(merged).forEach((k) => { if (merged[k] === "") delete merged[k] })
    return `?${new URLSearchParams(merged).toString()}`
  }

  const tabs = [
    { key: "all",     label: "All Logs",      count: totalCount ?? 0 },
    { key: "admin",   label: "Admin Logs",    count: adminCount ?? 0 },
    { key: "company", label: "Company Logs",  count: companyCount ?? 0 },
  ]

  return (
    <div className="space-y-6" data-layout="admin">

      {/* Page Header */}
      <div className="admin-page-header">
        <h1 className="admin-page-title">Activity <span>Logs</span></h1>
        <p className="admin-page-subtitle">
          Full audit trail of admin and company actions on the platform.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card coral">
          <div className="admin-stat-header">
            <span className="admin-stat-label">Total Logs</span>
            <div className="admin-stat-icon coral"><Activity /></div>
          </div>
          <div className="admin-stat-value coral">{totalCount ?? 0}</div>
          <p className="admin-stat-description">All time log entries</p>
        </div>
        <div className="admin-stat-card blue">
          <div className="admin-stat-header">
            <span className="admin-stat-label">Admin Actions</span>
            <div className="admin-stat-icon blue"><ShieldCheck /></div>
          </div>
          <div className="admin-stat-value blue">{adminCount ?? 0}</div>
          <p className="admin-stat-description">Actions taken by admins</p>
        </div>
        <div className="admin-stat-card green">
          <div className="admin-stat-header">
            <span className="admin-stat-label">Company Actions</span>
            <div className="admin-stat-icon green"><Building2 /></div>
          </div>
          <div className="admin-stat-value">{companyCount ?? 0}</div>
          <p className="admin-stat-description">Actions taken by companies</p>
        </div>
      </div>

      {/* Table Card */}
      <div className="admin-card">

        {/* Tabs */}
        <div style={{ padding: "0 1.5rem", borderBottom: "1px solid var(--admin-gray-200)" }}>
          <div className="admin-tabs" style={{ marginBottom: 0 }}>
            {tabs.map((tab) => (
              <a
                key={tab.key}
                href={buildUrl({ tab: tab.key, page: 1, q: "" })}
                className={`admin-tab ${activeTab === tab.key ? "active" : ""}`}
              >
                {tab.label}
                <span className="admin-tab-count">{tab.count}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Search */}
        <div style={{
          padding: "0.875rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          borderBottom: "1px solid var(--admin-gray-100)",
          flexWrap: "wrap",
        }}>
          <form method="get" style={{ display: "flex", gap: "0.5rem", alignItems: "center", flex: 1, maxWidth: 400 }}>
            <input type="hidden" name="tab" value={activeTab} />
            <input type="hidden" name="page" value="1" />
            <div className="admin-search" style={{ flex: 1 }}>
              <Search className="admin-search-icon" />
              <input
                className="admin-input"
                name="q"
                defaultValue={params.q || ""}
                placeholder="Search by action or entity..."
                style={{ paddingLeft: "2.25rem" }}
              />
            </div>
            <button type="submit" className="admin-btn admin-btn-primary admin-btn-sm">Search</button>
            {params.q && (
              <a href={buildUrl({ q: "", page: 1 })} className="admin-btn admin-btn-outline admin-btn-sm">Clear</a>
            )}
          </form>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <LogsExportButtons tab={activeTab} q={params.q || ""} />
            <div style={{ color: "var(--admin-gray-400)", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
              {safeTotal === 0
                ? "No logs found"
                : `${(safePage - 1) * PER_PAGE + 1}–${Math.min(safePage * PER_PAGE, safeTotal)} of ${safeTotal} entries`}
            </div>
          </div>
        </div>

        {/* Card Header */}
        <div className="admin-card-header" style={{ borderBottom: "1px solid var(--admin-gray-100)" }}>
          <h2 className="admin-card-title">Activity Log</h2>
          <span className="admin-badge gray">{safeTotal} entries</span>
        </div>

        {/* Table */}
        {typedLogs.length === 0 ? (
          <div className="admin-empty" style={{ padding: "4rem 1.5rem" }}>
            <div className="admin-empty-icon"><ScrollText className="w-6 h-6" /></div>
            <div className="admin-empty-title">No logs found</div>
            <div className="admin-empty-text">
              {params.q ? `No results for "${params.q}".` : "No activity has been logged yet."}
            </div>
          </div>
        ) : (
          <>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Type</th>
                    <th>Actor</th>
                    <th>Organization</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {typedLogs.map((log) => {
                    const actorName = log.actor
                      ? `${log.actor.first_name ?? ""} ${log.actor.last_name ?? ""}`.trim() || "Unknown"
                      : "System"

                    const entityDisplay = log.entity_type && log.entity_label
                      ? `${log.entity_type.charAt(0).toUpperCase() + log.entity_type.slice(1)} · ${log.entity_label}`
                      : log.entity_label || log.entity_type || null

                    return (
                      <tr key={log.id}>
                        <td style={{ fontSize: "0.78rem", color: "var(--admin-gray-500)", whiteSpace: "nowrap" }}>
                          {formatTimestamp(log.created_at)}
                        </td>

                        <td>
                          {log.log_type === "admin" ? (
                            <span className="admin-badge coral">Admin</span>
                          ) : (
                            <span className="admin-badge blue">Company</span>
                          )}
                        </td>

                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "0.85rem", color: "var(--admin-gray-700)", fontWeight: 500 }}>
                              {actorName}
                            </span>
                            {log.actor?.role && (
                              <span className="admin-badge gray" style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem" }}>
                                {log.actor.role.replace(/_/g, " ")}
                              </span>
                            )}
                          </div>
                        </td>

                        <td style={{ fontSize: "0.85rem", color: "var(--admin-gray-600)" }}>
                          {log.organization?.name ?? "—"}
                        </td>

                        <td style={{ fontSize: "0.85rem", color: "var(--admin-gray-700)" }}>
                          {ACTION_LABELS[log.action] ?? log.action}
                        </td>

                        <td style={{ fontSize: "0.8rem", color: "var(--admin-gray-500)" }}>
                          {entityDisplay ?? "—"}
                        </td>

                        <td>
                          {log.metadata && Object.keys(log.metadata as object).length > 0 ? (
                            <details className="admin-log-details">
                              <summary>View</summary>
                              <pre className="admin-log-meta-pre">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </details>
                          ) : (
                            <span style={{ color: "var(--admin-gray-300)", fontSize: "0.8rem" }}>—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "1rem 1.5rem",
                borderTop: "1px solid var(--admin-gray-100)",
              }}>
                <span style={{ fontSize: "0.8rem", color: "var(--admin-gray-400)" }}>
                  Page {safePage} of {totalPages}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                  {safePage > 1 ? (
                    <a href={buildUrl({ page: safePage - 1 })} className="admin-btn admin-btn-outline admin-btn-sm">← Prev</a>
                  ) : (
                    <span className="admin-btn admin-btn-outline admin-btn-sm" style={{ opacity: 0.4, pointerEvents: "none" }}>← Prev</span>
                  )}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                    .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...")
                      acc.push(p)
                      return acc
                    }, [])
                    .map((item, idx) =>
                      item === "..." ? (
                        <span key={`e-${idx}`} style={{ padding: "0 0.25rem", color: "var(--admin-gray-400)", fontSize: "0.8rem" }}>…</span>
                      ) : (
                        <a
                          key={item}
                          href={buildUrl({ page: item })}
                          className="admin-btn admin-btn-sm"
                          style={
                            item === safePage
                              ? { background: "var(--admin-coral)", color: "white", minWidth: 34, justifyContent: "center" }
                              : { background: "transparent", border: "1.5px solid var(--admin-gray-200)", color: "var(--admin-gray-600)", minWidth: 34, justifyContent: "center" }
                          }
                        >
                          {item}
                        </a>
                      )
                    )}
                  {safePage < totalPages ? (
                    <a href={buildUrl({ page: safePage + 1 })} className="admin-btn admin-btn-outline admin-btn-sm">Next →</a>
                  ) : (
                    <span className="admin-btn admin-btn-outline admin-btn-sm" style={{ opacity: 0.4, pointerEvents: "none" }}>Next →</span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
