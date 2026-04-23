"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { XCircle } from "lucide-react"

export default function PaymentFailedPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  return (
    <div className="container max-w-md py-20">
      <Card className="border-2 shadow-lg text-center">
        <CardHeader className="pb-2">
          <div className="flex justify-center mb-4">
            <XCircle className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className="text-2xl">Payment Failed</CardTitle>
          <CardDescription>
            Your payment was not completed. Your challenge is still pending payment. You
            can try again below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            onClick={() => router.push(`/company/challenges/${id}/payment`)}
          >
            Try Again
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href={`/company/challenges/${id}`}>Back to Challenge</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
