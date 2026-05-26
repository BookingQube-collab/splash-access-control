"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getMyPasses } from "@/lib/summersplash.functions";
import { phoneDigits } from "@/lib/utils";

export const MY_PASSES_QUERY_KEY = "my-passes";

export function myPassesQueryKey(phone: string) {
  return [MY_PASSES_QUERY_KEY, phoneDigits(phone)] as const;
}

export function useMyPassesQuery(phone: string, enabled: boolean) {
  const trimmed = phone.trim();
  const digits = phoneDigits(trimmed);

  return useQuery({
    queryKey: myPassesQueryKey(trimmed),
    queryFn: () => getMyPasses({ mobile: trimmed }),
    enabled: enabled && digits.length >= 7,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    placeholderData: keepPreviousData,
  });
}
