import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Receipt, CreditCard, CheckCircle2, Clock } from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────

interface PaymentRow {
  id: string
  amount: number
  currency: string | null
  status: string
  paid_at: string | null
  created_at: string | null
  checkout_session_id: string | null
  challenge_id: string | null
  challenges: { id: string; title: string } | null
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateString: string | null): string {
  if (!dateString) return "—"
  return new Date(dateString).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function StatusBadge({ status }: { status: string }) {
  if (status === "paid") {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
        Paid
      </Badge>
    )
  }
  if (status === "pending") {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100">
        Pending
      </Badge>
    )
  }
  const label = status.charAt(0).toUpperCase() + status.slice(1)
  return (
    <Badge variant="outline" className="text-muted-foreground">
      {label}
    </Badge>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function CompanyFinancesPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single()

  if (
    !profile ||
    (profile.role !== "company_admin" && profile.role !== "company_member")
  ) {
    redirect("/login")
  }

  const { data: rawPayments } = await supabase
    .from("payments")
    .select(`
      id,
      amount,
      currency,
      status,
      paid_at,
      created_at,
      checkout_session_id,
      challenge_id,
      challenges (
        id,
        title
      )
    `)
    .eq("payment_type", "company_listing")
    .order("created_at", { ascending: false })

  const payments = rawPayments as PaymentRow[] | null

  // ── Summary computations ──
  const totalSpent =
    payments
      ?.filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.amount / 100, 0) ?? 0

  const publishedCount = payments?.filter((p) => p.status === "paid").length ?? 0
  const pendingCount = payments?.filter((p) => p.status === "pending").length ?? 0

  const isEmpty = !payments || payments.length === 0

  return (
    <div className="space-y-6 p-6">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--cp-text-primary,#1a202c)]">Finances</h1>
        <p className="text-sm text-[var(--cp-text-muted,#718096)] mt-1">
          Listing fee payment history for your challenges.
        </p>
      </div>

      {/* ── Summary Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
        <div className="cp-stat-card">
          <div className="cp-stat-icon">
            <CreditCard className="w-5 h-5" />
          </div>
          <p className="cp-stat-value">PHP {totalSpent.toFixed(2)}</p>
          <p className="cp-stat-label">Total Spent</p>
        </div>

        <div className="cp-stat-card primary">
          <div className="cp-stat-icon">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <p className="cp-stat-value">{publishedCount}</p>
          <p className="cp-stat-label">Challenges Published</p>
        </div>

        <div className="cp-stat-card">
          <div className="cp-stat-icon">
            <Clock className="w-5 h-5" />
          </div>
          <p className="cp-stat-value">{pendingCount}</p>
          <p className="cp-stat-label">Pending Payments</p>
          {pendingCount > 0 && (
            <p className="cp-stat-sublabel" style={{ fontSize: "0.7rem", color: "var(--cp-text-muted,#718096)", marginTop: "0.25rem" }}>
              Awaiting payment completion
            </p>
          )}
        </div>
      </div>

      {/* ── Payments Table ── */}
      <div className="cp-card">
        <div className="cp-card-header">
          <h2 className="cp-card-title">Payment History</h2>
        </div>

        {isEmpty ? (
          <div className="cp-empty-state">
            <div className="cp-empty-icon">
              <Receipt className="w-7 h-7" />
            </div>
            <p className="cp-empty-title">No payments yet</p>
            <p className="cp-empty-desc">
              Your listing fee payments will appear here once you have approved challenges.
            </p>
          </div>
        ) : (
          <div className="cp-table-wrapper" style={{ border: "none", borderRadius: 0 }}>
            <table className="cp-table">
              <thead>
                <tr>
                  <th>Challenge</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {payments!.map((payment) => (
                  <tr key={payment.id}>
                    <td style={{ fontWeight: 500 }}>
                      {(payment.challenges as any)?.title ?? "—"}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {payment.currency ?? "PHP"}{" "}
                      {(payment.amount / 100).toFixed(2)}
                    </td>
                    <td>
                      <StatusBadge status={payment.status} />
                    </td>
                    <td style={{ color: "var(--cp-text-muted,#718096)", fontSize: "0.8125rem" }}>
                      {payment.status === "paid"
                        ? formatDate(payment.paid_at)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
