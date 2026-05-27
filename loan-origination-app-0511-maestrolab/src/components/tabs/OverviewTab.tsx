import { Card, CardHeader } from '../ui/Card';
import { Pill } from '../ui/Pill';
import { SimilarCasesCard } from '../ui/SimilarCasesCard';
import { ActionEmbedModal } from '../ui/ActionEmbedModal';
import { useToast } from '../../hooks/useToast';
import {
  actionCenterUrlForTask,
  completeMaestroActionTask,
  embedActionCenterUrlForTask,
  findOpenActionTask,
} from '../../services/loanService';
import { useAuth } from '../../hooks/useAuth';
import { useEffect, useState } from 'react';
import type { LoanDetailData, LoanStage } from '../../types/loan';
import { LOAN_STAGES } from '../../types/loan';
import { getStageOverview } from '../../data/stageContent';

interface OverviewTabProps {
  data: LoanDetailData;
  stage: LoanStage;
  loading?: boolean;
  caseInstanceId?: string;
  folderKey?: string;
  onJumpToCaseManager?: () => void;
  onJumpToHistory?: () => void;
}

export function OverviewTab({
  data,
  stage,
  loading,
  caseInstanceId,
  folderKey,
  onJumpToCaseManager,
  onJumpToHistory,
}: OverviewTabProps) {
  if (loading) return <OverviewSkeleton />;
  const { toast } = useToast();
  const { sdk } = useAuth();
  const [approving, setApproving] = useState(false);
  const [transition, setTransition] = useState<{ from: LoanStage; to: LoanStage } | null>(null);
  const [actionTaskId, setActionTaskId] = useState<number | string | null>(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const stageOverview = getStageOverview(stage);

  useEffect(() => {
    if (transition && stage === transition.to) setTransition(null);
  }, [stage, transition]);

  useEffect(() => {
    let cancelled = false;
    setActionTaskId(null);
    setActionModalOpen(false);
    if (!caseInstanceId || !folderKey || caseInstanceId.startsWith('mock-')) return;
    findOpenActionTask(sdk, caseInstanceId, folderKey, stage).then((task) => {
      if (cancelled || !task) return;
      setActionTaskId(task.id);
    });
    return () => {
      cancelled = true;
    };
  }, [sdk, caseInstanceId, folderKey, stage, transition]);

  const nextStage = (s: LoanStage): LoanStage | null => {
    const i = LOAN_STAGES.indexOf(s);
    return i >= 0 && i < LOAN_STAGES.length - 1 ? LOAN_STAGES[i + 1] : null;
  };

  const onApprove = async () => {
    if (!caseInstanceId || !folderKey) {
      toast('Cannot approve: case instance is not linked');
      return;
    }
    setApproving(true);
    const target = nextStage(stage);
    try {
      await completeMaestroActionTask(sdk, caseInstanceId, folderKey, 'Approve', stage);
      toast(stageOverview.approveToast);
      if (target) setTransition({ from: stage, to: target });
    } catch (err) {
      toast(err instanceof Error ? `Approve failed: ${err.message}` : 'Approve failed');
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid gap-3.5" style={{ gridTemplateColumns: '1fr 300px' }}>
          <div className="flex flex-col gap-3">
            {transition && <StageTransitionCard from={transition.from} to={transition.to} />}
            {!transition && (
            <Card style={{ borderColor: 'var(--purple-bd)' }}>
              <div
                className="px-4 py-3 text-xs font-semibold flex items-center"
                style={{ background: 'var(--purple-bg)', color: 'var(--purple)' }}
              >
                <span>★ Agent Assessment</span>
                <span className="text-[10px] ml-1.5" style={{ color: 'var(--fg4)', fontWeight: 400 }}>
                  45 min ago
                </span>
                {actionTaskId != null && (
                  <button
                    onClick={() => setActionModalOpen(true)}
                    className="ml-auto text-[11px] font-semibold hover:underline"
                    style={{
                      color: 'var(--blue)',
                      background: 'transparent',
                      border: 0,
                      padding: 0,
                      cursor: 'pointer',
                    }}
                  >
                    Open in Actions
                  </button>
                )}
              </div>
              <div className="p-4">
                {/* Recommendation banner */}
                <div
                  className="px-3 py-2.5 mb-3.5 rounded-r-lg"
                  style={{
                    background: 'linear-gradient(135deg, var(--green-bg) 0%, transparent 85%)',
                    borderLeft: '3px solid var(--green)',
                  }}
                >
                  <div
                    className="text-[10px] font-bold tracking-[0.4px]"
                    style={{ color: 'var(--green)' }}
                  >
                    RECOMMENDATION
                  </div>
                  <div
                    className="text-[14px] font-bold mt-0.5"
                    style={{ color: 'var(--fg)' }}
                  >
                    {stageOverview.recommendation}
                  </div>
                  <div className="text-[11px] mt-1" style={{ color: 'var(--fg3)' }}>
                    Confidence{' '}
                    <b style={{ color: 'var(--green)' }}>High · 92%</b> · 6/6 rules passed · 3 precedent matches
                  </div>
                </div>

                {/* Eligibility scorecard */}
                <div className="flex flex-col gap-1 mb-3.5">
                  <ScoreRow label="Credit Score" value={`${data.metrics.creditScore} / 620`} />
                  <ScoreRow label="DTI" value={`${data.metrics.dti}% / 43%`} />
                  <ScoreRow label="LTV" value={`${data.metrics.ltv}% / 95% (PMI)`} />
                  <ScoreRow label="Employment" value="4y, re-verified" />
                  <ScoreRow label="OFAC" value="Clear" />
                </div>

                {/* Notable */}
                <div
                  className="text-[12px] leading-relaxed mb-3.5"
                  style={{ color: 'var(--fg2)' }}
                >
                  <b style={{ color: 'var(--fg)' }}>Notable:</b> employment changed mid-process (TechCorp →
                  NovaTech, +$10K base). DTI improved to {data.metrics.dti}% post re-classification.
                  First-time buyer, 0 derogatories.
                </div>

                {/* Likely UW conditions */}
                <div
                  className="text-[11.5px] leading-relaxed mb-3.5 px-2.5 py-2 rounded-md"
                  style={{ background: 'var(--elevated)', color: 'var(--fg3)' }}
                >
                  <b style={{ color: 'var(--fg2)' }}>Likely UW conditions:</b> appraisal · PMI binder ·
                  fresh VOE post-start · insurance quote · gift-funds letter
                </div>

                <div className="flex gap-2 flex-wrap">
                  <button
                    disabled={approving}
                    onClick={onApprove}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-60"
                    style={{ background: 'var(--green)' }}
                  >
                    {approving ? 'Approving…' : stageOverview.approveLabel}
                  </button>
                  <button
                    onClick={onJumpToCaseManager}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold"
                    style={{
                      background: 'var(--surface)',
                      color: 'var(--fg2)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    View Case Manager
                  </button>
                  <button
                    onClick={onJumpToHistory}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold"
                    style={{
                      background: 'var(--surface)',
                      color: 'var(--fg2)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    View History
                  </button>
                </div>
              </div>
            </Card>
            )}

            <Card>
              <CardHeader>
                <span>Key Information</span>
              </CardHeader>
              <div className="grid grid-cols-2">
                <KF label="Loan Amount" value={data.loanTerms.amount} />
                <KF label="Property" value={data.property.address.split(',').slice(0, -1).join(',')} />
                <KF label="Loan Type" value={data.loanTerms.type} />
                <KF label="Rate" value={data.loanTerms.rate} />
                <KF
                  label="DTI"
                  value={`${data.metrics.dti}% ✓`}
                  valueStyle={{ color: 'var(--green)' }}
                />
                <KF label="Credit Score" value={data.metrics.creditScore} />
                <KF label="LTV" value={`${data.metrics.ltv}%`} />
                <KF label="Down Payment" value={data.metrics.downPayment} />
              </div>
            </Card>

            <Card>
              <CardHeader>
                <span>Pending</span>
                <Pill tone="amber" className="text-[10px]">
                  1
                </Pill>
              </CardHeader>
              <div className="p-4 flex items-center gap-2.5">
                <div
                  className="w-4 h-4 rounded-md flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                  style={{ background: 'var(--blue)' }}
                >
                  !
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-semibold" style={{ color: 'var(--fg)' }}>
                    {stageOverview.pendingTask}
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--fg4)' }}>
                    Due: {stageOverview.pendingTaskDue}
                  </div>
                </div>
                <button
                  onClick={() => toast('Done.')}
                  className="px-3 py-1 rounded-lg text-[11px] font-semibold text-white"
                  style={{ background: 'var(--green)' }}
                >
                  Complete
                </button>
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-3">
            <Card>
              <CardHeader>
                <span>Borrower</span>
              </CardHeader>
              <div className="p-4">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-semibold"
                    style={{ background: 'linear-gradient(135deg,#EC4899,#F43F5E)' }}
                  >
                    {data.borrower.initials}
                  </div>
                  <div>
                    <div className="font-semibold text-[13px]" style={{ color: 'var(--fg)' }}>
                      {data.borrower.fullName}
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--fg4)' }}>
                      {data.borrower.city}, {data.borrower.state}
                    </div>
                  </div>
                </div>
                <div className="text-xs flex flex-col gap-1.5">
                  <SideRow l="Income" v={data.borrower.income} />
                  <SideRow l="Employment" v={data.borrower.employmentYears} />
                  <SideRow l="First-time" v={data.borrower.firstTime ? 'Yes' : 'No'} />
                </div>
              </div>
            </Card>
            <Card>
              <CardHeader>
                <span>Case Metrics</span>
              </CardHeader>
              <div className="p-4 text-xs flex flex-col gap-1.5">
                <SideRow l="Duration" v="4 days" />
                <SideRow l="Events" v="11" />
                <SideRow l="Agent Actions" v="8" valueColor="var(--purple)" />
                <SideRow l="Auto-Resolved" v="10/11" valueColor="var(--purple)" />
              </div>
            </Card>
            <SimilarCasesCard />
          </div>
        </div>
      </div>
      {actionTaskId != null && (
        <ActionEmbedModal
          open={actionModalOpen}
          onClose={() => setActionModalOpen(false)}
          taskId={actionTaskId}
          embedUrl={embedActionCenterUrlForTask(actionTaskId) ?? ''}
          externalUrl={actionCenterUrlForTask(actionTaskId)}
        />
      )}
    </div>
  );
}

function ScoreRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs"
      style={{ background: 'var(--elevated)' }}
    >
      <span
        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
        style={{ background: 'var(--green-bg)', color: 'var(--green)' }}
      >
        PASS
      </span>
      <span className="font-medium flex-1" style={{ color: 'var(--fg)' }}>
        {label}
      </span>
      <span className="font-semibold" style={{ color: 'var(--fg)' }}>
        {value}
      </span>
    </div>
  );
}

function KF({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: React.ReactNode;
  valueStyle?: React.CSSProperties;
}) {
  return (
    <div
      className="px-3.5 py-2.5"
      style={{
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="text-[10px] mb-0.5" style={{ color: 'var(--fg4)' }}>
        {label}
      </div>
      <div className="text-[13px] font-semibold" style={{ color: 'var(--fg)', ...valueStyle }}>
        {value}
      </div>
    </div>
  );
}

function SideRow({ l, v, valueColor }: { l: string; v: React.ReactNode; valueColor?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span style={{ color: 'var(--fg3)' }}>{l}</span>
      <span className="font-medium" style={{ color: valueColor ?? 'var(--fg2)' }}>
        {v}
      </span>
    </div>
  );
}

function SkeletonBar({ width = '100%', height = 12 }: { width?: string; height?: number }) {
  return (
    <div
      className="lp-shimmer-wrap rounded"
      style={{ width, height, background: 'var(--elevated)' }}
    />
  );
}

function SkeletonCard({ height }: { height: number }) {
  return (
    <Card>
      <div className="p-4 flex flex-col gap-2.5" style={{ height }}>
        <SkeletonBar width="40%" height={14} />
        <SkeletonBar width="80%" />
        <SkeletonBar width="65%" />
        <SkeletonBar width="72%" />
      </div>
    </Card>
  );
}

function OverviewSkeleton() {
  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid gap-3.5" style={{ gridTemplateColumns: '1fr 300px' }}>
          <div className="flex flex-col gap-3">
            <SkeletonCard height={260} />
            <SkeletonCard height={160} />
            <SkeletonCard height={90} />
          </div>
          <div className="flex flex-col gap-3">
            <SkeletonCard height={170} />
            <SkeletonCard height={130} />
            <SkeletonCard height={170} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StageTransitionCard({ from, to }: { from: LoanStage; to: LoanStage }) {
  return (
    <Card style={{ borderColor: 'var(--blue-bd, var(--border))' }}>
      <div
        className="px-4 py-3 text-xs font-semibold flex items-center gap-2"
        style={{ background: 'var(--blue-bg, var(--elevated))', color: 'var(--blue)' }}
      >
        <span>Processing transition</span>
      </div>
      <div className="p-6 flex flex-col items-center text-center gap-3">
        <div
          className="w-9 h-9 rounded-full"
          style={{
            border: '3px solid var(--border)',
            borderTopColor: 'var(--blue)',
            animation: 'lp-spin 0.8s linear infinite',
          }}
        />
        <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--fg)' }}>
          <span className="font-semibold">{from}</span>
          <span style={{ color: 'var(--fg4)' }}>→</span>
          <span className="font-semibold" style={{ color: 'var(--blue)' }}>{to}</span>
        </div>
        <div className="text-[11px]" style={{ color: 'var(--fg4)' }}>
          Case Manager is advancing the case. This may take a few moments.
        </div>
      </div>
    </Card>
  );
}

