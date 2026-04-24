import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { getUniversities } from "@/app/admin/university-actions"
import {
  AddUniversityRow,
  UniversitiesTable,
  SuggestionActions,
} from "./universities-client"
import { GraduationCap, Lightbulb } from "lucide-react"
import "@/app/(admin)/admin.css"

export default async function AdminUniversitiesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") redirect("/dashboard")

  const universities = await getUniversities()

  const suggestions = universities.filter((u) => u.is_suggested)
  const established = universities.filter((u) => !u.is_suggested)

  const activeCount = established.filter((u) => u.is_active).length
  const inactiveCount = established.filter((u) => !u.is_active).length

  return (
    <div className="space-y-6" data-layout="admin">

      {/* Page Header */}
      <div className="admin-page-header">
        <h1 className="admin-page-title">
          University <span>Management</span>
        </h1>
        <p className="admin-page-subtitle">
          Manage the list of universities available to students on the platform.
        </p>
      </div>

      {/* Stats Row */}
      <div className="admin-stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="admin-stat-card coral">
          <div className="admin-stat-header">
            <span className="admin-stat-label">Total Universities</span>
            <div className="admin-stat-icon coral"><GraduationCap /></div>
          </div>
          <div className="admin-stat-value coral">{established.length}</div>
          <p className="admin-stat-description">In the platform list</p>
        </div>
        <div className="admin-stat-card green">
          <div className="admin-stat-header">
            <span className="admin-stat-label">Active</span>
            <div className="admin-stat-icon green"><GraduationCap /></div>
          </div>
          <div className="admin-stat-value green">{activeCount}</div>
          <p className="admin-stat-description">Shown to students</p>
        </div>
        <div className="admin-stat-card yellow">
          <div className="admin-stat-header">
            <span className="admin-stat-label">Pending Suggestions</span>
            <div className="admin-stat-icon yellow"><Lightbulb /></div>
          </div>
          <div className="admin-stat-value">{suggestions.length}</div>
          <p className="admin-stat-description">Awaiting review</p>
        </div>
      </div>

      {/* Pending Suggestions */}
      {suggestions.length > 0 && (
        <div className="admin-card" style={{ borderLeft: "3px solid var(--admin-coral)" }}>
          <div style={{
            padding: "1rem 1.5rem",
            borderBottom: "1px solid var(--admin-gray-100)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}>
            <Lightbulb size={16} style={{ color: "var(--admin-coral)" }} />
            <h2 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--admin-gray-800)", margin: 0 }}>
              Pending Suggestions
            </h2>
            <span className="admin-badge yellow" style={{ marginLeft: "0.25rem" }}>
              {suggestions.length}
            </span>
          </div>

          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>University Name</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map((uni) => (
                  <tr key={uni.id}>
                    <td style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--admin-gray-800)" }}>
                      {uni.name}
                    </td>
                    <td>
                      <span className="admin-badge yellow">
                        <span className="admin-badge-dot" />
                        Suggested
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <SuggestionActions university={uni} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* University List */}
      <div className="admin-card">
        <div style={{
          padding: "1rem 1.5rem",
          borderBottom: "1px solid var(--admin-gray-100)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <GraduationCap size={16} style={{ color: "var(--admin-coral)" }} />
            <h2 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--admin-gray-800)", margin: 0 }}>
              University List
            </h2>
            <span
              className="admin-badge gray"
              style={{ marginLeft: "0.25rem" }}
            >
              {established.length} total · {inactiveCount} inactive
            </span>
          </div>
        </div>

        {/* Add row */}
        <AddUniversityRow />

        {/* Search / sort / table — client-rendered */}
        <UniversitiesTable universities={established} />
      </div>
    </div>
  )
}
