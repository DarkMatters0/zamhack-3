"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Search, X } from "lucide-react"

// CHED-recognized Philippine universities (representative list)
export const PH_UNIVERSITIES = [
  // NCR
  "University of the Philippines Diliman",
  "University of the Philippines Manila",
  "University of the Philippines Los Baños",
  "University of the Philippines Visayas",
  "University of the Philippines Mindanao",
  "De La Salle University",
  "Ateneo de Manila University",
  "University of Santo Tomas",
  "Far Eastern University",
  "Mapúa University",
  "Polytechnic University of the Philippines",
  "University of the East",
  "Adamson University",
  "San Beda University",
  "Letran College",
  "Pamantasan ng Lungsod ng Maynila",
  "National University Philippines",
  "Philippine Normal University",
  "Philippine Women's University",
  "Saint Louis University",
  "University of Asia and the Pacific",
  "Miriam College",
  "Assumption College",
  "College of Saint Benilde",
  "Benilde",
  // Region I - III
  "University of Northern Philippines",
  "Mariano Marcos State University",
  "Don Mariano Marcos Memorial State University",
  "University of the Cordilleras",
  "Baguio Central University",
  "Saint Louis University Baguio",
  "Benguet State University",
  "Nueva Ecija University of Science and Technology",
  "Central Luzon State University",
  "Holy Angel University",
  "Angeles University Foundation",
  "Pampanga State Agricultural University",
  "Tarlac State University",
  "Bataan Peninsula State University",
  // Region IV
  "Cavite State University",
  "Laguna State Polytechnic University",
  "University of the Philippines Los Baños",
  "Batangas State University",
  "Lyceum of the Philippines University",
  "De La Salle University Dasmariñas",
  "Ateneo de Manila University",
  "University of Batangas",
  "Palawan State University",
  "Western Philippines University",
  // Region V
  "Bicol University",
  "Ateneo de Naga University",
  "University of Nueva Caceres",
  "Camarines Sur Polytechnic Colleges",
  // Region VI
  "University of the Philippines Visayas",
  "West Visayas State University",
  "Iloilo Science and Technology University",
  "Central Philippine University",
  "University of San Agustin",
  "John B. Lacson Foundation Maritime University",
  "Capiz State University",
  "Aklan State University",
  // Region VII
  "University of the Philippines Cebu",
  "University of Cebu",
  "University of San Carlos",
  "Cebu Institute of Technology University",
  "Cebu Technological University",
  "University of San Jose-Recoletos",
  "Southwestern University PHINMA",
  "Silliman University",
  "Saint Paul University Dumaguete",
  "Negros Oriental State University",
  "Bohol Island State University",
  // Region VIII
  "Eastern Visayas State University",
  "Leyte Normal University",
  "Naval State University",
  "University of Eastern Philippines",
  // Region IX
  "Zamboanga State College of Marine Sciences and Technology",
  "Western Mindanao State University",
  "Ateneo de Zamboanga University",
  // Region X
  "Mindanao State University Iligan",
  "Central Mindanao University",
  "Xavier University Ateneo de Cagayan",
  "Capitol University",
  "Liceo de Cagayan University",
  // Region XI
  "University of the Philippines Mindanao",
  "Davao del Norte State College",
  "Holy Cross of Davao College",
  "Ateneo de Davao University",
  "University of Southeastern Philippines",
  "University of Mindanao",
  "Southern Philippines Medical Center College of Medicine",
  // Region XII
  "Notre Dame of Marbel University",
  "Notre Dame University Cotabato",
  "Mindanao State University General Santos",
  "Central Mindanao University",
  "Sultan Kudarat State University",
  // CARAGA
  "Caraga State University",
  "Agusan del Sur State College of Agriculture and Technology",
  // ARMM/BARMM
  "Mindanao State University Marawi",
  "Lanao del Norte Agricultural College",
  // Other notable
  "Mapúa Malayan Colleges Mindanao",
  "AMACC",
  "AMA Computer University",
  "STI College",
  "Systems Technology Institute",
  "Informatics College",
  "Philippine Science High School",
  "Other",
].filter((v, i, arr) => arr.indexOf(v) === i)
.sort((a, b) => {
  if (a === "Other") return 1
  if (b === "Other") return -1
  return a.localeCompare(b)
})

interface UniversitySelectProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  error?: string
  placeholder?: string
}

export function UniversitySelect({
  value,
  onChange,
  disabled = false,
  error,
  placeholder = "Select your university",
}: UniversitySelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [showOther, setShowOther] = useState(false)
  const [otherValue, setOtherValue] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Determine if current value is a "custom" (not in list) value
  const isCustomValue = value && !PH_UNIVERSITIES.includes(value) && value !== "Other"

  // On mount, if value is custom, show the other input
  useEffect(() => {
    if (isCustomValue) {
      setShowOther(true)
      setOtherValue(value)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch("")
      }
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  // Focus search when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50)
  }, [open])

  const filtered = PH_UNIVERSITIES.filter((u) =>
    u.toLowerCase().includes(search.toLowerCase())
  )

  const displayValue = showOther
    ? otherValue || ""
    : value || ""

  const handleSelect = (uni: string) => {
    if (uni === "Other") {
      setShowOther(true)
      setOtherValue("")
      onChange("")
    } else {
      setShowOther(false)
      setOtherValue("")
      onChange(uni)
    }
    setOpen(false)
    setSearch("")
  }

  const handleOtherChange = (val: string) => {
    setOtherValue(val)
    onChange(val)
  }

  const handleClear = () => {
    setShowOther(false)
    setOtherValue("")
    onChange("")
  }

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
          padding: "0.5rem 0.75rem",
          height: 40,
          borderRadius: 8,
          border: `1px solid ${error ? "#ef4444" : open ? "#ff9b87" : "#e5e7eb"}`,
          background: disabled ? "#f9fafb" : "#fff",
          cursor: disabled ? "not-allowed" : "pointer",
          fontSize: "0.875rem",
          color: displayValue ? "#1f2937" : "#9ca3af",
          outline: "none",
          boxShadow: open ? "0 0 0 3px rgba(255,155,135,0.15)" : "none",
          transition: "border-color 0.15s, box-shadow 0.15s",
          textAlign: "left",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          {showOther
            ? otherValue || "Enter your university..."
            : displayValue || placeholder}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {(value || showOther) && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); handleClear() }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); handleClear() } }}
              style={{ color: "#9ca3af", display: "flex", cursor: "pointer" }}
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown
            size={16}
            style={{
              color: "#9ca3af",
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform 0.2s",
            }}
          />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0,
          right: 0,
          zIndex: 50,
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
          overflow: "hidden",
        }}>
          {/* Search box */}
          <div style={{ padding: "0.5rem", borderBottom: "1px solid #f3f4f6", position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search universities..."
              style={{
                width: "100%",
                padding: "0.4rem 0.5rem 0.4rem 2rem",
                fontSize: "0.8125rem",
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                outline: "none",
                color: "#1f2937",
              }}
            />
          </div>

          {/* List */}
          <div style={{ maxHeight: 240, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "1rem", textAlign: "center", color: "#9ca3af", fontSize: "0.8125rem" }}>
                No results. Select "Other" to type your school.
              </div>
            ) : (
              filtered.map((uni) => {
                const isSelected = uni === value || (uni === "Other" && showOther)
                return (
                  <button
                    key={uni}
                    type="button"
                    onClick={() => handleSelect(uni)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "0.5rem 0.875rem",
                      fontSize: "0.8125rem",
                      background: isSelected ? "rgba(255,155,135,0.1)" : "transparent",
                      color: isSelected ? "#e8836f" : "#374151",
                      fontWeight: isSelected ? 600 : 400,
                      border: "none",
                      cursor: "pointer",
                      borderLeft: isSelected ? "2px solid #ff9b87" : "2px solid transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "#f9fafb"
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "transparent"
                    }}
                  >
                    {uni}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* "Other" free-text input */}
      {showOther && (
        <input
          type="text"
          value={otherValue}
          onChange={(e) => handleOtherChange(e.target.value)}
          placeholder="Type your university name..."
          disabled={disabled}
          autoFocus
          style={{
            marginTop: 6,
            width: "100%",
            padding: "0.5rem 0.75rem",
            height: 40,
            borderRadius: 8,
            border: `1px solid ${error ? "#ef4444" : "#e5e7eb"}`,
            fontSize: "0.875rem",
            outline: "none",
            color: "#1f2937",
            boxSizing: "border-box",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#ff9b87")}
          onBlur={(e) => (e.target.style.borderColor = error ? "#ef4444" : "#e5e7eb")}
        />
      )}

      {error && (
        <p style={{ fontSize: "0.75rem", color: "#ef4444", marginTop: 4 }}>{error}</p>
      )}
    </div>
  )
}