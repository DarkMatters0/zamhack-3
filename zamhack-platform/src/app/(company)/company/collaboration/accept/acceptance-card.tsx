"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Handshake, CheckCircle2, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { acceptCollaborationInvite } from "@/app/(company)/company/challenges/collaboration-actions"

interface Props {
  token: string
  challengeTitle: string
  ownerOrgName: string
  collaborationId: string
  challengeId: string
}

type State = "idle" | "loading" | "success" | "error"

function mapErrorMessage(raw: string): string {
  if (raw.includes("already been used") || raw.includes("no longer valid")) {
    return "This invite has already been accepted or is no longer valid."
  }
  if (raw.includes("expired")) {
    return "This invite link has expired. Ask the challenge owner to refresh it."
  }
  if (raw.includes("different organization")) {
    return "This invite was not sent to your organization."
  }
  return raw
}

const BULLET_POINTS = [
  "Co-branded challenge — your organization will be listed as a collaborator",
  "Propose edits — you can suggest changes to the challenge for the owner to review",
  "Read access — you can view all participants and submissions",
]

export function AcceptanceCard({
  token,
  challengeTitle,
  ownerOrgName,
  collaborationId: _collaborationId,
  challengeId,
}: Props) {
  const router = useRouter()
  const [state, setState] = useState<State>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleAccept() {
    setState("loading")
    setErrorMessage(null)
    try {
      await acceptCollaborationInvite(token)
      setState("success")
      setTimeout(() => {
        router.push(`/company/challenges/${challengeId}`)
      }, 2000)
    } catch (err: unknown) {
      setState("error")
      const msg = err instanceof Error ? err.message : "Something went wrong."
      setErrorMessage(mapErrorMessage(msg))
    }
  }

  function handleDecline() {
    router.push("/company/dashboard")
  }

  return (
    <Card className="cp-card">
      <CardContent className="p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div
            style={{
              width: "4rem",
              height: "4rem",
              borderRadius: "50%",
              background: "var(--cp-coral-muted, rgba(255,107,74,0.1))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Handshake
              style={{ width: "2rem", height: "2rem", color: "var(--cp-coral-dark, #E04F28)" }}
            />
          </div>
          <h1
            style={{
              fontWeight: 800,
              fontSize: "1.375rem",
              color: "var(--cp-navy, #0F1D40)",
              letterSpacing: "-0.02em",
            }}
          >
            You&apos;ve been invited to collaborate
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "var(--cp-text-muted, #6B7280)" }}>
            {ownerOrgName} has invited your organization to collaborate on:
          </p>
          <div
            style={{
              background: "var(--cp-surface, #F9FAFB)",
              border: "1px solid var(--cp-border, #E5E7EB)",
              borderRadius: "var(--cp-radius-md, 12px)",
              padding: "0.75rem 1.25rem",
              width: "100%",
            }}
          >
            <p
              style={{
                fontWeight: 700,
                fontSize: "1rem",
                color: "var(--cp-navy, #0F1D40)",
              }}
            >
              {challengeTitle}
            </p>
          </div>
        </div>

        {/* What collaboration means */}
        <div
          style={{
            background: "var(--cp-surface, #F9FAFB)",
            borderRadius: "var(--cp-radius-md, 12px)",
            padding: "1rem 1.25rem",
          }}
        >
          <p
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "var(--cp-navy, #0F1D40)",
              marginBottom: "0.625rem",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            What this means
          </p>
          <ul style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {BULLET_POINTS.map((point) => (
              <li
                key={point}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.5rem",
                  fontSize: "0.875rem",
                  color: "var(--cp-text-secondary, #374151)",
                }}
              >
                <span
                  style={{
                    color: "var(--cp-coral-dark, #E04F28)",
                    fontWeight: 700,
                    flexShrink: 0,
                    marginTop: "0.0625rem",
                  }}
                >
                  •
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* Success state */}
        {state === "success" && (
          <div className="flex flex-col items-center text-center space-y-2 py-4">
            <CheckCircle2 style={{ width: "2.5rem", height: "2.5rem", color: "#16a34a" }} />
            <p
              style={{
                fontWeight: 700,
                fontSize: "1.0625rem",
                color: "var(--cp-navy, #0F1D40)",
              }}
            >
              Collaboration accepted!
            </p>
            <p style={{ fontSize: "0.875rem", color: "var(--cp-text-muted, #6B7280)" }}>
              Redirecting you to the challenge…
            </p>
          </div>
        )}

        {/* Error message */}
        {state === "error" && errorMessage && (
          <div
            style={{
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: "var(--cp-radius-md, 12px)",
              padding: "0.75rem 1rem",
            }}
          >
            <p style={{ fontSize: "0.875rem", color: "#B91C1C" }}>{errorMessage}</p>
          </div>
        )}

        {/* Action buttons — hidden after success */}
        {state !== "success" && (
          <div className="flex gap-3">
            <Button
              className="flex-1"
              style={{
                background:
                  "var(--cp-grad-coral, linear-gradient(135deg, #FF6B4A 0%, #E04F28 100%))",
                color: "white",
                fontWeight: 700,
                border: "none",
              }}
              disabled={state === "loading"}
              onClick={handleAccept}
            >
              {state === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Accepting…
                </>
              ) : (
                "Accept Invitation"
              )}
            </Button>
            <Button
              className="flex-1"
              variant="outline"
              disabled={state === "loading"}
              onClick={handleDecline}
            >
              Decline
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
