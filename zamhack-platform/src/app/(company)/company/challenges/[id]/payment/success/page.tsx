import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"

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
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription>
            Your challenge is now live and visible to students. They can start joining
            immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <Button asChild className="w-full">
            <Link href={`/company/challenges/${id}`}>View Your Challenge</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href="/company/dashboard">Go to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
