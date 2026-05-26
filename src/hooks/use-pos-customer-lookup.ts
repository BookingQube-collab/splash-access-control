"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { lookupByToken, searchByMobile } from "@/lib/summersplash.functions";
import { hasMobileLookupInput, phoneIdentityKey } from "@/lib/utils";

/** Debounce before inline POS mobile → customer lookup. */
export const POS_MOBILE_LOOKUP_DEBOUNCE_MS = 200;

/** Cache repeat mobile lookups at the counter. */
export const POS_CUSTOMER_LOOKUP_STALE_MS = 60_000;

export const POS_CUSTOMER_MOBILE_KEY = "pos-customer-mobile";

export function posCustomerMobileQueryKey(mobile: string) {
  return [POS_CUSTOMER_MOBILE_KEY, phoneIdentityKey(mobile.trim())] as const;
}

export type PosCustomerMobileLookup = {
  debouncedMobile: string;
  flush: () => void;
  mobileQuery: UseQueryResult<Awaited<ReturnType<typeof searchByMobile>>>;
  fetchMobileNow: (mobile: string) => Promise<Awaited<ReturnType<typeof searchByMobile>> | null>;
  tokenLookup: ReturnType<typeof usePosCustomerTokenLookup>["tokenLookup"];
  customerFieldsLoading: boolean;
};

function usePosCustomerTokenLookup() {
  const tokenLookup = useMutation({
    mutationFn: (token: string) => lookupByToken({ token }),
  });
  return { tokenLookup };
}

export function usePosCustomerLookup(mobile: string): PosCustomerMobileLookup {
  const queryClient = useQueryClient();
  const [debouncedMobile, setDebouncedMobile] = useState(mobile);
  const { tokenLookup } = usePosCustomerTokenLookup();

  useEffect(() => {
    const t = window.setTimeout(
      () => setDebouncedMobile(mobile),
      POS_MOBILE_LOOKUP_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(t);
  }, [mobile]);

  const flush = useCallback(() => {
    setDebouncedMobile(mobile);
  }, [mobile]);

  const trimmedDebounced = debouncedMobile.trim();
  const mobileLookupEnabled = hasMobileLookupInput(trimmedDebounced);

  const mobileQuery = useQuery({
    queryKey: posCustomerMobileQueryKey(trimmedDebounced),
    queryFn: () => searchByMobile({ mobile: trimmedDebounced }),
    enabled: mobileLookupEnabled,
    staleTime: POS_CUSTOMER_LOOKUP_STALE_MS,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });

  const fetchMobileNow = useCallback(
    async (raw: string) => {
      const q = raw.trim();
      if (!hasMobileLookupInput(q)) return null;
      setDebouncedMobile(q);
      return queryClient.fetchQuery({
        queryKey: posCustomerMobileQueryKey(q),
        queryFn: () => searchByMobile({ mobile: q }),
        staleTime: POS_CUSTOMER_LOOKUP_STALE_MS,
      });
    },
    [queryClient],
  );

  const trimmedLive = mobile.trim();
  const customerFieldsLoading =
    tokenLookup.isPending ||
    (mobileLookupEnabled &&
      hasMobileLookupInput(trimmedLive) &&
      mobileQuery.isFetching);

  return {
    debouncedMobile: trimmedDebounced,
    flush,
    mobileQuery,
    fetchMobileNow,
    tokenLookup,
    customerFieldsLoading,
  };
}
