import { useQuery } from '@tanstack/react-query'

interface CycleReviewStats {
  totalIssues: number
  totalPoints: number
  totalPRs: number
  uniqueContributors: number
  velocity: number
}

interface CycleReviewData {
  cycle: {
    id: string
    name: string | null
    startedAt: string
    completedAt: string
  } | null
  stats: CycleReviewStats
  issues: any[]
  issuesByProject: Record<string, any>
  issuesByEngineer: Record<string, any>
  pullRequests: any[]
}

export function useCycleReviewData(cycleId: string | null) {
  const query = useQuery<CycleReviewData, Error>({
    queryKey: ['cycleReview', cycleId],
    queryFn: async (): Promise<CycleReviewData> => {
      if (!cycleId) {
        throw new Error('No cycle ID provided')
      }

      const response = await fetch(`/api/cycle-review/${cycleId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch cycle review data: ${response.status}`)
      }

      return response.json()
    },
    enabled: !!cycleId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  return {
    cycleReviewData: query.data,
    isLoading: query.isLoading,
    error: query.error?.message,
    refetch: query.refetch
  }
}