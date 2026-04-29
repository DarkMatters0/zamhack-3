"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Edit2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { submitCollaborationEdit } from "@/app/(company)/company/challenges/collaboration-actions"

interface Props {
  challengeId: string
  collaboratorOrgId: string
}

export function ProposeEditDrawer({ challengeId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [problemBrief, setProblemBrief] = useState("")
  const [endDate, setEndDate] = useState("")
  const [entryFeeAmount, setEntryFeeAmount] = useState("")

  function resetForm() {
    setTitle("")
    setDescription("")
    setProblemBrief("")
    setEndDate("")
    setEntryFeeAmount("")
    setSuccess(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)

    const payload: Record<string, unknown> = {}
    if (title.trim()) payload.title = title.trim()
    if (description.trim()) payload.description = description.trim()
    if (problemBrief.trim()) payload.problem_brief = problemBrief.trim()
    if (endDate) payload.end_date = endDate
    if (entryFeeAmount) payload.entry_fee_amount = parseFloat(entryFeeAmount)

    if (Object.keys(payload).length === 0) {
      toast.error("Please fill in at least one field to propose a change.")
      setIsSubmitting(false)
      return
    }

    try {
      await submitCollaborationEdit(challengeId, payload)
      setSuccess(true)
      setTimeout(() => {
        setOpen(false)
        resetForm()
        router.refresh()
      }, 1500)
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to submit proposal")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Edit2 className="h-4 w-4" />
          Propose an Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Propose an Edit</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Your proposal has been sent to the challenge owner for review.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Leave blank to keep current value"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Leave blank to keep current value"
                rows={3}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-problem-brief">Problem Brief</Label>
              <Textarea
                id="edit-problem-brief"
                value={problemBrief}
                onChange={e => setProblemBrief(e.target.value)}
                placeholder="Leave blank to keep current value"
                rows={3}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-end-date">End Date</Label>
              <Input
                id="edit-end-date"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-entry-fee">Entry Fee Amount</Label>
              <Input
                id="edit-entry-fee"
                type="number"
                min="0"
                step="0.01"
                value={entryFeeAmount}
                onChange={e => setEntryFeeAmount(e.target.value)}
                placeholder="Leave blank to keep current value"
                disabled={isSubmitting}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => { setOpen(false); resetForm() }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Submitting…
                  </>
                ) : (
                  "Submit Proposal"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
