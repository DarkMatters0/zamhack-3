// src/app/(student)/challenges/[id]/payment/failed/page.tsx
import Link from "next/link"
import { XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default async function PaymentFailedPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="container max-w-md py-20">
      <Card className="border-2 shadow-lg text-center">
        <CardHeader className="pb-2">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-red-100 p-4">
              <XCircle className="h-12 w-12 text-red-500" />
            </div>
          </div>
          <CardTitle className="text-2xl">Payment Failed</CardTitle>
          <CardDescription className="text-base mt-2">
            Your payment was not completed. You have not been charged.
            Please try again.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 pt-4">
          <Button asChild className="w-full bg-green-600 hover:bg-green-700">
            <Link href={`/challenges/${id}/payment`}>
              Try Again
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href={`/challenges/${id}`}>
              Back to Challenge
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}