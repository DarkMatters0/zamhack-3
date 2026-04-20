export const RANK_TITLES = {
  beginner:     "Emerging Innovator",
  intermediate: "Rising Challenger",
  advanced:     "Elite Contributor",
} as const

export type SkillTier = keyof typeof RANK_TITLES

export function getRankTitle(tier: SkillTier): string {
  return RANK_TITLES[tier]
}

const TIER_RANK: Record<SkillTier, number> = { beginner: 1, intermediate: 2, advanced: 3 }

export function getHighestTier(tiers: SkillTier[]): SkillTier | null {
  if (tiers.length === 0) return null
  return tiers.reduce((best, t) => (TIER_RANK[t] > TIER_RANK[best] ? t : best))
}
