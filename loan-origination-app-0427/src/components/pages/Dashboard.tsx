import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../layout/Header';
import { Card } from '../ui/Card';
import { useLoanCases } from '../../hooks/useLoanCases';
import { useAssistant } from '../../hooks/useAssistant';
import { useToast } from '../../hooks/useToast';
import type { LoanCase } from '../../types/loan';

const AGENT_NOW_ROTATION: [string, string][] = [
  ['Extracting docs', 'LA-2026-00853'],
  ['Classifying income', 'LA-2026-00857'],
  ['Pulling credit', 'LA-2026-00860'],
  ['OFAC screening', 'LA-2026-00862'],
  ['Verifying employment', 'LA-2026-00851'],
  ['Re-running DTI', 'LA-2026-00849'],
  ['Ordering appraisal', 'LA-2026-00855'],
  ['Watching rate lock', 'LA-2026-00839'],
];

const RECENT_ORCHESTRATION = [
  { dot: 'ok' as const, label: 'Triggered Processing entry', who: "Liam O'Brien", ago: '2m' },
  { dot: 'cr' as const, label: 'Batch-resolved 3 Intake events', who: 'Angela Brooks', ago: '14m' },
  { dot: 'wt' as const, label: 'Paused on rate-lock rule', who: 'Marcus Johnson', ago: '1h' },
];

const DOT_COLORS: Record<'ok' | 'cr' | 'wt' | 'hu', string> = {
  ok: 'var(--green)',
  cr: 'var(--purple)',
  wt: 'var(--amber)',
  hu: 'var(--blue)',
};

export function Dashboard() {
  const navigate = useNavigate();
  const { cases, refresh, usedFallback } = useLoanCases();
  const { open: openAssistant } = useAssistant();

  const liveCases = useMemo(() => cases.filter((c) => c.isReal), [cases]);

  return (
    <>
      <Header
        title="Dashboard"
        subtitle={
          usedFallback ? 'Demo data · Your agentic lending workspace' : 'Your agentic lending workspace'
        }
        onRefresh={refresh}
      />
      <div className="flex-1 overflow-y-auto p-6">
        <MorningBrief
          onOpenQueue={() => navigate('/queue')}
          onAskAgent={() => openAssistant()}
        />
        <DecideToday cases={cases} />
        <PortfolioPulse onNav={navigate} />
        {liveCases.length > 0 && <LiveInstancesTeaser liveCases={liveCases} />}
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Zone 1: Morning Brief
// ────────────────────────────────────────────────────────────────────────────
function MorningBrief({ onOpenQueue, onAskAgent }: { onOpenQueue: () => void; onAskAgent: () => void }) {
  const navigate = useNavigate();
  const greetingDate = useMemo(() => {
    const d = new Date();
    const h = d.getHours();
    const greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    const subtitle = d.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    return { greet: `${greet}, Dhruv`, sub: `${subtitle} · Your morning brief` };
  }, []);

  const [nowIdx, setNowIdx] = useState(0);
  const [opacity, setOpacity] = useState(1);
  useEffect(() => {
    const id = window.setInterval(() => {
      setOpacity(0);
      window.setTimeout(() => {
        setNowIdx((i) => (i + 1) % AGENT_NOW_ROTATION.length);
        setOpacity(1);
      }, 220);
    }, 3000);
    return () => window.clearInterval(id);
  }, []);

  const [activity, caseId] = AGENT_NOW_ROTATION[nowIdx];

  return (
    <div
      className="lp-shimmer-wrap mb-5 px-6 py-5 rounded-2xl relative overflow-hidden grid gap-7"
      style={{
        background:
          'linear-gradient(135deg, rgba(14,42,71,0.08), rgba(15,157,143,0.05) 60%, rgba(14,42,71,0.03))',
        border: '1px solid var(--navy-bd)',
        gridTemplateColumns: 'minmax(0, 1.45fr) minmax(0, 1fr)',
      }}
    >
      <div className="flex flex-col gap-3.5 relative z-10 min-w-0">
        <div className="flex items-center gap-3">
          <div
            className="hero-logo w-10 h-10 rounded-[11px] flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg,#0E2A47,#1E4480)',
              animation: 'lp-agent-pulse 2.2s ease-in-out infinite',
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="text-[19px] font-bold leading-tight" style={{ color: 'var(--fg)' }}>
              {greetingDate.greet}
            </div>
            <div
              className="text-[11px] font-semibold uppercase tracking-[0.6px] mt-0.5"
              style={{ color: 'var(--purple)' }}
            >
              {greetingDate.sub}
            </div>
          </div>
        </div>

        <div className="text-[13px] leading-relaxed max-w-[640px]" style={{ color: 'var(--fg2)' }}>
          Overnight I resolved <b style={{ color: 'var(--fg)' }}>14 events</b> across 8 loans.{' '}
          <b style={{ color: 'var(--fg)' }}>3 new intakes</b> in flight.{' '}
          <Highlight tone="red">Today: 13 decisions, 3 SLA-critical.</Highlight>{' '}
          <b style={{ color: 'var(--fg)' }}>Marcus Johnson</b> is paused — rate-lock event tripped the
          manager-approval rule.
        </div>

        <div className="flex flex-wrap gap-1.5">
          <BriefChip dot="b" count="47" label="active" onClick={() => navigate('/cases')} />
          <BriefChip dot="p" count="34" label="autonomous" onClick={() => navigate('/agent-handled')} />
          <BriefChip dot="a" count="13" label="for you" onClick={() => navigate('/queue')} />
          <BriefChip dot="r" count="3" label="SLA" onClick={() => navigate('/sla-risk')} />
          <BriefChip dot="g" count="94%" label="compliance" onClick={() => navigate('/analytics')} />
        </div>

        <div className="flex gap-2.5">
          <button
            onClick={onOpenQueue}
            className="px-5 py-2.5 rounded-[9px] text-[12.5px] font-semibold text-white transition-all inline-flex items-center gap-1.5 hover:-translate-y-px"
            style={{
              background: 'var(--purple)',
              border: '1px solid var(--purple)',
              boxShadow: '0 4px 12px rgba(124,58,237,0.24)',
            }}
          >
            Open decision queue →
          </button>
          <button
            onClick={onAskAgent}
            className="px-4 py-2.5 rounded-[9px] text-[12.5px] font-semibold inline-flex items-center gap-1.5 transition-colors"
            style={{
              background: 'var(--surface)',
              color: 'var(--fg2)',
              border: '1px solid var(--border)',
            }}
          >
            Ask case manager
          </button>
        </div>
      </div>

      <div
        className="relative z-10 pl-6 min-w-0 flex flex-col"
        style={{ borderLeft: '1px solid var(--border)' }}
      >
        <div
          className="text-[11px] font-bold uppercase tracking-[0.6px] mb-2.5 inline-flex items-center gap-1.5"
          style={{ color: 'var(--purple)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full lp-pulse" style={{ background: 'var(--green)' }} />
          Case Manager · Orchestrating
        </div>
        <div
          className="text-[13px] leading-relaxed px-3 py-2.5 mb-3.5 rounded-lg transition-opacity"
          style={{
            background: 'var(--elevated)',
            borderLeft: '3px solid var(--purple)',
            color: 'var(--fg)',
            opacity,
            minHeight: 22,
          }}
        >
          <b>{activity}</b> · {caseId}
        </div>
        <div
          className="text-[10px] font-bold uppercase tracking-[0.6px] mb-1.5"
          style={{ color: 'var(--fg4)' }}
        >
          Recent orchestration events
        </div>
        <div className="flex flex-col mb-2.5">
          {RECENT_ORCHESTRATION.map((row, idx) => (
            <div
              key={`${row.who}-${idx}`}
              className="flex items-start gap-2 py-1.5 text-[12px] leading-snug"
              style={{
                color: 'var(--fg2)',
                borderBottom:
                  idx < RECENT_ORCHESTRATION.length - 1 ? '1px dashed var(--border)' : 'none',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                style={{ background: DOT_COLORS[row.dot] }}
              />
              <div className="flex-1 min-w-0">
                {row.label} · <b style={{ color: 'var(--fg)' }}>{row.who}</b>
              </div>
              <div className="text-[10px] flex-shrink-0 mt-0.5" style={{ color: 'var(--fg4)' }}>
                {row.ago}
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => navigate('/agent-handled')}
          className="text-[11px] font-semibold mt-auto self-start hover:underline"
          style={{ color: 'var(--purple)' }}
        >
          View agent log →
        </button>
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

function BriefChip({
  dot,
  count,
  label,
  onClick,
}: {
  dot: 'b' | 'p' | 'a' | 'r' | 'g';
  count: string;
  label: string;
  onClick?: () => void;
}) {
  const dotColor = {
    b: 'var(--blue)',
    p: 'var(--purple)',
    a: 'var(--amber)',
    r: 'var(--red)',
    g: 'var(--green)',
  }[dot];
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[14px] text-[11px] font-medium transition-colors"
      style={{
        background: 'var(--surface)',
        color: 'var(--fg2)',
        border: '1px solid var(--border)',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.borderColor = 'var(--purple)';
        e.currentTarget.style.color = 'var(--purple)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.color = 'var(--fg2)';
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor }} />
      <b style={{ color: 'var(--fg)', fontWeight: 700 }}>{count}</b>
      {label}
    </button>
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

function DecideToday({ cases }: { cases: LoanCase[] }) {
  const { toast } = useToast();
  const navigate = useNavigate();

  const liveTopReview = cases.find((c) => c.isReal);

  const todayRows: DecisionRow[] = [
    {
      urgency: 'red',
      urgencyLabel: '12h left',
      urgencyType: 'Processing',
      borrower: 'Priya Sharma',
      caseId: 'LA-2026-00847',
      amount: '$425K',
      stage: liveTopReview?.stage ?? 'Processing',
      summary:
        'Processing stage closed cleanly — all tasks resolved, package green (756 / 29.8% / 85%). Approve and I’ll trigger Underwriting entry; Automated risk assessment fires first.',
      primaryAction: { label: 'Approve to UW' },
      secondaryAction: { label: 'Open →' },
      caseInstanceId: liveTopReview?.caseInstanceId,
      folderKey: liveTopReview?.folderKey,
    },
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
          key={`${row.caseId}-${row.urgencyLabel}`}
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
          key={`${row.caseId}-${row.urgencyLabel}`}
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
