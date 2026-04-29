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
import { adminRejectCollaboration } from "@/app/(admin)/admin/collaboration-actions"

interface RejectCollaborationModalProps {
  collaboratorId: string
}

export function RejectCollaborationModal({ collaboratorId }: RejectCollaborationModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [adminNote, setAdminNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleReject() {
    setIsSubmitting(true)
    try {
      await adminRejectCollaboration(collaboratorId, adminNote.trim() || undefined)
      toast.success("Collaboration invite rejected")
      setOpen(false)
      router.push("/admin/dashboard")
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to reject collaboration invite")
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleCancel() {
    setAdminNote("")
    setOpen(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <XCircle className="h-4 w-4" />
          Reject
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject Collaboration Invite</AlertDialogTitle>
          <AlertDialogDescription>
            The invite will be permanently rejected. Optionally provide a reason so the company
            understands why the collaboration was not approved.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Textarea
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          placeholder="Reason for rejection (optional)..."
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
