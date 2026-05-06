import type { CaseManagerMessage, LoanStage, TimelineEvent, ToolCall } from '../types/loan';
import { LOAN_STAGES } from '../types/loan';

export interface StageOverview {
  recommendation: string;
  approveLabel: string;
  approveToast: string;
  pendingTask: string;
  pendingTaskDue: string;
}

interface StageCaseManager {
  activatedSummary: string;
  toolCalls: ToolCall[];
  actionCardText: string;
}

interface StageDefinition {
  overview: StageOverview;
  caseManager: StageCaseManager;
}

const STAGE_DEFINITIONS: Record<LoanStage, StageDefinition> = {
  Intake: {
    overview: {
      recommendation: 'Approve and advance to Processing',
      approveLabel: 'Approve & Move to Processing',
      approveToast: 'Approved. Moving to Processing.',
      pendingTask: 'Intake review',
      pendingTaskDue: 'Apr 9',
    },
    caseManager: {
      activatedSummary: 'New application received. Entry conditions met. Running 5 tasks in parallel.',
      toolCalls: [
        { id: 'in1', label: 'Eligibility screening', state: 'done', result: 'Eligible — conventional 30yr fixed', resultTone: 'success' },
        { id: 'in2', label: 'Credit report', state: 'done', result: 'Score: 756 (Excellent)', resultTone: 'success' },
        { id: 'in3', label: 'Sanctions screening', state: 'done', result: 'OFAC clear', resultTone: 'success' },
        { id: 'in4', label: 'Loan estimate disclosure', state: 'done', result: 'Delivered to borrower', resultTone: 'success' },
        { id: 'in5', label: 'Intake review', state: 'wait', result: 'Needs your review before Processing', resultTone: 'amber' },
      ],
      actionCardText: 'Intake complete. Approve intake review to move to Processing.',
    },
  },
  Processing: {
    overview: {
      recommendation: 'Approve and advance to Underwriting',
      approveLabel: 'Approve & Move to Underwriting',
      approveToast: 'Approved. Moving to Underwriting.',
      pendingTask: 'Review & confirm loan package',
      pendingTaskDue: 'Apr 12',
    },
    caseManager: {
      activatedSummary: 'Running document extraction, income classification, and third-party orders.',
      toolCalls: [
        { id: 'pr1', label: 'Extract & validate documents', state: 'done', result: 'Pay stubs, W-2s, bank statements verified', resultTone: 'success' },
        { id: 'pr2', label: 'Income classification', state: 'done', result: 'Qualifying income: $118K · DTI: 29.8%', resultTone: 'success' },
        { id: 'pr3', label: 'Title search request', state: 'done', result: 'Ordered via First American', resultTone: 'success' },
        { id: 'pr4', label: 'Wait for appraisal & title', state: 'done', result: 'Appraisal $500K · Title clean', resultTone: 'success' },
        { id: 'pr5', label: 'Review & confirm loan package', state: 'wait', result: 'Needs your review before Underwriting', resultTone: 'amber' },
      ],
      actionCardText: 'Loan package complete. All documents verified, income classified. Approve to move to Underwriting.',
    },
  },
  Underwriting: {
    overview: {
      recommendation: 'Approve and advance to QA/QC',
      approveLabel: 'Approve & Move to QA/QC',
      approveToast: 'Approved. Moving to QA/QC.',
      pendingTask: 'Underwriting review',
      pendingTaskDue: 'Apr 16',
    },
    caseManager: {
      activatedSummary: 'Running risk assessment, condition clearing, and collateral checks.',
      toolCalls: [
        { id: 'uw1', label: 'Automated risk assessment', state: 'done', result: 'Approve/eligible — no overlay flags', resultTone: 'success' },
        { id: 'uw2', label: 'Condition clearing', state: 'done', result: 'All standard conditions cleared', resultTone: 'success' },
        { id: 'uw3', label: 'Collateral risk assessment', state: 'done', result: 'LTV 85% — no value concerns', resultTone: 'success' },
        { id: 'uw4', label: 'Fraud detection', state: 'done', result: 'No fraud indicators', resultTone: 'success' },
        { id: 'uw5', label: 'Underwriting review', state: 'wait', result: 'Needs your review before QA/QC', resultTone: 'amber' },
      ],
      actionCardText: 'Underwriting checks complete. Approve the underwriting review to move to QA/QC.',
    },
  },
  'QA/QC': {
    overview: {
      recommendation: 'Approve and advance to Closing',
      approveLabel: 'Approve & Move to Closing',
      approveToast: 'Approved. Moving to Closing.',
      pendingTask: 'QC analyst review',
      pendingTaskDue: 'Apr 18',
    },
    caseManager: {
      activatedSummary: 'Running compliance, audit, and investor checks.',
      toolCalls: [
        { id: 'qc1', label: 'Compliance check', state: 'done', result: 'TRID / HMDA / RESPA clean', resultTone: 'success' },
        { id: 'qc2', label: 'Full audit', state: 'done', result: 'Documentation audit pass', resultTone: 'success' },
        { id: 'qc3', label: 'Stacking order & completeness', state: 'done', result: 'All required docs present', resultTone: 'success' },
        { id: 'qc4', label: 'Investor guidelines check', state: 'done', result: 'Guidelines met', resultTone: 'success' },
        { id: 'qc5', label: 'QC analyst review', state: 'wait', result: 'Needs your review before Closing', resultTone: 'amber' },
      ],
      actionCardText: 'QA/QC checks complete. Approve the QC analyst review to move to Closing.',
    },
  },
  Closing: {
    overview: {
      recommendation: 'Approve and advance to Post Closing',
      approveLabel: 'Approve & Move to Post Closing',
      approveToast: 'Approved. Moving to Post Closing.',
      pendingTask: 'Final closing review',
      pendingTaskDue: 'Apr 22',
    },
    caseManager: {
      activatedSummary: 'Preparing closing documents and tolerance comparisons.',
      toolCalls: [
        { id: 'cl1', label: 'CD vs LE tolerance comparison', state: 'done', result: 'Within tolerances', resultTone: 'success' },
        { id: 'cl2', label: 'Closing document preparation', state: 'done', result: 'Closing package generated', resultTone: 'success' },
        { id: 'cl3', label: 'Audit logging', state: 'done', result: 'All actions logged', resultTone: 'success' },
        { id: 'cl4', label: 'Final closing review', state: 'wait', result: 'Needs your review before Post Closing', resultTone: 'amber' },
      ],
      actionCardText: 'Closing package ready. Approve the final closing review to move to Post Closing.',
    },
  },
  'Post Closing': {
    overview: {
      recommendation: 'Case ready to close',
      approveLabel: 'Close case',
      approveToast: 'Case closed.',
      pendingTask: 'Final document audit',
      pendingTaskDue: 'Apr 24',
    },
    caseManager: {
      activatedSummary: 'Running final audit, EPD scoring, funding, and investor delivery.',
      toolCalls: [
        { id: 'pc1', label: 'EPD risk scoring', state: 'done', result: 'Low EPD risk', resultTone: 'success' },
        { id: 'pc2', label: 'Funding and disbursement', state: 'done', result: 'Funds disbursed', resultTone: 'success' },
        { id: 'pc3', label: 'Investor delivery', state: 'done', result: 'Delivered to investor', resultTone: 'success' },
        { id: 'pc4', label: 'Final document audit', state: 'wait', result: 'Final audit in progress', resultTone: 'amber' },
      ],
      actionCardText: 'Final audit pending. Confirm to close the case.',
    },
  },
};

export function getStageOverview(stage: LoanStage): StageOverview {
  return STAGE_DEFINITIONS[stage].overview;
}

// Per-stage timeline events, ordered oldest → newest within the stage.
// For the *current* (active) stage, show in-progress/agent activity entries; for
// completed stages, show the completion signals.
const STAGE_TIMELINE: Record<LoanStage, { active: TimelineEvent[]; completed: TimelineEvent[] }> = {
  Intake: {
    active: [
      {
        id: 'tl-in-1',
        title: 'Intake activated',
        time: 'Apr 8, 3:00 PM',
        detail: 'New application received. Entry conditions met. All Intake tasks triggered.',
        dot: 'blue',
      },
      {
        id: 'tl-in-2',
        title: 'Credit pulled — Score: 756',
        time: 'Apr 8, 3:20 PM',
        detail: 'Excellent score. No derogatory marks.',
        dot: 'green',
      },
    ],
    completed: [
      {
        id: 'tl-in-3',
        title: 'Intake complete — 5 tasks resolved',
        time: 'Apr 8, 3:42 PM',
        detail: 'Eligibility, credit, loan estimate, sanctions, application validation. Approved to Processing.',
        dot: 'green',
      },
    ],
  },
  Processing: {
    active: [
      {
        id: 'tl-pr-1',
        title: 'Processing activated',
        time: 'Apr 9, 10:12 AM',
        detail: 'Entry conditions met. Ordered appraisal and title search. Documents queued for extraction.',
        dot: 'blue',
      },
      {
        id: 'tl-pr-2',
        title: 'Documents extracted & validated',
        time: 'Apr 9, 8:30 AM',
        detail: 'Pay stubs, W-2s, bank statements verified.',
        dot: 'green',
      },
      {
        id: 'tl-pr-3',
        title: 'Income classified — DTI 31.4%',
        time: 'Apr 9, 9:45 AM',
        detail: 'External agent classified income sources and calculated qualifying income.',
        dot: 'green',
      },
      {
        id: 'tl-pr-4',
        title: 'Loan officer comment + attachments',
        time: 'Apr 10, 2:30 PM',
        detail: 'Dhruv Patel noted borrower employment change. Uploaded termination and offer letters.',
        dot: 'amber',
      },
      {
        id: 'tl-pr-5',
        title: 'Agent reasoning: employment change',
        time: 'Apr 10, 2:31 PM',
        detail: 'Detected material change. Extracted new offer letter, re-classified income, re-verified employment. DTI improved to 29.8%.',
        dot: 'purple',
      },
    ],
    completed: [
      {
        id: 'tl-pr-6',
        title: 'Appraisal received — $500K',
        time: 'Apr 11, 9:15 AM',
        detail: 'First American appraisal delivered. LTV recalculated at 85%.',
        dot: 'green',
      },
      {
        id: 'tl-pr-7',
        title: 'Processing complete — package ready',
        time: 'Apr 11, 4:50 PM',
        detail: 'All Processing tasks resolved. Package handed to Underwriting. Approved to UW.',
        dot: 'green',
      },
    ],
  },
  Underwriting: {
    active: [
      {
        id: 'tl-uw-1',
        title: 'Underwriting activated',
        time: 'Apr 12, 9:00 AM',
        detail: 'Risk assessment agent fired. Pulling final DTI, LTV, and credit re-check.',
        dot: 'blue',
      },
      {
        id: 'tl-uw-2',
        title: 'DTI re-evaluated — 29.8%',
        time: 'Apr 12, 9:42 AM',
        detail: 'Post-employment-change income confirmed. Below 43% threshold.',
        dot: 'green',
      },
      {
        id: 'tl-uw-3',
        title: 'Agent reasoning: risk profile',
        time: 'Apr 12, 11:15 AM',
        detail: '6/6 underwriting rules passed. 3 precedent matches at 92% confidence. No red flags.',
        dot: 'purple',
      },
    ],
    completed: [
      {
        id: 'tl-uw-4',
        title: 'Underwriting decision — Conditional approval',
        time: 'Apr 13, 2:30 PM',
        detail: 'Conditions: appraisal, PMI binder, fresh VOE post-start, insurance quote, gift-funds letter.',
        dot: 'green',
      },
    ],
  },
  'QA/QC': {
    active: [
      {
        id: 'tl-qa-1',
        title: 'QA/QC activated',
        time: 'Apr 14, 10:00 AM',
        detail: 'Compliance review queued. Document package validation in progress.',
        dot: 'blue',
      },
      {
        id: 'tl-qa-2',
        title: 'Compliance check passed',
        time: 'Apr 14, 1:20 PM',
        detail: 'TRID, RESPA, and state-specific disclosures verified.',
        dot: 'green',
      },
    ],
    completed: [
      {
        id: 'tl-qa-3',
        title: 'QA/QC complete',
        time: 'Apr 14, 4:15 PM',
        detail: 'All quality checks resolved. Cleared to Closing.',
        dot: 'green',
      },
    ],
  },
  Closing: {
    active: [
      {
        id: 'tl-cl-1',
        title: 'Closing activated',
        time: 'Apr 15, 9:00 AM',
        detail: 'Closing disclosure scheduled. Title and escrow coordinating signing.',
        dot: 'blue',
      },
      {
        id: 'tl-cl-2',
        title: 'Closing disclosure delivered',
        time: 'Apr 15, 11:30 AM',
        detail: '3-day waiting period started. Borrower e-signed receipt.',
        dot: 'green',
      },
    ],
    completed: [
      {
        id: 'tl-cl-3',
        title: 'Loan funded — $425K wired',
        time: 'Apr 18, 3:00 PM',
        detail: 'Funds wired to escrow. Documents executed and recorded.',
        dot: 'green',
      },
    ],
  },
  'Post Closing': {
    active: [
      {
        id: 'tl-pc-1',
        title: 'Post Closing activated',
        time: 'Apr 19, 9:00 AM',
        detail: 'Loan boarded to servicing. Investor delivery package being assembled.',
        dot: 'blue',
      },
    ],
    completed: [],
  },
};

export function buildTimelineForStage(stage: LoanStage): TimelineEvent[] {
  const stageIdx = LOAN_STAGES.indexOf(stage);
  if (stageIdx < 0) return [];
  const events: TimelineEvent[] = [];
  for (let i = 0; i <= stageIdx; i++) {
    const s = LOAN_STAGES[i];
    const buckets = STAGE_TIMELINE[s];
    events.push(...buckets.active);
    if (i < stageIdx) events.push(...buckets.completed);
  }
  // Newest first.
  return events.reverse();
}

export function buildCaseManagerThread(
  stage: LoanStage,
  baseThread: CaseManagerMessage[],
): CaseManagerMessage[] {
  const stageIdx = LOAN_STAGES.indexOf(stage);
  if (stageIdx <= 1) return baseThread;

  // Drop the existing Processing actionCard — it's no longer the active step.
  const cleaned = baseThread.map((m) =>
    m.id === 'cm3' && m.actionCard ? { ...m, actionCard: undefined } : m,
  );
  const out: CaseManagerMessage[] = [...cleaned];

  for (let i = 2; i <= stageIdx; i++) {
    const cur = LOAN_STAGES[i];
    const prev = LOAN_STAGES[i - 1];
    out.push({
      id: `cm-trans-${cur}`,
      kind: 'stage-transition',
      transition: { label: `${prev} → ${cur}`, state: 'done' },
    });
    const def = STAGE_DEFINITIONS[cur].caseManager;
    const isCurrent = i === stageIdx;
    out.push({
      id: `cm-${cur.replace(/[^A-Za-z]/g, '')}-active`,
      kind: 'agent',
      actor: 'Case Manager',
      mode: 'rules',
      paragraphs: [
        { bold: `${cur} activated.`, text: ` ${def.activatedSummary}` },
      ],
      toolCalls: isCurrent
        ? def.toolCalls
        : def.toolCalls.map((c) =>
            c.state === 'wait' ? { ...c, state: 'done', result: 'Approved', resultTone: 'success' } : c,
          ),
      actionCard: isCurrent
        ? {
            label: 'Ready for your review',
            text: def.actionCardText,
            approveLabel: 'Approve',
            secondaryLabel: 'View Details',
            onApproveToast: STAGE_DEFINITIONS[cur].overview.approveToast,
          }
        : undefined,
    });
  }
  return out;
}
