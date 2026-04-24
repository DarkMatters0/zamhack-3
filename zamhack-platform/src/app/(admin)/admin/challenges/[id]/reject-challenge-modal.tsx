"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { XCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { rejectChallenge } from "@/app/admin/actions"

interface RejectChallengeModalProps {
  challengeId: string
}

export function RejectChallengeModal({ challengeId }: RejectChallengeModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleReject() {
    setIsSubmitting(true)
    try {
      await rejectChallenge(challengeId, reason.trim() || undefined)
      toast.success("Challenge rejected")
      setOpen(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to reject challenge")
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleCancel() {
    setReason("")
    setOpen(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="gap-2">
          <XCircle className="h-4 w-4" />
          Reject
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject Challenge</AlertDialogTitle>
          <AlertDialogDescription>
            Optionally provide a reason so the company knows what to fix before resubmitting.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain what needs to be fixed before resubmitting..."
          rows={4}
          disabled={isSubmitting}
        />

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </AlertDialogCancel>
          <Button variant="destructive" onClick={handleReject} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Rejecting…
              </>
            ) : (
              "Confirm Rejection"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
