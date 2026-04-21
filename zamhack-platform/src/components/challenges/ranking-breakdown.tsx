"use client"

import { useState } from "react"
import { ChevronDown, BarChart2, Building2, AlertTriangle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { RankedParticipantWithBreakdown, EvaluatorBreakdown } from "@/lib/rank-scoring"

interface RankingBreakdownProps {
  rankedParticipants: RankedParticipantWithBreakdown[]
  evaluatorList: Array<{ evaluatorId: string; evaluatorName: string; isChief: boolean }>
  participantNames: Record<string, string>
  companyScores: Record<string, number | null>
  scoringMode: string
  isRankedMode: boolean
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-300">
        #1
      </span>
    )
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-300">
        #2
      </span>
    )
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold bg-orange-100 text-amber-700 border border-orange-300">
        #3
      </span>
    )
  }
  return (
    <span className="inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
      #{rank}
    </span>
  )
}

function tiebreakerLabel(tiebreaker: RankedParticipantWithBreakdown["tiebreakerUsed"]): string {
  switch (tiebreaker) {
    case "none":             return "None — rank sum was decisive"
    case "normalized_score": return "Normalized score average"
    case "company_score":    return "Company score"
    case "chief_evaluator":  return "Chief evaluator ranking"
    case "manual":           return "⚠ Manual resolution required"
  }
}

function ParticipantCard({
  participant,
  name,
  evaluatorList,
}: {
  participant: RankedParticipantWithBreakdown
  name: string
  evaluatorList: Array<{ evaluatorId: string; evaluatorName: string; isChief: boolean }>
}) {
  const [expanded, setExpanded] = useState(false)

  const chiefIds = new Set(evaluatorList.filter((e) => e.isChief).map((e) => e.evaluatorId))

  const sortedBreakdown = [...participant.perEvaluatorBreakdown].sort(
    (a, b) => a.rankAssigned - b.rankAssigned
  )

  return (
    <Card className="cp-card overflow-hidden">
      {/* Card header — always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <RankBadge rank={participant.finalRank} />

        <span className="flex-1 font-medium text-sm" style={{ color: "var(--cp-navy)" }}>
          {name}
        </span>

        {participant.isTied && (
          <Badge variant="outline" className="text-yellow-700 border-yellow-400 bg-yellow-50 text-xs">
            ⚠ Tied
          </Badge>
        )}

        <span className="text-xs font-medium text-muted-foreground mr-2">
          Rank Sum: {participant.rankSum}
        </span>

        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Expanded content */}
      {expanded && (
        <CardContent className="px-4 pb-4 pt-0 border-t">
          {/* Step 1 */}
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--cp-text-muted)" }}>
              Step 1 — Raw Scores &amp; Evaluator Rankings
            </p>
            {sortedBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No evaluator scores recorded.</p>
            ) : (
              <table className="w-full text-sm border rounded-md overflow-hidden">
                <thead>
                  <tr className="bg-muted/40 border-b">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Evaluator</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Raw Score</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Rank Assigned</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBreakdown.map((entry: EvaluatorBreakdown) => (
                    <tr key={entry.evaluatorId} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        {entry.evaluatorName}
                        {chiefIds.has(entry.evaluatorId) && (
                          <span className="ml-1 text-yellow-600 font-medium">(Chief ★)</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{entry.rawScore}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{entry.rankAssigned}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Step 2 */}
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--cp-text-muted)" }}>
              Step 2 — Score Aggregates
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-3 py-1.5 text-sm">
                <span className="text-muted-foreground">Rank Sum:</span>
                <span className="font-semibold">{participant.rankSum}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-3 py-1.5 text-sm">
                <span className="text-muted-foreground">Normalized Avg:</span>
                <span className="font-semibold">{participant.normalizedScoreAvg.toFixed(2)}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-3 py-1.5 text-sm">
                <span className="text-muted-foreground">Company Score:</span>
                <span className="font-semibold">
                  {participant.companyScore !== null ? participant.companyScore : "—"}
                </span>
              </span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--cp-text-muted)" }}>
              Step 3 — Final Determination
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Tiebreaker:</span>
              <span className="font-medium">{tiebreakerLabel(participant.tiebreakerUsed)}</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-semibold" style={{ color: "var(--cp-navy)" }}>
                Final Rank: #{participant.finalRank}
              </span>
            </div>

            {participant.tiebreakerUsed === "manual" && participant.isTied && (
              <div className="mt-3 flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                <p className="text-sm text-yellow-800">
                  This participant is tied and requires manual resolution before rankings are final.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export function RankingBreakdown({
  rankedParticipants,
  evaluatorList,
  participantNames,
  companyScores,
  scoringMode,
  isRankedMode,
}: RankingBreakdownProps) {
  // Build sorted rows for the simple company-score display (non-ranked mode)
  const simpleScoreRows = (() => {
    const scored = Object.entries(companyScores)
      .filter((entry): entry is [string, number] => entry[1] !== null)
      .sort(([, a], [, b]) => b - a)
    return scored.map(([userId, score]) => {
      const rank = scored.filter(([, s]) => s > score).length + 1
      const isTied = scored.filter(([, s]) => s === score).length > 1
      return { userId, score, rank, isTied }
    })
  })()
  // Scoring method banner config
  const bannerConfig = (() => {
    if (scoringMode === "evaluator_only") {
      return {
        icon: BarChart2,
        text: "Rankings determined by evaluator scores using the rank-sum method. Each evaluator independently ranked all participants — lower rank sums = better placement.",
      }
    }
    if (scoringMode === "average") {
      return {
        icon: BarChart2,
        text: "Rankings determined by combined evaluator + company scores. Evaluator rank-sums are the primary sort, with company scores used as a tiebreaker.",
      }
    }
    return {
      icon: Building2,
      text: "Rankings determined directly by company evaluation scores. No rank-sum calculation was used.",
    }
  })()

  const BannerIcon = bannerConfig.icon

  return (
    <div className="space-y-5 mt-6">
      {/* A — Scoring Method Banner */}
      <div className="flex items-start gap-3 rounded-lg border bg-muted/30 px-4 py-3">
        <BannerIcon className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{bannerConfig.text}</p>
      </div>

      {/* B — Simple company score table (non-ranked mode) */}
      {!isRankedMode && (
        simpleScoreRows.length === 0 ? (
          <div className="rounded-lg border border-border bg-card px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No evaluations submitted yet. Rankings will appear once participants are scored.
            </p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-16">Rank</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Participant</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Score</th>
                </tr>
              </thead>
              <tbody>
                {simpleScoreRows.map(({ userId, score, rank, isTied }) => (
                  <tr key={userId} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <RankBadge rank={rank} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium" style={{ color: "var(--cp-navy)" }}>
                        {participantNames[userId] ?? userId}
                      </span>
                      {isTied && (
                        <Badge
                          variant="outline"
                          className="ml-2 text-yellow-700 border-yellow-400 bg-yellow-50 text-xs"
                        >
                          ⚠ Tied
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                      {score != null ? score.toFixed(1) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* C — Per-participant expandable cards */}
      {isRankedMode && (
        <>
          {rankedParticipants.length === 0 ? (
            <div className="rounded-lg border border-border bg-card px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">No ranked participants to display.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rankedParticipants.map((participant) => (
                <ParticipantCard
                  key={participant.participantId}
                  participant={participant}
                  name={participantNames[participant.participantId] ?? participant.participantId}
                  evaluatorList={evaluatorList}
                />
              ))}
            </div>
          )}

          {/* D — Evaluator legend */}
          {evaluatorList.length > 0 && (
            <div className="rounded-lg border bg-muted/20 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--cp-text-muted)" }}>
                Evaluators in this challenge
              </p>
              <ul className="space-y-1">
                {evaluatorList.map((e) => (
                  <li key={e.evaluatorId} className="text-sm flex items-center gap-1.5">
                    <span className="text-muted-foreground">•</span>
                    <span>{e.evaluatorName}</span>
                    {e.isChief && (
                      <span className="text-yellow-600 font-medium">★ Chief</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
