import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info, Lock } from "lucide-react"
import { PayNowButton } from "./_pay-button"

export default async function CompanyPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user!.id)
    .single()

  if (
    !profile ||
    (profile.role !== "company_admin" && profile.role !== "company_member")
  ) {
    redirect("/login")
  }

  const { data: challenge } = await supabase
    .from("challenges")
    .select("id, title, listing_fee, listing_fee_currency, status, organization_id")
    .eq("id", id)
    .single()

  if (!challenge) redirect("/company/challenges")
  if (challenge.organization_id !== profile!.organization_id) redirect("/company/challenges")
  if (challenge.status !== "approved_awaiting_payment") redirect(`/company/challenges/${id}`)

  const listingFee: number = challenge.listing_fee ?? 0
  const currency: string = (challenge.listing_fee_currency ?? "PHP").toUpperCase()

  return (
    <div className="container max-w-md py-20">
      <Card className="border-2 shadow-lg">
        <CardHeader className="text-center border-b bg-muted/20">
          <CardTitle className="text-2xl">Challenge Listing Fee</CardTitle>
          <CardDescription>{challenge.title}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Fee summary */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-2">
            <div className="flex justify-between text-sm text-blue-900">
              <span>Listing Fee</span>
              <span className="font-semibold">
                {currency} {listingFee.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm text-blue-900">
              <span>Currency</span>
              <span className="font-semibold">{currency}</span>
            </div>
            <div className="border-t border-blue-200 pt-2 flex justify-between font-bold text-blue-900">
              <span>Total</span>
              <span>
                {currency} {listingFee.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This fee is required to publish your challenge and make it visible to students.
              Once paid, your challenge will go live immediately.
            </AlertDescription>
          </Alert>

          {/* Interactive: error state + pay + cancel */}
          <PayNowButton challengeId={id} listingFee={listingFee} currency={currency} />
        </CardContent>

        <CardFooter className="justify-center border-t bg-muted/20 py-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Lock className="h-3 w-3" />
            Payments are processed securely by PayMongo
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
