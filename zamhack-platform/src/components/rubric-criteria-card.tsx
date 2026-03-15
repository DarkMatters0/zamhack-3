import { Database } from "@/types/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ClipboardList } from "lucide-react"

type Rubric = Database["public"]["Tables"]["rubrics"]["Row"]

interface RubricCriteriaCardProps {
  rubrics: Rubric[]
}

export function RubricCriteriaCard({ rubrics }: RubricCriteriaCardProps) {
  const totalPoints = rubrics.reduce((sum, r) => sum + (r.max_points ?? 0), 0)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Scoring Criteria</CardTitle>
          </div>
          {rubrics.length > 0 && (
            <Badge variant="secondary" className="text-xs font-medium">
              {totalPoints} pts total
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {rubrics.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            Scoring criteria haven&apos;t been published for this challenge yet.
          </p>
        ) : (
          <div className="divide-y divide-border rounded-md border">
            {rubrics.map((rubric, index) => (
              <div
                key={rubric.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium">{rubric.criteria_name}</span>
                </div>
                <Badge variant="outline" className="ml-4 shrink-0 text-xs tabular-nums">
                  {rubric.max_points ?? 0} pts
                </Badge>
              </div>
            ))}

            {/* Total row */}
            <div className="flex items-center justify-between bg-muted/40 px-4 py-3 rounded-b-md">
              <span className="text-sm font-semibold">Total</span>
              <Badge variant="default" className="text-xs tabular-nums">
                {totalPoints} pts
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}