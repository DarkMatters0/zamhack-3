"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Building2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { sendCollaborationInvite } from "@/app/(company)/company/challenges/collaboration-actions"

type OrgResult = {
  id: string
  name: string
  industry: string | null
  status: string | null
}

interface Props {
  challengeId: string
  challengeTitle: string
}

export function OrgSearchAndInvite({ challengeId, challengeTitle }: Props) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [results, setResults] = useState<OrgResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selectedOrg, setSelectedOrg] = useState<OrgResult | null>(null)
  const [isInviting, setIsInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  useEffect(() => {
    if (searchTerm.length < 2) {
      setResults([])
      setSearchError(null)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      setSearchError(null)
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("organizations")
          .select("id, name, industry, status")
          .ilike("name", `%${searchTerm}%`)
          .eq("status", "active")
          .limit(8)

        if (error) throw error
        setResults((data as OrgResult[]) ?? [])
      } catch {
        setSearchError("Search failed — try again")
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  async function handleInvite() {
    if (!selectedOrg) return
    setIsInviting(true)
    setInviteError(null)
    try {
      await sendCollaborationInvite(challengeId, selectedOrg.id)
      toast.success("Collaboration invite submitted for admin review")
      router.refresh()
    } catch (err: any) {
      setInviteError(err?.message ?? "Failed to send invite")
    } finally {
      setIsInviting(false)
    }
  }

  if (selectedOrg) {
    return (
      <div className="rounded-lg border p-4 space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">
            Invite <span className="text-primary">{selectedOrg.name}</span> to collaborate on &ldquo;{challengeTitle}&rdquo;?
          </p>
          <p className="text-xs text-muted-foreground">
            They will be able to propose edits, which you review before admin approval.
          </p>
        </div>
        {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}
        <div className="flex gap-2">
          <Button size="sm" disabled={isInviting} onClick={handleInvite}>
            {isInviting ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Sending…
              </>
            ) : (
              "Send Invite"
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={isInviting}
            onClick={() => { setSelectedOrg(null); setInviteError(null) }}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Input
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setSelectedOrg(null) }}
          placeholder="Search organizations by name..."
          className="w-full"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {searchError && <p className="text-sm text-red-600">{searchError}</p>}

      {!isSearching && searchTerm.length >= 2 && results.length === 0 && !searchError && (
        <p className="text-sm text-muted-foreground">No organizations found.</p>
      )}

      {results.length > 0 && (
        <div className="rounded-lg border divide-y">
          {results.map(org => (
            <button
              key={org.id}
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
              onClick={() => setSelectedOrg(org)}
            >
              <div className="rounded-full bg-muted p-1.5 shrink-0">
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{org.name}</p>
                {org.industry && (
                  <p className="text-xs text-muted-foreground">{org.industry}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
