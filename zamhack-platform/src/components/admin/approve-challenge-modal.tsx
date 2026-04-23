"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { approveChallenge } from "@/app/admin/actions"

interface ApproveChallengeModalProps {
  challengeId: string
  challengeTitle: string
}

export function ApproveChallengeModal({
  challengeId,
  challengeTitle,
}: ApproveChallengeModalProps) {
  const [open, setOpen] = useState(false)
  const [fee, setFee] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleApprove() {
    setIsSubmitting(true)
    const parsedFee = parseFloat(fee) || 0
    try {
      await approveChallenge(challengeId, parsedFee)
      setOpen(false)
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to approve challenge")
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleCancel() {
    setFee("")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700 text-white gap-2">
          <CheckCircle className="h-4 w-4" />
          Approve Challenge
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Approve Challenge</DialogTitle>
          <DialogDescription>
            Set a listing fee for{" "}
            <span className="font-medium text-foreground">{challengeTitle}</span>.
            The company must pay this fee before their challenge goes live.
            Set to 0 for a free listing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="listing-fee">Listing Fee (PHP)</Label>
          <Input
            id="listing-fee"
            type="number"
            min={0}
            step={0.01}
            placeholder="0.00"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            disabled={isSubmitting}
          />
          <p className="text-xs text-muted-foreground">
            Enter 0 to approve as a free listing — the challenge goes live immediately.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
