"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import {
  careerApi,
  credentialsApi,
  jobsApi,
  organizationsApi,
  timelineApi,
  type CareerProfile,
  type CredentialList,
  type CredentialQuery,
  type JobsSearchResult,
  type JobScope,
  type OrganizationRef,
  type QualificationProfile,
  type SkillHistoryItem,
  type TimelineQuery,
  type TimelineResult,
} from "@/lib/api-client";

// Shared TanStack Query hooks for every list page. Query keys embed all
// filter params so each filter combination caches independently; the 45s
// default staleTime (see QueryProvider) makes tab revisits instant while
// background refetches keep data fresh without blocking paint.

// Vault list + organization options. Previous pages stay on screen while the
// next page loads (no skeleton flash on pagination/filter changes).
export function useCredentialList(q: CredentialQuery): UseQueryResult<CredentialList> {
  return useQuery({
    queryKey: ["credentials", q],
    queryFn: () => credentialsApi.list(q),
    placeholderData: (prev) => prev,
  });
}

export function useOrganizations(): UseQueryResult<OrganizationRef[]> {
  return useQuery({
    queryKey: ["organizations"],
    queryFn: () => organizationsApi.list(),
    staleTime: 2 * 60_000,
  });
}

// Year-grouped timeline. Previous groups stay visible while refetching.
export function useTimeline(q: TimelineQuery): UseQueryResult<TimelineResult> {
  return useQuery({
    queryKey: ["timeline", q],
    queryFn: () => timelineApi.list(q),
    placeholderData: (prev) => prev,
  });
}

// Career profile (aggregate) and skill history are fetched independently so
// re-sorting skills never refires the profile aggregate.
export function useCareerProfile(): UseQueryResult<CareerProfile> {
  return useQuery({
    queryKey: ["career-profile"],
    queryFn: () => careerApi.profile(),
  });
}

export function useSkillHistory(sort: string, search?: string): UseQueryResult<SkillHistoryItem[]> {
  return useQuery({
    queryKey: ["skill-history", sort, search ?? ""],
    queryFn: () => careerApi.skills(sort, search),
    placeholderData: (prev) => prev,
  });
}

// Qualifications power the /jobs "what you qualify for" panel.
export function useQualifications(): UseQueryResult<QualificationProfile> {
  return useQuery({
    queryKey: ["qualifications"],
    queryFn: () => jobsApi.qualifications(),
  });
}

// Job search stays user-initiated (provider quota is precious): disabled by
// default, fired via refetch(). Repeat identical searches hit the cache.
export function useJobsSearch(input: {
  scope: JobScope;
  query?: string;
  location?: string;
  limit?: number;
}): UseQueryResult<JobsSearchResult> & { run: () => Promise<JobsSearchResult> } {
  const query = useQuery({
    queryKey: ["jobs-search", input.scope, input.query ?? "", input.location ?? ""],
    queryFn: () =>
      jobsApi.search({
        scope: input.scope,
        query: input.query || undefined,
        location: input.location,
        limit: input.limit ?? 20,
      }),
    enabled: false,
  });
  return { ...query, run: async () => (await query.refetch()).data as JobsSearchResult };
}

// Call after any vault mutation (credential/skill/tag/org/evidence writes)
// so cached lists refresh instead of serving the pre-mutation snapshot.
export function useInvalidateVault() {
  const client = useQueryClient();
  return useCallback(() => {
    for (const key of [
      "credentials",
      "timeline",
      "career-profile",
      "skill-history",
      "qualifications",
      "organizations",
    ]) {
      void client.invalidateQueries({ queryKey: [key] });
    }
  }, [client]);
}
