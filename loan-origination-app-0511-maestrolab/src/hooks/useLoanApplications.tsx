import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import {
  fetchLoanApplicationRecords,
  type LoanApplicationRecord,
} from '../services/loanService';

export interface UseLoanApplicationsResult {
  applications: LoanApplicationRecord[];
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export function useLoanApplications(): UseLoanApplicationsResult {
  const { sdk } = useAuth();
  const [applications, setApplications] = useState<LoanApplicationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (inFlightRef.current) return inFlightRef.current;
    const promise = (async () => {
      setIsLoading(true);
      try {
        const recs = await fetchLoanApplicationRecords(sdk);
        setApplications(recs);
      } finally {
        setIsLoading(false);
        inFlightRef.current = null;
      }
    })();
    inFlightRef.current = promise;
    return promise;
  }, [sdk]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { applications, isLoading, refresh };
}
