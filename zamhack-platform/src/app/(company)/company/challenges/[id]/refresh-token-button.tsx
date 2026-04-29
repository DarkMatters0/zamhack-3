"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { refreshCollaborationInviteToken } from "@/app/(company)/company/challenges/collaboration-token-actions"

interface Props {
  collaboratorId: string
  challengeId: string
}

export function RefreshTokenButton({ collaboratorId }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRefresh() {
    setIsLoading(true)
    setError(null)
    try {
      await refreshCollaborationInviteToken(collaboratorId)
      toast.success("Invite link refreshed")
      router.refresh()
    } catch (err: any) {
      setError(err?.message ?? "Failed to refresh invite link")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <Button size="sm" variant="outline" disabled={isLoading} onClick={handleRefresh}>
        {isLoading ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
            Refreshing…
          </>
        ) : (
          "Refresh Invite Link"
        )}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
