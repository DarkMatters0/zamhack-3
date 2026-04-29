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
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { adminRevokeCollaboration } from "@/app/(admin)/admin/collaboration-actions"

interface RevokeCollaborationModalProps {
  collaboratorId: string
  challengeTitle: string
}

export function RevokeCollaborationModal({
  collaboratorId,
  challengeTitle,
}: RevokeCollaborationModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [adminNote, setAdminNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleRevoke() {
    setIsSubmitting(true)
    try {
      await adminRevokeCollaboration(collaboratorId, adminNote.trim() || undefined)
      toast.success("Collaboration revoked")
      setOpen(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to revoke collaboration")
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
        <Button variant="destructive" className="gap-2">
          Revoke Collaboration
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke Collaboration</AlertDialogTitle>
          <AlertDialogDescription>
            This will immediately dissolve the collaboration on{" "}
            <span className="font-medium text-foreground">{challengeTitle}</span>.
            This action cannot be undone. The collaborator organization will lose access.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Textarea
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          placeholder="Reason (optional)..."
          rows={3}
          disabled={isSubmitting}
        />

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </AlertDialogCancel>
          <Button variant="destructive" onClick={handleRevoke} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Revoking…
              </>
            ) : (
              "Confirm Revocation"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
