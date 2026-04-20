import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Lock, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RANK_TITLES } from "@/lib/rank-titles"

const RANK_LABEL: Record<string, string> = {
  beginner:     RANK_TITLES.beginner,
  intermediate: RANK_TITLES.intermediate,
  advanced:     RANK_TITLES.advanced,
}

// XP required to ENTER a rank (i.e. first point in that band)
const RANK_ENTRY_XP: Record<string, number> = {
  intermediate: 2001,
  advanced: 5001,
}

// XP at the start of the student's current rank band (for progress bar math)
const RANK_BAND_START: Record<string, number> = {
  beginner: 0,
  intermediate: 2001,
  advanced: 5001,
}

export default async function RankGatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    required?: string
    current?: string
    difficulty?: string
  }>
}) {
  const { id: challengeId } = await params
  const { required, current, difficulty } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("xp_points, xp_rank")
    .eq("id", user.id)
    .single()

  const currentXp: number = (profile as any)?.xp_points ?? 0
  const requiredRank = required ?? "intermediate"
  const currentRank = current ?? "beginner"

  const targetXp = RANK_ENTRY_XP[requiredRank] ?? 2001
  const bandStart = RANK_BAND_START[currentRank] ?? 0
  const xpNeeded = Math.max(0, targetXp - currentXp)
  const progress = Math.min(
    100,
    ((currentXp - bandStart) / (targetXp - bandStart)) * 100
  )

  // Suggest lower-difficulty challenges the student can do to rank up
  const pathDifficulties =
    requiredRank === "advanced" ? ["beginner", "intermediate"] : ["beginner"]

  const { data: pathChallenges } = await supabase
    .from("challenges")
    .select("id, title, difficulty")
    .in("difficulty", pathDifficulties as any)
    .eq("status", "approved")
    .neq("id", challengeId)
    .limit(5)

  return (
    <div className="container max-w-2xl py-12 space-y-8">
      <Link href={`/challenges/${challengeId}`}>
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to challenge
        </Button>
      </Link>

      {/* Header */}
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold">Rank Required</h1>
        <p className="text-muted-foreground">
          This {difficulty} challenge requires{" "}
          <strong>{RANK_LABEL[requiredRank]} rank</strong> to join. You are
          currently <strong>{RANK_LABEL[currentRank]} rank</strong>.
        </p>
      </div>

      {/* XP Progress */}
      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          <span className="font-semibold">Your XP Progress</span>
        </div>
        <div className="text-3xl font-bold">
          {currentXp.toLocaleString()} XP
        </div>
        <div className="space-y-1">
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2 transition-all"
              style={{ width: `${progress.toFixed(1)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{currentXp.toLocaleString()} XP</span>
            <span>{targetXp.toLocaleString()} XP</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Earn{" "}
          <strong>{xpNeeded.toLocaleString()} more XP</strong> to reach{" "}
          {RANK_LABEL[requiredRank]} rank and unlock this challenge.
        </p>
      </div>

      {/* Path challenges */}
      {pathChallenges && pathChallenges.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Complete these challenges to earn XP
          </h2>
          <div className="space-y-2">
            {pathChallenges.map((c: any) => (
              <Link key={c.id} href={`/challenges/${c.id}`}>
                <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted transition-colors cursor-pointer">
                  <span className="font-medium text-sm">{c.title}</span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {c.difficulty}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
