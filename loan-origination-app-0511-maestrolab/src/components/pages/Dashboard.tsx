import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../layout/Header';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { NewLoanModal } from '../dashboard/NewLoanModal';
import { useLoanCases } from '../../hooks/useLoanCases';
import { useLoanApplications } from '../../hooks/useLoanApplications';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import type { LoanCase, LoanStage } from '../../types/loan';
import type { LoanApplicationRecord } from '../../services/loanService';

export function Dashboard() {
  const navigate = useNavigate();
  const { cases, refresh: refreshCases, usedFallback } = useLoanCases();
  const { applications, refresh: refreshApplications } = useLoanApplications();
  const [newLoanOpen, setNewLoanOpen] = useState(false);

  const liveCases = useMemo(() => cases.filter((c) => c.isReal), [cases]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([refreshCases(), refreshApplications()]);
  }, [refreshCases, refreshApplications]);

  return (
    <>
      <Header
        title="Dashboard"
        subtitle={
          usedFallback ? 'Demo data · Your agentic lending workspace' : 'Your agentic lending workspace'
        }
        onRefresh={handleRefresh}
        rightSlot={
          <Button variant="primary" onClick={() => setNewLoanOpen(true)}>
            + New loan
          </Button>
        }
      />
      <div className="flex-1 overflow-y-auto p-6">
        <MorningBrief
          onOpenQueue={() => navigate('/queue')}
          cases={cases}
          applications={applications}
        />
        <PortfolioPulse onNav={navigate} />
        <DecideToday cases={cases} applications={applications} />
        {liveCases.length > 0 && <LiveInstancesTeaser liveCases={liveCases} />}
      </div>
      <NewLoanModal
        open={newLoanOpen}
        onClose={() => setNewLoanOpen(false)}
        onCreated={handleRefresh}
      />
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Zone 1: Morning Brief
// ────────────────────────────────────────────────────────────────────────────
function MorningBrief({
  onOpenQueue,
  cases,
  applications,
}: {
  onOpenQueue: () => void;
  cases: LoanCase[];
  applications: LoanApplicationRecord[];
}) {
  const { user } = useAuth();
  const firstName = user?.firstName?.trim() ?? '';

  // Pick the most recently created loan application that has a matching live
  // case, and use its stage to pick the short Priya line.
  const latestPriyaStage = useMemo<LoanStage | null>(() => {
    const caseByInstance = new Map<string, LoanCase>();
    for (const c of cases) {
      if (c.isReal) caseByInstance.set(c.caseInstanceId, c);
    }
    const matched = applications
      .filter((a) => a.caseInstanceId && caseByInstance.has(a.caseInstanceId))
      .slice()
      .sort((a, b) => {
        const ta = a.createTime ? Date.parse(a.createTime) : 0;
        const tb = b.createTime ? Date.parse(b.createTime) : 0;
        return tb - ta;
      });
    const latest = matched[0];
    if (!latest) return null;
    return caseByInstance.get(latest.caseInstanceId!)?.stage ?? null;
  }, [cases, applications]);

  const priyaLine =
    latestPriyaStage != null
      ? PRIYA_BRIEF_BY_STAGE[latestPriyaStage]
      : PRIYA_BRIEF_BY_STAGE.Processing;

  const dateLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
    [],
  );

  return (
    <div
      className="lp-shimmer-wrap mb-5 px-7 py-7 rounded-2xl relative overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, rgba(15,157,143,0.10), rgba(14,42,71,0.06) 65%, rgba(15,157,143,0.04))',
        border: '1px solid var(--navy-bd)',
      }}
    >
      <div
        className="grid gap-6 relative z-10 min-w-0 items-stretch"
        style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 280px)' }}
      >
        <div className="flex flex-col gap-3 min-w-0">
          <div
            className="inline-flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.7px]"
            style={{ color: 'var(--green)' }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full lp-pulse"
              style={{ background: 'var(--green)' }}
            />
            <span>Agent on duty</span>
            <span style={{ color: 'var(--fg4)' }}>·</span>
            <span style={{ color: 'var(--fg3)' }}>{dateLabel}</span>
          </div>

          <div>
            <div
              className="text-[30px] font-extrabold leading-[1.1]"
              style={{ color: 'var(--fg)' }}
            >
              {firstName ? `Good Morning ${firstName},` : 'Good Morning,'}
            </div>
            <div
              className="text-[30px] font-extrabold leading-[1.1]"
              style={{ color: 'var(--green)' }}
            >
              overnight I handled 14 events.
            </div>
          </div>

          <div
            className="text-[13px] leading-relaxed mt-1"
            style={{ color: 'var(--fg2)' }}
          >
            <b style={{ color: 'var(--fg)' }}>8 loans</b> advanced ·{' '}
            <b style={{ color: 'var(--fg)' }}>3 new intakes</b> in flight ·{' '}
            <b style={{ color: 'var(--fg)' }}>14 decisions</b> ready for you today ·{' '}
            <Highlight tone="red">3 SLA-critical</Highlight>
          </div>

          <div className="mt-1">
            <button
              onClick={onOpenQueue}
              className="px-5 py-2.5 rounded-[9px] text-[12.5px] font-semibold text-white transition-all inline-flex items-center gap-1.5 hover:-translate-y-px"
              style={{
                background: 'var(--green)',
                border: '1px solid var(--green)',
                boxShadow: '0 4px 12px rgba(15,157,143,0.28)',
              }}
            >
              Open decision queue →
            </button>
          </div>

          <div
            className="text-[12px] leading-relaxed mt-1"
            style={{ color: 'var(--fg4)' }}
          >
            Marcus Johnson paused — rate-lock event tripped manager-approval rule. Priya Sharma{' '}
            {priyaLine}
          </div>
        </div>

        <AgentHandledTodayCard />
      </div>
    </div>
  );
}

function AgentHandledTodayCard() {
  const TARGET = 34;
  const START = 30;
  const [count, setCount] = useState(START);

  useEffect(() => {
    if (count >= TARGET) return;
    const id = setTimeout(() => setCount((c) => Math.min(TARGET, c + 1)), 1600);
    return () => clearTimeout(id);
  }, [count]);

  return (
    <div
      className="flex flex-col gap-2 p-4 rounded-xl"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div
        className="text-[10px] font-bold uppercase tracking-[0.6px]"
        style={{ color: 'var(--fg4)' }}
      >
        Agent handling live
      </div>
      <div
        className="text-[54px] font-extrabold leading-none"
        style={{ color: 'var(--green)' }}
      >
        {count}
      </div>
      <div className="text-[11px]" style={{ color: 'var(--fg3)' }}>
        <b style={{ color: 'var(--fg)' }}>72% autonomy</b> ·{' '}
        <span style={{ color: 'var(--green)', fontWeight: 600 }}>▲ 8pp vs last week</span>
      </div>
      <div
        className="grid grid-cols-2 gap-3 mt-2 pt-3"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div>
          <div className="text-[16px] font-bold" style={{ color: 'var(--fg)' }}>
            24/{count}
          </div>
          <div className="text-[10px]" style={{ color: 'var(--fg4)' }}>
            Auto-resolved
          </div>
        </div>
        <div>
          <div className="text-[16px] font-bold" style={{ color: 'var(--fg)' }}>
            142
          </div>
          <div className="text-[10px]" style={{ color: 'var(--fg4)' }}>
            Tasks this week
          </div>
        </div>
      </div>
    </div>
  );
}

function Highlight({ tone, children }: { tone: 'red' | 'purple'; children: React.ReactNode }) {
  const color = tone === 'red' ? 'var(--red)' : 'var(--purple)';
  const bg = tone === 'red' ? 'rgba(220,38,38,0.08)' : 'rgba(124,58,237,0.08)';
  return (
    <span className="font-semibold px-1 rounded-sm" style={{ color, background: bg }}>
      {children}
    </span>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Zone 2: Decide Today
// ────────────────────────────────────────────────────────────────────────────
interface DecisionRow {
  urgency: 'red' | 'amber' | 'green';
  urgencyLabel: string;
  urgencyType: string;
  borrower: string;
  caseId: string;
  amount: string;
  stage: string;
  summary: string;
  primaryAction?: { label: string };
  secondaryAction?: { label: string };
  caseInstanceId?: string;
  folderKey?: string;
}

const PRIYA_BRIEF_BY_STAGE: Record<LoanStage, string> = {
  Intake: 'in intake — agent running identity verification and credit pull.',
  Processing: 'teed up for underwriting.',
  Underwriting: 'cleared underwriting — recommended for QA/QC.',
  'QA/QC': 'in QA/QC — compliance and audit checks running.',
  Closing: 'in closing — disclosure acknowledged, funding queued.',
  'Post Closing': 'funded — investor delivery in progress.',
};

const PRIYA_SUMMARIES_BY_STAGE: Record<LoanStage, string> = {
  Intake:
    "New application landed in Intake — agent is running identity verification, credit pull, and the initial eligibility check. I'll flag anything off-pattern; otherwise the package promotes to Processing automatically.",
  Processing:
    "Pay-stub correction processed cleanly — package is green (756 / 29.8% / 85%) and ready for underwriting review. Approve and I'll trigger Underwriting entry; Automated risk assessment fires first.",
  Underwriting:
    "Underwriting analysis complete — DTI 29.8%, LTV 85%, credit 756 all within policy. Automated risk assessment passed with high confidence and 3 precedent matches. Approve to advance to QA/QC.",
  'QA/QC':
    "QA/QC in flight — compliance, full audit, and CDLE comparison running in parallel. No exceptions raised so far; I'll surface anything that needs your eyes before Closing.",
  Closing:
    "Closing disclosure delivered and acknowledged — borrower signed, funding instructions queued. I'll trigger the wire once you confirm, or open to review the closing package.",
  'Post Closing':
    "Loan funded and disbursed — investor delivery packet assembled, post-closing reconciliation complete. The case is wrapping up; open to review the final package or audit trail.",
};

function formatLoanAmount(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return '—';
  if (amount >= 1_000_000) {
    const m = (amount / 1_000_000).toFixed(2).replace(/\.?0+$/, '');
    return `$${m}M`;
  }
  if (amount >= 1_000) return `$${Math.round(amount / 1_000)}K`;
  return `$${amount}`;
}

function DecideToday({
  cases,
  applications,
}: {
  cases: LoanCase[];
  applications: LoanApplicationRecord[];
}) {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Match each entity record to its case instance so we can pull the folderKey
  // and current stage. Records without a live case yet are skipped.
  const caseByInstance = useMemo(() => {
    const map = new Map<string, LoanCase>();
    for (const c of cases) {
      if (c.isReal) map.set(c.caseInstanceId, c);
    }
    return map;
  }, [cases]);

  const priyaRows: DecisionRow[] = useMemo(() => {
    return applications
      .filter((a) => a.caseInstanceId && caseByInstance.has(a.caseInstanceId))
      .slice()
      .sort((a, b) => {
        const ta = a.createTime ? Date.parse(a.createTime) : 0;
        const tb = b.createTime ? Date.parse(b.createTime) : 0;
        return tb - ta;
      })
      .slice(0, 1)
      .map((a) => {
        const c = caseByInstance.get(a.caseInstanceId!)!;
        return {
          urgency: 'red',
          urgencyLabel: '12h left',
          urgencyType: 'Processing',
          borrower: 'Priya Sharma',
          caseId: 'LA-2026-00847',
          amount: formatLoanAmount(a.loanAmount),
          stage: c.stage,
          summary: PRIYA_SUMMARIES_BY_STAGE[c.stage],
          primaryAction: { label: 'Approve' },
          secondaryAction: { label: 'Open →' },
          caseInstanceId: c.caseInstanceId,
          folderKey: c.folderKey,
        };
      });
  }, [applications, caseByInstance]);

  const todayRows: DecisionRow[] = [
    ...priyaRows,
    {
      urgency: 'red',
      urgencyLabel: '24h left',
      urgencyType: 'Rate lock',
      borrower: 'Marcus Johnson',
      caseId: 'LA-2026-00839',
      amount: '$580K',
      stage: 'Closing',
      summary:
        "Rate-lock event tripped the policy rule — extensions now need manager approval. I've paused Closing and held the case. Send approval and I'll dispatch the next stage.",
      primaryAction: { label: 'Reassign' },
      secondaryAction: { label: 'Open →' },
    },
    {
      urgency: 'red',
      urgencyLabel: '24h left',
      urgencyType: 'Underwriting',
      borrower: 'Priyanka Rao',
      caseId: 'LA-2026-00816',
      amount: '$610K',
      stage: 'Underwriting',
      summary:
        "Underwriting rule surfaced a declinable DTI (47% vs 43%). Decline routes to Rejected. Counter at $550K (DTI 42.8%) triggers re-pricing and stays in UW — I've modeled both.",
      primaryAction: { label: 'Counter' },
      secondaryAction: { label: 'Decline' },
    },
  ];

  const weekRows: DecisionRow[] = [
    {
      urgency: 'amber',
      urgencyLabel: 'Apr 23',
      urgencyType: 'Review',
      borrower: 'Wei Zhang',
      caseId: 'LA-2026-00841',
      amount: '$320K',
      stage: 'Underwriting',
      summary:
        'Income classification agent flagged three unusual Schedule C deductions. Underwriting review is next — I need your read before I dispatch it.',
      secondaryAction: { label: 'Open →' },
    },
    {
      urgency: 'amber',
      urgencyLabel: 'Apr 24',
      urgencyType: 'Compliance',
      borrower: 'David Kim',
      caseId: 'LA-2026-00845',
      amount: '$650K',
      stage: 'QA/QC',
      summary:
        'Compliance check flagged a missing donor statement. Borrower agent retried twice in 3d, no response. Route to Escalation stage or close as incomplete?',
      primaryAction: { label: 'Escalate' },
      secondaryAction: { label: 'Open →' },
    },
  ];

  const openRow = (row: DecisionRow) => {
    if (row.caseInstanceId) {
      navigate(`/loans/${row.caseInstanceId}?folder=${row.folderKey ?? ''}`);
    } else {
      navigate('/queue');
    }
  };

  return (
    <div className="mb-5">
      <div className="flex items-baseline justify-between mb-2.5">
        <div className="flex items-baseline gap-2.5">
          <div className="text-[15px] font-bold" style={{ color: 'var(--fg)' }}>
            Decide today
          </div>
          <div className="text-[11px] font-medium" style={{ color: 'var(--fg4)' }}>
            3 SLA-critical · then 10 more this week
          </div>
        </div>
        <button
          onClick={() => navigate('/queue')}
          className="text-[12px] font-semibold hover:underline"
          style={{ color: 'var(--purple)' }}
        >
          View all 13 →
        </button>
      </div>

      {todayRows.map((row) => (
        <DecideRow
          key={`${row.caseInstanceId ?? row.caseId}-${row.urgencyLabel}`}
          row={row}
          onOpen={() => openRow(row)}
          onAction={(label) => toast(`${label}: ${row.borrower}`)}
        />
      ))}

      <div
        className="text-[10.5px] font-bold uppercase tracking-[0.6px] flex items-center gap-2 mt-3.5 mb-1.5"
        style={{ color: 'var(--fg4)' }}
      >
        <span>This week</span>
        <span className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        <span
          className="px-1.5 py-px rounded-[10px] text-[10px] font-semibold"
          style={{
            background: 'var(--surface)',
            color: 'var(--fg3)',
            border: '1px solid var(--border)',
          }}
        >
          10
        </span>
      </div>

      {weekRows.map((row) => (
        <DecideRow
          key={`${row.caseInstanceId ?? row.caseId}-${row.urgencyLabel}`}
          row={row}
          onOpen={() => openRow(row)}
          onAction={(label) => toast(`${label}: ${row.borrower}`)}
        />
      ))}

      <button
        onClick={() => navigate('/queue')}
        className="block w-full px-3.5 py-2.5 rounded-[10px] text-[12px] text-center transition-all"
        style={{
          background: 'var(--surface)',
          border: '1px dashed var(--border)',
          color: 'var(--fg3)',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.borderColor = 'var(--purple)';
          e.currentTarget.style.color = 'var(--purple)';
          e.currentTarget.style.borderStyle = 'solid';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.color = 'var(--fg3)';
          e.currentTarget.style.borderStyle = 'dashed';
        }}
      >
        Show 8 more this week →
      </button>
    </div>
  );
}

function DecideRow({
  row,
  onOpen,
  onAction,
}: {
  row: DecisionRow;
  onOpen: () => void;
  onAction: (label: string) => void;
}) {
  const urgencyColors: Record<DecisionRow['urgency'], { bg: string; fg: string; border: string }> = {
    red: { bg: 'var(--red-bg)', fg: 'var(--red)', border: 'var(--red)' },
    amber: { bg: 'var(--amber-bg)', fg: 'var(--amber)', border: 'var(--amber)' },
    green: { bg: 'var(--green-bg)', fg: 'var(--green)', border: 'var(--green)' },
  };
  const u = urgencyColors[row.urgency];

  return (
    <div
      onClick={onOpen}
      className="grid gap-3.5 px-3.5 py-3 mb-2 rounded-[10px] cursor-pointer transition-all"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${u.border}`,
        gridTemplateColumns: '88px minmax(0, 1fr) auto',
        alignItems: 'center',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.borderColor = 'var(--purple)';
        e.currentTarget.style.borderLeftColor = u.border;
        e.currentTarget.style.boxShadow = '0 3px 10px rgba(124,58,237,0.08)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.borderLeftColor = u.border;
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div className="flex flex-col gap-0.5">
        <span
          className="text-[9.5px] font-bold uppercase tracking-[0.4px] px-2 py-0.5 rounded-[10px] self-start whitespace-nowrap"
          style={{ background: u.bg, color: u.fg }}
        >
          {row.urgencyLabel}
        </span>
        <span className="text-[10.5px] font-medium" style={{ color: 'var(--fg4)' }}>
          {row.urgencyType}
        </span>
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2.5 mb-1 flex-wrap">
          <span className="text-[13.5px] font-bold" style={{ color: 'var(--fg)' }}>
            {row.borrower}
          </span>
          <span className="text-[11.5px]" style={{ color: 'var(--fg3)' }}>
            <span className="font-semibold" style={{ color: 'var(--purple)' }}>
              {row.caseId}
            </span>{' '}
            · {row.amount} · {row.stage}
          </span>
        </div>
        <div
          className="text-[12.5px] leading-relaxed flex items-start gap-1.5"
          style={{ color: 'var(--fg2)' }}
        >
          <span
            className="w-3.5 h-3.5 rounded mt-0.5 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#5EEAD4,#0F9D8F)' }}
          />
          <span>{row.summary}</span>
        </div>
      </div>
      <div className="flex gap-1.5 items-center flex-shrink-0">
        {row.primaryAction && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction(row.primaryAction!.label);
            }}
            className="px-3 py-1.5 rounded-[7px] text-[11.5px] font-semibold text-white whitespace-nowrap"
            style={{ background: 'var(--purple)', border: '1px solid var(--purple)' }}
          >
            {row.primaryAction.label}
          </button>
        )}
        {row.secondaryAction && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (row.secondaryAction!.label.includes('Open')) onOpen();
              else onAction(row.secondaryAction!.label);
            }}
            className="px-3 py-1.5 rounded-[7px] text-[11.5px] font-semibold whitespace-nowrap"
            style={{
              background: 'var(--bg)',
              color: 'var(--fg2)',
              border: '1px solid var(--border)',
            }}
          >
            {row.secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Zone 3: Portfolio Pulse
// ────────────────────────────────────────────────────────────────────────────
function PortfolioPulse({ onNav }: { onNav: (to: string) => void }) {
  const stages = [
    { label: 'Intake', value: 8, height: 28, color: '#60A5FA' },
    { label: 'Proc', value: 14, height: 100, color: '#3B82F6' },
    { label: 'UW', value: 12, height: 85, color: '#1E4480' },
    { label: 'QA', value: 6, height: 44, color: '#5EEAD4' },
    { label: 'Close', value: 5, height: 36, color: '#F59E0B' },
    { label: 'Post', value: 2, height: 15, color: '#10B981' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
      <PulseCard onClick={() => onNav('/cases')}>
        <PulseHeader title="Pipeline by stage" right="47 loans" />
        <div className="flex gap-1 items-end h-11">
          {stages.map((s) => (
            <div key={s.label} className="flex-1 flex flex-col gap-1 min-w-0">
              <div className="text-[11px] font-bold text-center" style={{ color: 'var(--fg)' }}>
                {s.value}
              </div>
              <div
                className="rounded-t-[3px]"
                style={{ background: s.color, height: `${s.height}%`, minHeight: 6 }}
              />
              <div
                className="text-[9px] font-medium text-center truncate"
                style={{ color: 'var(--fg4)' }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
        <div className="text-[10.5px]" style={{ color: 'var(--fg4)' }}>
          Heaviest stage: Processing (30%)
        </div>
      </PulseCard>

      <PulseCard onClick={() => onNav('/sla-risk')}>
        <PulseHeader title="SLA posture" right="94% on track" />
        <div className="flex gap-1.5">
          <SLAChip count={41} label="On track" tone="g" />
          <SLAChip count={4} label="At risk" tone="a" />
          <SLAChip count={2} label="Breach" tone="r" />
        </div>
        <svg viewBox="0 0 120 32" preserveAspectRatio="none" className="w-full h-8">
          <polyline
            fill="none"
            stroke="#10B981"
            strokeWidth="1.6"
            points="0,12 15,10 30,14 45,8 60,11 75,6 90,9 105,5 120,7"
          />
          <polyline
            fill="none"
            stroke="#DC2626"
            strokeWidth="1.4"
            strokeDasharray="2 2"
            points="0,26 15,24 30,28 45,25 60,24 75,26 90,22 105,24 120,22"
          />
        </svg>
        <div className="text-[10.5px]" style={{ color: 'var(--fg4)' }}>
          7-day trend ·{' '}
          <span className="font-semibold" style={{ color: 'var(--green)' }}>
            improving
          </span>
        </div>
      </PulseCard>

      <PulseCard onClick={() => onNav('/analytics')}>
        <PulseHeader title="Automation rate" right="vs. last month" />
        <div className="flex items-baseline gap-2">
          <div className="text-[26px] font-extrabold leading-none" style={{ color: 'var(--fg)' }}>
            72%
          </div>
          <div
            className="text-[11px] font-bold px-1.5 py-0.5 rounded-[10px]"
            style={{ background: 'var(--green-bg)', color: 'var(--green)' }}
          >
            ▲ +8pp
          </div>
        </div>
        <svg viewBox="0 0 120 32" preserveAspectRatio="none" className="w-full h-8">
          <defs>
            <linearGradient id="dash-spg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0F9D8F" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#0F9D8F" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon
            fill="url(#dash-spg)"
            points="0,22 20,18 40,20 60,14 80,12 100,8 120,6 120,32 0,32"
          />
          <polyline
            fill="none"
            stroke="#0F9D8F"
            strokeWidth="1.8"
            points="0,22 20,18 40,20 60,14 80,12 100,8 120,6"
          />
        </svg>
        <div className="text-[10.5px]" style={{ color: 'var(--fg4)' }}>
          Your agent closed 142 tasks this week
        </div>
      </PulseCard>
    </div>
  );
}

function PulseCard({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className="flex flex-col gap-2.5 px-4 py-3.5 rounded-xl cursor-pointer transition-all"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      onMouseOver={(e) => {
        e.currentTarget.style.borderColor = 'var(--purple)';
        e.currentTarget.style.boxShadow = '0 3px 10px rgba(124,58,237,0.06)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {children}
    </div>
  );
}

function PulseHeader({ title, right }: { title: string; right: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span
        className="text-[11px] font-bold uppercase tracking-[0.6px]"
        style={{ color: 'var(--fg3)' }}
      >
        {title}
      </span>
      <span className="text-[11px]" style={{ color: 'var(--fg4)' }}>
        {right}
      </span>
    </div>
  );
}

function SLAChip({ count, label, tone }: { count: number; label: string; tone: 'g' | 'a' | 'r' }) {
  const colors: Record<typeof tone, { bg: string; fg: string }> = {
    g: { bg: 'var(--green-bg)', fg: 'var(--green)' },
    a: { bg: 'var(--amber-bg)', fg: 'var(--amber)' },
    r: { bg: 'var(--red-bg)', fg: 'var(--red)' },
  };
  const c = colors[tone];
  return (
    <div
      className="flex-1 px-2 py-1.5 rounded-md flex flex-col items-start"
      style={{ background: c.bg, color: c.fg }}
    >
      <div className="text-[18px] font-extrabold leading-none">{count}</div>
      <div
        className="text-[9.5px] font-semibold uppercase tracking-[0.4px] mt-0.5"
        style={{ opacity: 0.85 }}
      >
        {label}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Live Instances teaser (kept from v1, now shown below Pulse)
// ────────────────────────────────────────────────────────────────────────────
function LiveInstancesTeaser({ liveCases }: { liveCases: LoanCase[] }) {
  const navigate = useNavigate();
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2.5">
        <span
          className="inline-flex items-center gap-1.5 px-2 py-[2px] rounded-full text-[10px] font-semibold uppercase tracking-[0.5px]"
          style={{
            background: 'var(--green-bg)',
            color: 'var(--green)',
            border: '1px solid var(--green-bd)',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full lp-pulse" style={{ background: 'var(--green)' }} />
          Live
        </span>
        <span className="text-[14px] font-bold" style={{ color: 'var(--fg)' }}>
          UiPath Case Instances ({liveCases.length})
        </span>
        <span className="text-[11px] mono" style={{ color: 'var(--fg4)' }}>
          processKey: {(import.meta.env.VITE_CASE_ID as string)?.slice(0, 8)}…
        </span>
      </div>
      <Card>
        <div>
          {liveCases.slice(0, 5).map((c, idx) => (
            <div
              key={c.caseInstanceId}
              onClick={() => navigate(`/loans/${c.caseInstanceId}?folder=${c.folderKey}`)}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
              style={{
                borderBottom:
                  idx < Math.min(5, liveCases.length) - 1 ? '1px solid var(--border)' : 'none',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = 'var(--hover)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0 lp-pulse"
                style={{ background: 'var(--green)' }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--fg)' }}>
                  {c.borrowerName}
                </div>
                <div className="text-[11px] mono truncate" style={{ color: 'var(--fg4)' }}>
                  {c.caseInstanceId}
                </div>
              </div>
              <div className="text-[11px] text-right flex-shrink-0" style={{ color: 'var(--fg3)' }}>
                <div>
                  <span className="font-semibold" style={{ color: 'var(--fg2)' }}>
                    {c.runStatus ?? '—'}
                  </span>{' '}
                  · {c.stage}
                </div>
                <div className="mt-0.5">
                  {c.startedTime ? new Date(c.startedTime).toLocaleString() : c.lastUpdated}
                </div>
              </div>
            </div>
          ))}
          {liveCases.length > 5 && (
            <div
              onClick={() => navigate('/cases')}
              className="px-4 py-2.5 text-[12px] text-center cursor-pointer font-semibold"
              style={{ color: 'var(--blue)', borderTop: '1px solid var(--border)' }}
            >
              View all {liveCases.length} live instances →
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
