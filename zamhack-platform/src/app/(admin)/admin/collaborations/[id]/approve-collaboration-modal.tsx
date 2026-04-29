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
import { CheckCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { adminApproveCollaboration } from "@/app/(admin)/admin/collaboration-actions"

interface ApproveCollaborationModalProps {
  collaboratorId: string
  challengeTitle: string
}

export function ApproveCollaborationModal({
  collaboratorId,
  challengeTitle,
}: ApproveCollaborationModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleApprove() {
    setIsSubmitting(true)
    try {
      await adminApproveCollaboration(collaboratorId)
      toast.success("Collaboration invite approved — invite sent to collaborator org")
      setOpen(false)
      router.push("/admin/dashboard")
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to approve collaboration invite")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700 text-white gap-2">
          <CheckCircle className="h-4 w-4" />
          Approve
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Approve Collaboration Invite</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to approve this collaboration invite for{" "}
            <span className="font-medium text-foreground">{challengeTitle}</span>?
            Once approved, the invite link will be sent to the collaborator organization.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <Button
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={handleApprove}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Approving…
              </>
            ) : (
              "Confirm Approval"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
