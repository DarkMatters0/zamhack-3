// src/app/(student)/challenges/[id]/payment/success/page.tsx
import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default async function PaymentSuccessPage({
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
            <div className="rounded-full bg-green-100 p-4">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription className="text-base mt-2">
            You have successfully registered for this challenge.
            Good luck! 🎉
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 pt-4">
          <Button asChild className="w-full bg-green-600 hover:bg-green-700">
            <Link href={`/challenges/${id}`}>
              View Challenge
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/my-challenges">
              Go to My Challenges
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}