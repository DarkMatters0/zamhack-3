"use client"

import { useState, useTransition } from "react"
import {
  addUniversity,
  updateUniversityName,
  updateUniversityRegion,
  toggleUniversityActive,
  approveUniversitySuggestion,
  deleteUniversity,
  type University,
} from "@/app/admin/university-actions"
import { CheckCircle, XCircle, Pencil, X, Check, Plus, Search } from "lucide-react"
import { GraduationCap } from "lucide-react"

const REGIONS = [
  "NCR",
  "CAR",
  "Region I",
  "Region II",
  "Region III",
  "Region IV-A",
  "Region IV-B",
  "Region V",
  "Region VI",
  "Region VII",
  "Region VIII",
  "Region IX",
  "Region X",
  "Region XI",
  "Region XII",
  "Region XIII",
  "BARMM",
]

type SortKey = "name-asc" | "name-desc" | "status-active" | "status-inactive" | "region-asc"

// ── Universities Table (search + sort + rows) ────────────────────────────────

export function UniversitiesTable({ universities }: { universities: University[] }) {
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<SortKey>("name-asc")

  const filtered = universities.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  )

  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case "name-asc":       return a.name.localeCompare(b.name)
      case "name-desc":      return b.name.localeCompare(a.name)
      case "status-active":  return (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0)
      case "status-inactive":return (a.is_active ? 1 : 0) - (b.is_active ? 1 : 0)
      case "region-asc":     return (a.region ?? "￿").localeCompare(b.region ?? "￿")
    }
  })

  if (universities.length === 0) {
    return (
      <div className="admin-empty" style={{ padding: "4rem 1.5rem" }}>
        <div className="admin-empty-icon"><GraduationCap className="w-6 h-6" /></div>
        <div className="admin-empty-title">No universities yet</div>
        <div className="admin-empty-text">Add a university above to get started.</div>
      </div>
    )
  }

  return (
    <>
      {/* Search + Sort bar */}
      <div style={{
        padding: "0.75rem 1.5rem",
        borderBottom: "1px solid var(--admin-gray-100)",
        display: "flex",
        gap: "0.625rem",
        alignItems: "center",
        flexWrap: "wrap",
      }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180, maxWidth: 320 }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: "0.625rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--admin-gray-400)",
              pointerEvents: "none",
            }}
          />
          <input
            className="admin-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search universities..."
            style={{ paddingLeft: "2rem", height: 34 }}
          />
        </div>

        <select
          className="admin-input"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          style={{ height: 34, fontSize: "0.8125rem", minWidth: 160 }}
        >
          <option value="name-asc">Name A → Z</option>
          <option value="name-desc">Name Z → A</option>
          <option value="status-active">Active first</option>
          <option value="status-inactive">Inactive first</option>
          <option value="region-asc">Region A → Z</option>
        </select>

        {search && (
          <span style={{ fontSize: "0.75rem", color: "var(--admin-gray-400)" }}>
            {sorted.length} of {universities.length}
          </span>
        )}
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Region</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Added</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((uni) => (
              <tr key={uni.id} style={{ opacity: uni.is_active ? 1 : 0.55 }}>
                <td><UniversityNameCell university={uni} /></td>
                <td><UniversityRegionCell university={uni} /></td>
                <td><ActiveToggleCell university={uni} /></td>
                <td style={{ textAlign: "right", fontSize: "0.75rem", color: "var(--admin-gray-400)" }}>
                  {new Date(uni.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ── Add University Row ──────────────────────────────────────────────────────

export function AddUniversityRow() {
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const handleAdd = () => {
    setError(null)
    startTransition(async () => {
      const result = await addUniversity(name)
      if (result.error) {
        setError(result.error)
      } else {
        setName("")
      }
    })
  }

  return (
    <div style={{ padding: "0.875rem 1.5rem", borderBottom: "1px solid var(--admin-gray-100)" }}>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", maxWidth: 480 }}>
        <input
          className="admin-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New university name..."
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd() }}
          style={{ flex: 1 }}
          disabled={pending}
        />
        <button
          className="admin-btn admin-btn-primary admin-btn-sm"
          onClick={handleAdd}
          disabled={pending || !name.trim()}
          style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
        >
          <Plus size={14} />
          Add
        </button>
      </div>
      {error && (
        <p style={{ fontSize: "0.75rem", color: "var(--admin-red, #ef4444)", marginTop: "0.375rem" }}>
          {error}
        </p>
      )}
    </div>
  )
}

// ── University Name Edit Cell ───────────────────────────────────────────────

export function UniversityNameCell({ university }: { university: University }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(university.name)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const save = () => {
    setError(null)
    startTransition(async () => {
      const result = await updateUniversityName(university.id, value)
      if (result.error) {
        setError(result.error)
      } else {
        setEditing(false)
      }
    })
  }

  const cancel = () => {
    setValue(university.name)
    setError(null)
    setEditing(false)
  }

  if (!editing) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: "0.875rem", color: "var(--admin-gray-800)" }}>{university.name}</span>
        <button
          className="admin-btn admin-btn-sm"
          onClick={() => setEditing(true)}
          style={{
            padding: "0.2rem 0.4rem",
            background: "transparent",
            border: "none",
            color: "var(--admin-gray-400)",
            cursor: "pointer",
          }}
          title="Rename"
        >
          <Pencil size={13} />
        </button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
        <input
          className="admin-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save()
            if (e.key === "Escape") cancel()
          }}
          autoFocus
          disabled={pending}
          style={{ width: 280, height: 32, fontSize: "0.8125rem" }}
        />
        <button
          className="admin-btn admin-btn-sm"
          onClick={save}
          disabled={pending || !value.trim()}
          style={{ padding: "0.25rem 0.5rem", background: "var(--admin-coral)", color: "#fff", border: "none" }}
          title="Save"
        >
          <Check size={13} />
        </button>
        <button
          className="admin-btn admin-btn-sm"
          onClick={cancel}
          disabled={pending}
          style={{ padding: "0.25rem 0.5rem", background: "transparent", border: "1.5px solid var(--admin-gray-200)", color: "var(--admin-gray-600)" }}
          title="Cancel"
        >
          <X size={13} />
        </button>
      </div>
      {error && (
        <p style={{ fontSize: "0.7rem", color: "var(--admin-red, #ef4444)", marginTop: "0.25rem" }}>
          {error}
        </p>
      )}
    </div>
  )
}

// ── University Region Cell ──────────────────────────────────────────────────

export function UniversityRegionCell({ university }: { university: University }) {
  const [region, setRegion] = useState(university.region ?? "")
  const [pending, startTransition] = useTransition()

  const handleChange = (value: string) => {
    setRegion(value)
    startTransition(async () => {
      await updateUniversityRegion(university.id, value || null)
    })
  }

  return (
    <select
      className="admin-input"
      value={region}
      onChange={(e) => handleChange(e.target.value)}
      disabled={pending}
      style={{
        fontSize: "0.8125rem",
        height: 30,
        padding: "0 0.5rem",
        minWidth: 110,
        maxWidth: 150,
        opacity: pending ? 0.6 : 1,
        color: region ? "var(--admin-gray-800)" : "var(--admin-gray-400)",
      }}
    >
      <option value="">—</option>
      {REGIONS.map((r) => (
        <option key={r} value={r}>{r}</option>
      ))}
    </select>
  )
}

// ── Active Toggle Cell ──────────────────────────────────────────────────────

export function ActiveToggleCell({ university }: { university: University }) {
  const [active, setActive] = useState(university.is_active)
  const [pending, startTransition] = useTransition()

  const toggle = () => {
    const next = !active
    setActive(next)
    startTransition(async () => {
      const result = await toggleUniversityActive(university.id, next)
      if (result.error) setActive(!next)
    })
  }

  return active ? (
    <button
      onClick={toggle}
      disabled={pending}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        padding: "0.3rem 0.75rem",
        borderRadius: 6,
        border: "1.5px solid #ef4444",
        background: "transparent",
        color: "#ef4444",
        fontSize: "0.75rem",
        fontWeight: 600,
        cursor: pending ? "not-allowed" : "pointer",
        opacity: pending ? 0.6 : 1,
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
      title="Click to deactivate"
    >
      <XCircle size={13} />
      Deactivate
    </button>
  ) : (
    <button
      onClick={toggle}
      disabled={pending}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        padding: "0.3rem 0.75rem",
        borderRadius: 6,
        border: "none",
        background: "#16a34a",
        color: "#fff",
        fontSize: "0.75rem",
        fontWeight: 600,
        cursor: pending ? "not-allowed" : "pointer",
        opacity: pending ? 0.6 : 1,
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
      title="Click to activate"
    >
      <CheckCircle size={13} />
      Activate
    </button>
  )
}

// ── Suggestion Actions Cell ─────────────────────────────────────────────────

export function SuggestionActions({ university }: { university: University }) {
  const [pending, startTransition] = useTransition()

  const approve = () => {
    startTransition(async () => {
      await approveUniversitySuggestion(university.id)
    })
  }

  const dismiss = () => {
    startTransition(async () => {
      await deleteUniversity(university.id)
    })
  }

  return (
    <div style={{ display: "flex", gap: "0.375rem" }}>
      <button
        className="admin-btn admin-btn-sm"
        onClick={approve}
        disabled={pending}
        style={{
          background: "var(--admin-coral)",
          color: "#fff",
          border: "none",
          display: "flex",
          alignItems: "center",
          gap: "0.25rem",
        }}
      >
        <CheckCircle size={13} />
        Add to List
      </button>
      <button
        className="admin-btn admin-btn-sm admin-btn-outline"
        onClick={dismiss}
        disabled={pending}
        style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
      >
        <XCircle size={13} />
        Dismiss
      </button>
    </div>
  )
}
