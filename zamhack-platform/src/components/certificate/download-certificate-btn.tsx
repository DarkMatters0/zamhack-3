"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import CompletionCertificate from "@/components/certificate/certificate-template"
import WinnerCertificate from "@/components/certificate/winner-certificate-template"

// ── Types ──────────────────────────────────────────────────────────────────

type CompletionProps = {
  type: "completion"
  studentName: string
  challengeTitle: string
  organizationName: string
  completionDate: string
  totalScore?: number | null
}

type WinnerProps = {
  type: "winner"
  studentName: string
  challengeTitle: string
  organizationName: string
  rank: 1 | 2 | 3
  score?: number | null
  awardDate: string
}

type Props = CompletionProps | WinnerProps

// ── captureInIframe ─────────────────────────────────────────────────────────
// Renders the certificate in an isolated iframe so shadcn's oklch/lab CSS
// variables don't bleed in and break html2canvas.
async function captureInIframe(node: HTMLElement): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe")
    iframe.style.cssText =
      "position:fixed;top:-9999px;left:-9999px;width:1056px;height:748px;border:none;visibility:hidden;"
    document.body.appendChild(iframe)

    iframe.onload = async () => {
      try {
        const doc = iframe.contentDocument!
        doc.head.innerHTML = `<style>
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #ffffff; font-family: Georgia, serif; }
        </style>`
        doc.body.style.cssText = "background:#fff;margin:0;padding:0;"
        doc.body.appendChild(node.cloneNode(true))

        await new Promise((r) => setTimeout(r, 150))

        const html2canvas = (await import("html2canvas")).default
        const canvas = await html2canvas(doc.body.firstChild as HTMLElement, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          windowWidth: 1056,
          windowHeight: 748,
        })
        resolve(canvas)
      } catch (err) {
        reject(err)
      } finally {
        document.body.removeChild(iframe)
      }
    }

    iframe.src = "about:blank"
  })
}

// ── Component ───────────────────────────────────────────────────────────────

export default function DownloadCertificateButton(props: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  // Use mounted state instead of typeof document — prevents hydration mismatch
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const handleDownload = useCallback(async () => {
    if (!containerRef.current) return
    setLoading(true)

    try {
      const jsPDF = (await import("jspdf")).default
      const canvas = await captureInIframe(containerRef.current)
      const imgData = canvas.toDataURL("image/png")

      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
      pdf.addImage(imgData, "PNG", 0, 0, 297, 210)

      const safeName = props.studentName.replace(/\s+/g, "_")
      const safeChallenge = props.challengeTitle.replace(/\s+/g, "_").slice(0, 30)
      const prefix =
        props.type === "winner"
          ? `Winner_${["1st", "2nd", "3rd"][props.rank - 1]}`
          : "Certificate"
      pdf.save(`ZamHack_${prefix}_${safeName}_${safeChallenge}.pdf`)
    } catch (err) {
      console.error("Certificate generation failed:", err)
    } finally {
      setLoading(false)
    }
  }, [props])

  const buttonLabel =
    props.type === "winner"
      ? `Download ${["1st", "2nd", "3rd"][props.rank - 1]} Place Certificate`
      : "Download Certificate"

  const buttonStyle =
    props.type === "winner"
      ? props.rank === 1
        ? "bg-amber-500 hover:bg-amber-600 text-white"
        : props.rank === 2
        ? "bg-slate-500 hover:bg-slate-600 text-white"
        : "bg-orange-700 hover:bg-orange-800 text-white"
      : "bg-[#FF9B87] hover:bg-[#E8836F] text-white"

  return (
    <>
      {/* Hidden certificate node — only rendered after mount to avoid hydration mismatch */}
      {mounted &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: "-9999px",
              left: "-9999px",
              zIndex: -1,
              pointerEvents: "none",
            }}
          >
            <div ref={containerRef}>
              {props.type === "completion" ? (
                <CompletionCertificate
                  studentName={props.studentName}
                  challengeTitle={props.challengeTitle}
                  organizationName={props.organizationName}
                  completionDate={props.completionDate}
                  totalScore={props.totalScore}
                />
              ) : (
                <WinnerCertificate
                  studentName={props.studentName}
                  challengeTitle={props.challengeTitle}
                  organizationName={props.organizationName}
                  rank={props.rank}
                  score={props.score}
                  awardDate={props.awardDate}
                />
              )}
            </div>
          </div>,
          document.body
        )}

      {/* Visible button */}
      <Button
        onClick={handleDownload}
        disabled={loading}
        className={`${buttonStyle} flex items-center gap-2 font-semibold`}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {loading ? "Generating PDF…" : buttonLabel}
      </Button>
    </>
  )
}