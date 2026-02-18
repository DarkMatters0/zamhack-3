import { createClient } from "@/utils/supabase/server"
import { ChallengeCard } from "@/components/challenge-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Database } from "@/types/supabase"

// Define the type to match ChallengeCard (must include organization)
type ChallengeWithOrg = Database["public"]["Tables"]["challenges"]["Row"] & {
  organization: {
    name: string
  } | null
}

export default async function MyChallengesPage() {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect("/login")
  }

  // Fetch participations with nested challenge AND organization data
  const { data: participations, error } = await supabase
    .from("challenge_participants")
    .select(`
      id,
      status,
      challenge:challenges (
        *,
        organization:organizations (
          name
        )
      )
    `)
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false })

  if (error) {
    console.error("Error fetching my challenges:", error)
  }

  const allParticipations = participations || []

  // Filter and flatten the data
  const activeChallenges = allParticipations
    .filter((p) => p.status === "active" && p.challenge)
    .map((p) => p.challenge as unknown as ChallengeWithOrg)

  const pastChallenges = allParticipations
    .filter((p) => p.status !== "active" && p.challenge)
    .map((p) => p.challenge as unknown as ChallengeWithOrg)

  const hasAnyChallenges = activeChallenges.length > 0 || pastChallenges.length > 0

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">My Challenges</h1>
        <p className="text-muted-foreground">
          Track your progress and manage your active challenges.
        </p>
      </div>

      {!hasAnyChallenges ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card p-12 text-center">
          <p className="text-lg font-medium text-foreground">
            You haven't joined any challenges yet
          </p>
          <p className="text-sm text-muted-foreground mt-2 mb-4">
            Browse available challenges and start your journey.
          </p>
          <Button asChild>
            <Link href="/challenges">Browse Challenges</Link>
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="active" className="w-full">
          <TabsList>
            <TabsTrigger value="active">
              Active ({activeChallenges.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past ({pastChallenges.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {activeChallenges.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card p-12 text-center text-muted-foreground">
                <p className="text-lg font-medium">No active challenges</p>
                <p className="text-sm mt-2">
                  You don't have any active challenges at the moment.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {activeChallenges.map((challenge) => (
                  <ChallengeCard 
                    key={challenge.id} 
                    challenge={challenge} 
                    // REMOVED: href prop (handled internally by component)
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-6">
            {pastChallenges.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card p-12 text-center text-muted-foreground">
                <p className="text-lg font-medium">No past challenges</p>
                <p className="text-sm mt-2">
                  Your completed challenges will appear here.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {pastChallenges.map((challenge) => (
                  <ChallengeCard 
                    key={challenge.id} 
                    challenge={challenge}
                    // REMOVED: href prop
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}