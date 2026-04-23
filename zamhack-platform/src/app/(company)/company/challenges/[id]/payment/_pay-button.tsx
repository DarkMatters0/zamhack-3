"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CreditCard, Loader2 } from "lucide-react"

interface PayNowButtonProps {
  challengeId: string
  listingFee: number
  currency: string
}

export function PayNowButton({ challengeId, listingFee, currency }: PayNowButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePayment() {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/payment/create-company-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to initiate payment.")
      }
      window.location.href = data.checkout_url
    } catch (err: any) {
      setError(err.message || "Something went wrong.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Payment Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handlePayment}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
        size="lg"
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Redirecting to checkout...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Pay {currency} {listingFee.toFixed(2)}
          </span>
        )}
      </Button>

      <Button
        variant="ghost"
        className="w-full"
        onClick={() => router.push(`/company/challenges/${challengeId}`)}
        disabled={isLoading}
      >
        Cancel
      </Button>
    </>
  )
}
