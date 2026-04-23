// src/app/api/payment/create-company-checkout/route.ts

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function POST(req: NextRequest) {
  try {
    // ── 1. Auth Check ──────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "You must be logged in to pay a listing fee." },
        { status: 401 }
      )
    }

    // ── 2. Company Role Check ──────────────────────────────────
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, organization_id")
      .eq("id", user.id)
      .single()

    if (
      profile?.role !== "company_admin" &&
      profile?.role !== "company_member"
    ) {
      return NextResponse.json(
        { error: "Only company users can pay listing fees." },
        { status: 403 }
      )
    }

    // ── 3. Parse Request Body ──────────────────────────────────
    const { challengeId } = await req.json()

    if (!challengeId) {
      return NextResponse.json(
        { error: "Challenge ID is required." },
        { status: 400 }
      )
    }

    // ── 4. Fetch Challenge ─────────────────────────────────────
    const { data: challenge, error: challengeError } = await supabase
      .from("challenges")
      .select("id, title, listing_fee, listing_fee_currency, status, organization_id")
      .eq("id", challengeId)
      .single()

    if (challengeError || !challenge) {
      return NextResponse.json(
        { error: "Challenge not found." },
        { status: 404 }
      )
    }

    // ── 5. Status Validation ───────────────────────────────────
    if (challenge.status !== "approved_awaiting_payment") {
      return NextResponse.json(
        { error: "This challenge is not awaiting payment." },
        { status: 400 }
      )
    }

    // ── 6. Org Ownership Check ─────────────────────────────────
    if (challenge.organization_id !== profile.organization_id) {
      return NextResponse.json(
        { error: "You do not have permission to pay for this challenge." },
        { status: 403 }
      )
    }

    // ── 7. Idempotency Check ───────────────────────────────────
    // Prevent duplicate checkout sessions for the same challenge
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id, status, checkout_session_id")
      .eq("challenge_id", challengeId)
      .eq("status", "pending")
      .eq("payment_type", "company_listing")
      .maybeSingle()

    if (existingPayment?.checkout_session_id) {
      return NextResponse.json(
        { error: "A payment session already exists for this challenge. Please check your email or try again in a few minutes." },
        { status: 400 }
      )
    }

    // ── 8. Determine Fee Amount ────────────────────────────────
    // PayMongo requires amount in centavos (multiply by 100)
    const feeInPesos = challenge.listing_fee ?? 0
    const amountInCentavos = Math.round(feeInPesos * 100)
    const currency = (challenge.listing_fee_currency ?? "PHP").toUpperCase()

    // Guard: a zero fee should have been approved as free (status → approved)
    if (amountInCentavos === 0) {
      return NextResponse.json(
        { error: "This challenge has no listing fee. Contact admin." },
        { status: 400 }
      )
    }

    // ── 9. Build Redirect URLs ─────────────────────────────────
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
      || process.env.NEXT_PUBLIC_VERCEL_URL
      || "http://localhost:3000"

    const successUrl = `${baseUrl}/company/challenges/${challengeId}/payment/success`
    const cancelUrl  = `${baseUrl}/company/challenges/${challengeId}/payment`

    // ── 10. Create PayMongo Checkout Session ───────────────────
    const paymongoSecretKey = process.env.PAYMONGO_SECRET_KEY
    if (!paymongoSecretKey) {
      console.error("PAYMONGO_SECRET_KEY is not set")
      return NextResponse.json(
        { error: "Payment service is not configured." },
        { status: 500 }
      )
    }

    const paymongoResponse = await fetch(
      "https://api.paymongo.com/v1/checkout_sessions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${Buffer.from(paymongoSecretKey + ":").toString("base64")}`,
        },
        body: JSON.stringify({
          data: {
            attributes: {
              billing: {
                email: user.email,
              },
              line_items: [
                {
                  currency,
                  amount: amountInCentavos,
                  name: `Listing Fee — ${challenge.title}`,
                  quantity: 1,
                },
              ],
              payment_method_types: ["card", "gcash", "paymaya", "qrph"],
              success_url: successUrl,
              cancel_url: cancelUrl,
              // payment_type in metadata lets the webhook branch correctly
              metadata: {
                challenge_id: challengeId,
                user_id: user.id,
                payment_type: "company_listing",
              },
              description: `ZamHack challenge listing fee for: ${challenge.title}`,
            },
          },
        }),
      }
    )

    if (!paymongoResponse.ok) {
      const errorData = await paymongoResponse.json()
      console.error("PayMongo error:", errorData)
      return NextResponse.json(
        { error: "Failed to create payment session. Please try again." },
        { status: 500 }
      )
    }

    const paymongoData  = await paymongoResponse.json()
    const session       = paymongoData.data
    const checkoutUrl   = session.attributes.checkout_url
    const sessionId     = session.id

    // ── 11. Save Payment Record to DB ─────────────────────────
    const { error: insertError } = await supabase
      .from("payments")
      .insert({
        user_id: user.id,
        challenge_id: challengeId,
        amount: amountInCentavos,
        currency,
        status: "pending",
        provider: "paymongo",
        checkout_session_id: sessionId,
        payment_type: "company_listing",
      })

    if (insertError) {
      console.error("Failed to save company payment record:", insertError)
      // Don't block the company — the webhook will handle confirmation
    }

    // ── 12. Return Checkout URL to Client ──────────────────────
    return NextResponse.json({ checkout_url: checkoutUrl }, { status: 200 })

  } catch (err) {
    console.error("create-company-checkout error:", err)
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    )
  }
}
