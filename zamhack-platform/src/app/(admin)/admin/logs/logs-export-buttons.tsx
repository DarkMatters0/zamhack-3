"use client"

import { useState } from "react"
import { Download, FileText } from "lucide-react"

const ACTION_LABELS: Record<string, string> = {
  "org.approved":          "Approved organization",
  "org.rejected":          "Rejected organization",
  "org.profile_updated":   "Updated org profile",
  "challenge.approved":    "Approved challenge",
  "challenge.rejected":    "Rejected challenge",
  "challenge.created":     "Created challenge",
  "challenge.edited":      "Edited challenge",
  "challenge.submitted":   "Submitted for review",
  "challenge.cancelled":   "Cancelled challenge",
  "pending_edit.approved": "Approved pending edit",
  "pending_edit.rejected": "Rejected pending edit",
  "user.suspended":        "Suspended user",
  "user.unsuspended":      "Unsuspended user",
  "user.role_changed":     "Changed user role",
  "settings.updated":      "Updated platform settings",
  "evaluator.assigned":    "Assigned evaluator",
  "evaluator.removed":     "Removed evaluator",
  "member.invited":        "Invited member",
  "member.removed":        "Removed member",
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

interface ExportLog {
  id: string
  log_type: string
  action: string
  entity_type: string | null
  entity_label: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  actor: { first_name: string | null; last_name: string | null; role: string | null } | null
  organization: { name: string | null } | null
}

interface Props {
  tab: string
  q: string
}

export function LogsExportButtons({ tab, q }: Props) {
  const [loadingCsv, setLoadingCsv] = useState(false)
  const [loadingPdf, setLoadingPdf] = useState(false)

  const fetchLogs = async (): Promise<ExportLog[]> => {
    const params = new URLSearchParams({ tab, q })
    const res = await fetch(`/admin/logs/export?${params.toString()}`)
    if (!res.ok) throw new Error("Failed to fetch export data")
    const json = await res.json()
    return json.logs as ExportLog[]
  }

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts)
    return d.toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
    })
  }

  const getActorName = (log: ExportLog) =>
    log.actor
      ? `${log.actor.first_name ?? ""} ${log.actor.last_name ?? ""}`.trim() || "Unknown"
      : "System"

  const handleCsvExport = async () => {
    setLoadingCsv(true)
    try {
      const logs = await fetchLogs()

      const headers = ["Timestamp", "Type", "Actor", "Role", "Organization", "Action", "Entity Type", "Entity", "Metadata"]
      const rows = logs.map((log) => [
        formatTimestamp(log.created_at),
        log.log_type,
        getActorName(log),
        log.actor?.role ?? "",
        log.organization?.name ?? "",
        ACTION_LABELS[log.action] ?? log.action,
        log.entity_type ?? "",
        log.entity_label ?? "",
        log.metadata ? JSON.stringify(log.metadata) : "",
      ])

      const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`
      const csvContent = [
        headers.map(escape).join(","),
        ...rows.map((r) => r.map(escape).join(",")),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `zamhack-activity-logs-${tab}-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("CSV export failed:", err)
      alert("Export failed. Please try again.")
    } finally {
      setLoadingCsv(false)
    }
  }

  const handlePdfExport = async () => {
    setLoadingPdf(true)
    try {
      const logs = await fetchLogs()

      const { default: jsPDF } = await import("jspdf")
      const { default: autoTable } = await import("jspdf-autotable")

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })

      doc.setFontSize(16)
      doc.setTextColor(255, 107, 122)
      doc.text("ZamHack — Activity Logs", 14, 16)

      doc.setFontSize(9)
      doc.setTextColor(107, 114, 128)
      const tabLabel = tab === "all" ? "All Logs" : tab === "admin" ? "Admin Logs" : "Company Logs"
      doc.text(
        `Export: ${tabLabel}${q ? `  ·  Search: "${q}"` : ""}  ·  Generated: ${new Date().toLocaleString()}`,
        14, 22
      )

      autoTable(doc, {
        startY: 28,
        head: [["Timestamp", "Type", "Actor", "Organization", "Action", "Entity", "Metadata"]],
        body: logs.map((log) => [
          formatTimestamp(log.created_at),
          log.log_type.toUpperCase(),
          `${getActorName(log)}${log.actor?.role ? ` (${log.actor.role.replace(/_/g, " ")})` : ""}`,
          log.organization?.name ?? "—",
          ACTION_LABELS[log.action] ?? log.action,
          log.entity_label ? `${log.entity_type ?? ""} · ${log.entity_label}` : (log.entity_type ?? "—"),
          log.metadata ? JSON.stringify(log.metadata).slice(0, 80) : "—",
        ]),
        styles: {
          fontSize: 7,
          cellPadding: 2,
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [255, 107, 122],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 7.5,
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251],
        },
        columnStyles: {
          0: { cellWidth: 32 },
          1: { cellWidth: 18 },
          2: { cellWidth: 36 },
          3: { cellWidth: 34 },
          4: { cellWidth: 38 },
          5: { cellWidth: 40 },
          6: { cellWidth: "auto" },
        },
        margin: { left: 14, right: 14 },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pageCount = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(7)
        doc.setTextColor(156, 163, 175)
        doc.text(
          `Page ${i} of ${pageCount}`,
          doc.internal.pageSize.getWidth() - 14,
          doc.internal.pageSize.getHeight() - 8,
          { align: "right" }
        )
      }

      doc.save(`zamhack-activity-logs-${tab}-${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (err) {
      console.error("PDF export failed:", err)
      alert("PDF export failed. Please try again.")
    } finally {
      setLoadingPdf(false)
    }
  }

  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      <button
        onClick={handleCsvExport}
        disabled={loadingCsv || loadingPdf}
        className="admin-btn admin-btn-outline admin-btn-sm"
        style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}
      >
        <Download style={{ width: 13, height: 13 }} />
        {loadingCsv ? "Exporting…" : "CSV"}
      </button>

      <button
        onClick={handlePdfExport}
        disabled={loadingCsv || loadingPdf}
        className="admin-btn admin-btn-outline admin-btn-sm"
        style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}
      >
        <FileText style={{ width: 13, height: 13 }} />
        {loadingPdf ? "Exporting…" : "PDF"}
      </button>
    </div>
  )
}
