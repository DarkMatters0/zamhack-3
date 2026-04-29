"use client"

import { useRouter } from "next/navigation"
import { AlertCircle, LinkIcon, SearchX, CheckCircle2, Clock, ShieldAlert } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Props {
  reason: string
}

type Config = {
  icon: React.ReactNode
  iconBg: string
  title: string
  message: string
}

const ICON_STYLE = { width: "2rem", height: "2rem" }

function getConfig(reason: string): Config {
  switch (reason) {
    case "missing_token":
      return {
        icon: <LinkIcon style={{ ...ICON_STYLE, color: "var(--cp-coral-dark, #E04F28)" }} />,
        iconBg: "rgba(255,107,74,0.1)",
        title: "Invalid Invite Link",
        message:
          "This link is missing required information. Please use the full invite link provided by the challenge owner.",
      }
    case "not_found":
      return {
        icon: <SearchX style={{ ...ICON_STYLE, color: "var(--cp-coral-dark, #E04F28)" }} />,
        iconBg: "rgba(255,107,74,0.1)",
        title: "Invite Not Found",
        message:
          "This invite link is not valid. It may have been cancelled by the challenge owner or the admin.",
      }
    case "already_used":
      return {
        icon: <CheckCircle2 style={{ ...ICON_STYLE, color: "#16a34a" }} />,
        iconBg: "rgba(22,163,74,0.1)",
        title: "Invite Already Used",
        message:
          "This invite has already been accepted. If you are the collaborator, visit your company dashboard to find the challenge.",
      }
    case "expired":
      return {
        icon: <Clock style={{ ...ICON_STYLE, color: "#D97706" }} />,
        iconBg: "rgba(217,119,6,0.1)",
        title: "Invite Link Expired",
        message:
          "This invite link has expired (links are valid for 7 days). Please ask the challenge owner to refresh the invite link.",
      }
    case "wrong_organization":
      return {
        icon: <ShieldAlert style={{ ...ICON_STYLE, color: "#B91C1C" }} />,
        iconBg: "rgba(185,28,28,0.1)",
        title: "Wrong Organization",
        message:
          "This invite was not sent to your organization. Please make sure you are logged in with the correct account.",
      }
    default:
      return {
        icon: <AlertCircle style={{ ...ICON_STYLE, color: "var(--cp-coral-dark, #E04F28)" }} />,
        iconBg: "rgba(255,107,74,0.1)",
        title: "Something Went Wrong",
        message: "This invite link could not be validated. Please contact the challenge owner.",
      }
  }
}

export function InvalidInvite({ reason }: Props) {
  const router = useRouter()
  const { icon, iconBg, title, message } = getConfig(reason)

  return (
    <Card className="cp-card">
      <CardContent className="p-8 space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <div
            style={{
              width: "4rem",
              height: "4rem",
              borderRadius: "50%",
              background: iconBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </div>
          <h1
            style={{
              fontWeight: 800,
              fontSize: "1.375rem",
              color: "var(--cp-navy, #0F1D40)",
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontSize: "0.9375rem",
              color: "var(--cp-text-muted, #6B7280)",
              lineHeight: 1.6,
            }}
          >
            {message}
          </p>
        </div>

        <Button
          className="w-full"
          style={{
            background:
              "var(--cp-grad-coral, linear-gradient(135deg, #FF6B4A 0%, #E04F28 100%))",
            color: "white",
            fontWeight: 700,
            border: "none",
          }}
          onClick={() => router.push("/company/dashboard")}
        >
          Go to Dashboard
        </Button>
      </CardContent>
    </Card>
  )
}
