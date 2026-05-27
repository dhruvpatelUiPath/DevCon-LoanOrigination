import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { useAssistant } from '../../hooks/useAssistant';
import { Button } from '../ui/Button';
import { Pill } from '../ui/Pill';
import { LoanProgressBar } from '../ui/LoanProgressBar';
import { OverviewTab } from '../tabs/OverviewTab';
import { CaseManagerTab } from '../tabs/CaseManagerTab';
import { TasksTab } from '../tabs/TasksTab';
import { DetailsTab } from '../tabs/DetailsTab';
import { DocumentsTab } from '../tabs/DocumentsTab';
import { HistoryTab } from '../tabs/HistoryTab';
import { CommentsTab } from '../tabs/CommentsTab';
import {
  deriveCurrentStage,
  fetchCaseStages,
  fetchFolderKeyByInstanceId,
  fetchLoanCaseById,
} from '../../services/loanService';
import { useAuth } from '../../hooks/useAuth';
import { useLoanCases } from '../../hooks/useLoanCases';
import { useLoanApplications } from '../../hooks/useLoanApplications';
import { MOCK_LOAN_DETAIL, buildLoanDetail } from '../../data/mockLoanData';
import type { LoanCase, LoanDetailData } from '../../types/loan';
import type { CaseGetStageResponse } from '@uipath/uipath-typescript/cases';

const STAGE_POLL_MS = 60_000;

type TabKey = 'overview' | 'cm' | 'tasks' | 'details' | 'docs' | 'history' | 'comments';

const TABS: { key: TabKey; label: string; dot?: boolean }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'cm', label: 'Case Manager' },
  { key: 'tasks', label: 'Tasks', dot: true },
  { key: 'details', label: 'Details' },
  { key: 'docs', label: 'Documents' },
  { key: 'history', label: 'History' },
  { key: 'comments', label: 'Comments' },
];

export function LoanDetail() {
  const { caseInstanceId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const folderKey = searchParams.get('folder') ?? '';
  const navigate = useNavigate();
  const { sdk } = useAuth();
  const { open: openAssistant } = useAssistant();
  const { cases } = useLoanCases();
  const { applications } = useLoanApplications();
  useTheme();

  const [tab, setTab] = useState<TabKey>('overview');
  const [remoteCase, setRemoteCase] = useState<LoanCase | null>(null);
  const [loading, setLoading] = useState(false);
  const [stages, setStages] = useState<CaseGetStageResponse[] | null>(null);
  const [refreshingStages, setRefreshingStages] = useState(false);
  const [resolvedFolderKey, setResolvedFolderKey] = useState<string>('');

  const effectiveFolderKey = folderKey || resolvedFolderKey;
  const isLive =
    !!effectiveFolderKey && !!caseInstanceId && !caseInstanceId.startsWith('mock-');

  // If the URL didn't carry ?folder=, resolve it from PIMS via
  // instances[i].folderKey so the agent and downstream fetches still work.
  useEffect(() => {
    let cancelled = false;
    if (folderKey || !caseInstanceId || caseInstanceId.startsWith('mock-')) {
      setResolvedFolderKey('');
      return;
    }
    fetchFolderKeyByInstanceId(sdk, caseInstanceId).then((fk) => {
      if (!cancelled) setResolvedFolderKey(fk ?? '');
    });
    return () => {
      cancelled = true;
    };
  }, [sdk, caseInstanceId, folderKey]);

  const reloadStages = useCallback(async () => {
    if (!isLive) return;
    setRefreshingStages(true);
    try {
      const s = await fetchCaseStages(sdk, caseInstanceId, effectiveFolderKey);
      if (s) setStages(s);
    } finally {
      setRefreshingStages(false);
    }
  }, [sdk, caseInstanceId, effectiveFolderKey, isLive]);

  useEffect(() => {
    let cancelled = false;
    if (!isLive) {
      setRemoteCase(null);
      return;
    }
    setLoading(true);
    fetchLoanCaseById(sdk, caseInstanceId, effectiveFolderKey)
      .then((c) => {
        if (!cancelled) setRemoteCase(c);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sdk, caseInstanceId, effectiveFolderKey, isLive]);

  useEffect(() => {
    if (!isLive) {
      setStages(null);
      return;
    }
    void reloadStages();
    const id = setInterval(() => void reloadStages(), STAGE_POLL_MS);
    return () => clearInterval(id);
  }, [reloadStages, isLive]);

  const currentApplication = useMemo(() => {
    if (!caseInstanceId) return null;
    return applications.find((a) => a.caseInstanceId === caseInstanceId) ?? null;
  }, [applications, caseInstanceId]);

  const detailData: LoanDetailData = useMemo(() => {
    // Keep the displayed identity stable across live loads — only the
    // caseInstanceId is taken from the live case so Maestro/case linkage works.
    const base = remoteCase
      ? buildLoanDetail('Priya Sharma', 'LA-2026-00847', remoteCase.caseInstanceId)
      : MOCK_LOAN_DETAIL;

    const liveAmount = currentApplication?.loanAmount;
    if (typeof liveAmount === 'number' && Number.isFinite(liveAmount)) {
      return {
        ...base,
        loanTerms: {
          ...base.loanTerms,
          amount: `$${liveAmount.toLocaleString('en-US')}`,
        },
      };
    }
    return base;
  }, [remoteCase, currentApplication]);

  const liveStage = useMemo(() => deriveCurrentStage(stages), [stages]);
  const stage = liveStage ?? detailData.stage;

  // While a live case is still resolving its true stage, the displayed stage
  // falls back to MOCK_LOAN_DETAIL.stage — show a skeleton instead of stale data.
  const loadingLiveState = isLive && (loading || liveStage === null);

  const title = useMemo(() => {
    const amount = currentApplication?.loanAmount;
    if (typeof amount === 'number' && Number.isFinite(amount)) {
      return `Priya Sharma — $${amount.toLocaleString('en-US')}`;
    }
    return 'Priya Sharma — $425,000';
  }, [currentApplication]);
  const caseId = detailData.caseId;

  const latestLiveCase = useMemo(() => {
    const live = cases.filter((c) => c.isReal && c.startedTime);
    if (live.length === 0) return null;
    return live.reduce((latest, c) =>
      new Date(c.startedTime!).getTime() > new Date(latest.startedTime!).getTime() ? c : latest,
    );
  }, [cases]);

  const maestroUrl = useMemo(() => {
    const orgName = import.meta.env.VITE_UIPATH_ORG_NAME ?? '';
    const tenantName = import.meta.env.VITE_UIPATH_TENANT_NAME ?? '';
    const processKey = import.meta.env.VITE_CASE_ID ?? '';
    if (!orgName || !tenantName || !processKey) return null;

    // Prefer the case on the current page when it's a real instance, so each
    // Priya entry's "Open in Maestro" lands on its own run. Mock pages fall
    // back to whatever live run is most recent.
    const target =
      isLive && caseInstanceId && effectiveFolderKey
        ? { caseInstanceId, folderKey: effectiveFolderKey }
        : latestLiveCase
          ? { caseInstanceId: latestLiveCase.caseInstanceId, folderKey: latestLiveCase.folderKey }
          : null;
    if (!target) return null;
    return `https://staging.uipath.com/${orgName}/${tenantName}/maestro_/cases/${processKey}/instances/${target.caseInstanceId}?folderKey=${encodeURIComponent(
      target.folderKey,
    )}`;
  }, [isLive, caseInstanceId, effectiveFolderKey, latestLiveCase]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      <div
        className="flex items-center gap-3.5 px-6 py-3 flex-shrink-0"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <button
          onClick={() => navigate('/dashboard')}
          className="w-7 h-7 rounded-[7px] flex items-center justify-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg3)' }}
          aria-label="Back"
        >
          ←
        </button>
        <div className="flex-1">
          <div className="text-[11px]" style={{ color: 'var(--fg4)' }}>
            {caseId} · Conventional Purchase
          </div>
          <div className="text-[15px] font-bold" style={{ color: 'var(--fg)' }}>
            {loading ? 'Loading…' : title}
          </div>
          <div className="flex gap-3 mt-0.5 text-[11px] items-center" style={{ color: 'var(--fg3)' }}>
            <Pill tone="blue">In Progress</Pill>
            <span>{stage}</span>
            <span style={{ color: 'var(--red)' }}>● 12h left</span>
          </div>
        </div>
        {maestroUrl && (
          <a
            href={maestroUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="text-[11px] font-semibold hover:underline"
            style={{ color: 'var(--blue)' }}
          >
            Open in Maestro ↗
          </a>
        )}
        <div
          className="inline-flex items-center gap-1.5 px-3 py-[3px] rounded-md text-[10px] font-medium"
          style={{
            background: 'var(--green-bg)',
            color: 'var(--green)',
            border: '1px solid var(--green-bd)',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full lp-pulse" style={{ background: 'var(--green)' }} />
          Agent Driven
        </div>
        <Button
          variant="agent"
          onClick={() =>
            openAssistant({
              label: caseId,
              caseInstanceId: remoteCase?.caseInstanceId ?? caseInstanceId,
              folderKey: remoteCase?.folderKey ?? effectiveFolderKey,
              body: `Loan case ${caseId} for ${detailData.borrower.fullName}. Stage: ${stage}. Loan: ${detailData.loanTerms.type} ${detailData.loanTerms.amount} at ${detailData.loanTerms.rate}. Credit ${detailData.metrics.creditScore}, DTI ${detailData.metrics.dti}%, LTV ${detailData.metrics.ltv}%. Property: ${detailData.property.address}. Employment: ${detailData.employment.title} at ${detailData.employment.employer}, ${detailData.employment.income}.`,
            })
          }
        >
          ★ Ask Agent
        </Button>
      </div>

      <LoanProgressBar
        stage={stage}
        onRefresh={isLive ? () => void reloadStages() : undefined}
        refreshing={refreshingStages}
        loading={loadingLiveState}
      />

      <div
        className="flex gap-0.5 px-6 py-1.5 flex-shrink-0"
        style={{ background: 'var(--elevated)', borderBottom: '1px solid var(--border)' }}
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-1.5"
              style={{
                background: active ? 'var(--surface)' : 'transparent',
                color: active ? 'var(--purple)' : 'var(--fg3)',
                boxShadow: active ? 'var(--shadow)' : 'none',
                fontWeight: active ? 600 : 500,
              }}
            >
              {t.label}
              {t.dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--amber)' }} />}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && (
        <OverviewTab
          data={detailData}
          stage={stage}
          loading={loadingLiveState}
          caseInstanceId={detailData.caseInstanceId}
          folderKey={remoteCase?.folderKey ?? effectiveFolderKey}
          onJumpToCaseManager={() => setTab('cm')}
          onJumpToHistory={() => setTab('history')}
        />
      )}
      {tab === 'cm' && (
        <CaseManagerTab
          data={detailData}
          stage={stage}
          caseInstanceId={detailData.caseInstanceId}
          folderKey={remoteCase?.folderKey ?? effectiveFolderKey}
        />
      )}
      {tab === 'tasks' && (
        <TasksTab data={detailData} caseInstanceId={detailData.caseInstanceId} />
      )}
      {tab === 'details' && <DetailsTab data={detailData} />}
      {tab === 'docs' && (
        <DocumentsTab data={detailData} borrowerName={detailData.borrower.fullName} />
      )}
      {tab === 'history' && <HistoryTab data={detailData} stage={stage} />}
      {tab === 'comments' && (
        <CommentsTab
          data={detailData}
          applicantId={
            currentApplication?.applicantId ?? (import.meta.env.VITE_APPLICANT_ID as string) ?? ''
          }
          loanId={currentApplication?.recordId ?? ''}
        />
      )}
    </div>
  );
}
