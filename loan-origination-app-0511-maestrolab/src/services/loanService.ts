import { CaseInstances } from '@uipath/uipath-typescript/cases';
import type { CaseGetStageResponse, CaseInstanceGetResponse } from '@uipath/uipath-typescript/cases';
import { Entities } from '@uipath/uipath-typescript/entities';
import type {
  EntityInsertResponse,
  EntityRecord,
  FieldMetaData,
} from '@uipath/uipath-typescript/entities';
import { Tasks, TaskType } from '@uipath/uipath-typescript/tasks';
import type { TaskCompleteOptions, TaskGetResponse } from '@uipath/uipath-typescript/tasks';
import type { UiPath } from '@uipath/uipath-typescript/core';
import { UiPathError } from '@uipath/uipath-typescript/core';
import type { LoanCase, LoanStage } from '../types/loan';

const CASE_ID = import.meta.env.VITE_CASE_ID ?? '';
const APPROVE_WEBHOOK_URL = import.meta.env.VITE_APPROVE_WEBHOOK_URL ?? '';
const LOAN_ENTITY_ID = import.meta.env.VITE_LOAN_ENTITY_ID ?? '';
const DOCUMENTS_ENTITY_ID =
  import.meta.env.VITE_DOCUMENTS_ENTITY_ID ?? '69c36a54-5e4a-f111-8ef3-000d3a261acd';

function hashSeed(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

const STAGES: LoanStage[] = ['Intake', 'Processing', 'Underwriting', 'QA/QC', 'Closing', 'Post Closing'];
const BORROWER_POOL = [
  'Priya Sharma',
  'Marcus Johnson',
  'Wei Zhang',
  'James Chen',
  'Angela Brooks',
  'Elena Rodriguez',
  'David Kim',
  'Isabella Moreno',
  'Jordan Blake',
  'Amara Okafor',
];
const LOAN_TYPE_POOL = ['Conv. 30yr Fixed', 'FHA 30yr', 'VA 30yr', 'Jumbo 30yr', 'Conv. 15yr Fixed'];

function mapInstanceToLoan(instance: CaseInstanceGetResponse): LoanCase {
  const seed = hashSeed(instance.instanceId);
  const borrowerName = instance.instanceDisplayName?.trim() || BORROWER_POOL[seed % BORROWER_POOL.length];
  const amount = 200000 + (seed % 600) * 1000;
  const loanType = LOAN_TYPE_POOL[seed % LOAN_TYPE_POOL.length];
  const runStatus = instance.latestRunStatus || 'Running';
  let stage: LoanStage;
  let status: LoanCase['status'];
  let slaState: LoanCase['slaState'];
  let agentIndicator: string;

  const runStatusLower = runStatus.toLowerCase();

  if (runStatusLower === 'completed' || runStatusLower === 'success' || runStatusLower === 'successful') {
    stage = 'Post Closing';
    status = 'Completed';
    slaState = 'On Track';
    agentIndicator = 'Complete';
  } else if (runStatusLower === 'faulted' || runStatusLower === 'cancelled' || runStatusLower === 'canceled') {
    stage = STAGES[(seed % 4) + 1];
    status = 'At Risk';
    slaState = 'At Risk';
    agentIndicator = 'Escalation';
  } else {
    stage = STAGES[(seed % 5) + 1];
    const variant = seed % 5;
    status = variant < 3 ? 'Active' : 'On Track';
    slaState = variant === 0 ? '48h' : variant === 1 ? 'At Risk' : 'On Track';
    agentIndicator =
      variant === 0
        ? 'Rate lock'
        : variant === 1
          ? 'DTI'
          : variant === 2
            ? 'Review'
            : variant === 3
              ? 'Compliance'
              : 'Handled';
  }

  return {
    caseInstanceId: instance.instanceId,
    folderKey: instance.folderKey,
    caseId: `LA-${new Date(instance.startedTime).getFullYear()}-${instance.instanceId.slice(0, 5).toUpperCase()}`,
    borrowerName,
    amount,
    loanType,
    stage,
    status,
    slaState,
    agentIndicator,
    lastUpdated: instance.completedTime || instance.startedTime || new Date().toISOString(),
    runStatus,
    isReal: true,
    startedTime: instance.startedTime,
    completedTime: instance.completedTime,
  };
}

export async function fetchLoanCases(sdk: UiPath): Promise<{ cases: LoanCase[]; usedFallback: boolean }> {
  try {
    const caseInstances = new CaseInstances(sdk);
    const result = await caseInstances.getAll({ processKey: CASE_ID, pageSize: 50 });
    const cases = result.items.map(mapInstanceToLoan);
    return { cases, usedFallback: false };
  } catch (err) {
    if (err instanceof UiPathError) {
      console.warn('Falling back to mock loans:', err.message);
    } else {
      console.warn('Falling back to mock loans:', err);
    }
    return { cases: [], usedFallback: true };
  }
}

export async function fetchLoanCaseById(
  sdk: UiPath,
  caseInstanceId: string,
  folderKey: string,
): Promise<LoanCase | null> {
  try {
    const caseInstances = new CaseInstances(sdk);
    const instance = await caseInstances.getById(caseInstanceId, folderKey);
    return mapInstanceToLoan(instance);
  } catch (err) {
    console.warn('fetchLoanCaseById failed', err);
    return null;
  }
}

// Resolves folderKey via PIMS when the URL doesn't carry it. Each instance
// in the getAll response carries its own folderKey at instances[i].folderKey,
// so we look it up by matching instanceId.
export async function fetchFolderKeyByInstanceId(
  sdk: UiPath,
  caseInstanceId: string,
): Promise<string | null> {
  try {
    const caseInstances = new CaseInstances(sdk);
    const result = await caseInstances.getAll({ processKey: CASE_ID, pageSize: 100 });
    const match = result.items.find((i) => i.instanceId === caseInstanceId);
    return match?.folderKey ?? null;
  } catch (err) {
    console.warn('fetchFolderKeyByInstanceId failed', err);
    return null;
  }
}

export async function fetchCaseStages(
  sdk: UiPath,
  caseInstanceId: string,
  folderKey: string,
): Promise<CaseGetStageResponse[] | null> {
  try {
    const caseInstances = new CaseInstances(sdk);
    const stages = await caseInstances.getStages(caseInstanceId, folderKey);
    if (import.meta.env.DEV) {
      console.debug(
        '[stages]',
        stages.map((s) => ({
          name: s.name,
          status: s.status,
          tasks: (s.tasks ?? []).flat().map((t) => ({ name: t?.name, status: t?.status })),
        })),
      );
    }
    return stages;
  } catch (err) {
    console.warn('fetchCaseStages failed', err);
    return null;
  }
}

// Pulls Action Center / HITL tasks (App + Form types) and filters to those
// associated with the given case instance. Maestro stamps a reference to the
// case run on each task — we check the common spots: taskSource.sourceId,
// taskSource.taskSourceMetadata, parentOperationId, externalTag, and data —
// because the exact field varies by task source/version.
export async function fetchTasksForCaseInstance(
  sdk: UiPath,
  caseInstanceId: string,
): Promise<TaskGetResponse[]> {
  if (!caseInstanceId) return [];
  try {
    const tasks = new Tasks(sdk);
    const result = await tasks.getAll({ pageSize: 200 });
    const matched = result.items.filter((t) => taskMatchesInstance(t, caseInstanceId));
    if (import.meta.env.DEV) {
      console.debug('[tasks]', {
        caseInstanceId,
        totalScanned: result.items.length,
        matched: matched.length,
      });
    }
    return matched;
  } catch (err) {
    console.warn('fetchTasksForCaseInstance failed', err);
    return [];
  }
}

function taskMatchesInstance(task: TaskGetResponse, caseInstanceId: string): boolean {
  const id = caseInstanceId.toLowerCase();
  const candidates: (string | null | undefined)[] = [
    task.taskSource?.sourceId,
    task.parentOperationId,
    task.externalTag,
  ];
  if (candidates.some((v) => typeof v === 'string' && v.toLowerCase() === id)) return true;
  // Maestro sometimes stashes the instance id inside metadata or input data —
  // do a substring scan as a fallback so we don't miss them.
  const meta = task.taskSource?.taskSourceMetadata;
  if (meta && JSON.stringify(meta).toLowerCase().includes(id)) return true;
  if (task.data && JSON.stringify(task.data).toLowerCase().includes(id)) return true;
  return false;
}

function matchLoanStage(name: string): LoanStage | null {
  const n = name.toLowerCase().replace(/[\s_/-]+/g, '');
  if (n.includes('postclos')) return 'Post Closing';
  if (n.includes('intake')) return 'Intake';
  if (n.includes('process')) return 'Processing';
  if (n.includes('underwrit') || n === 'uw') return 'Underwriting';
  if (n.includes('qa') || n.includes('qc') || n.includes('quality')) return 'QA/QC';
  if (n.includes('clos')) return 'Closing';
  return null;
}

function normalizeStatus(status: string | undefined): string {
  return (status ?? '').toLowerCase().replace(/[^a-z]/g, '');
}

const IN_PROGRESS_STATUSES = new Set([
  'running',
  'inprogress',
  'active',
  'started',
  'starting',
  'paused',
  'waiting',
  'pending',
  'inreview',
]);

const COMPLETED_STATUSES = new Set([
  'completed',
  'complete',
  'done',
  'success',
  'successful',
  'succeeded',
  'finished',
]);

type StageState = 'notstarted' | 'inprogress' | 'completed';

function classifyStage(stage: CaseGetStageResponse): StageState {
  const stageStatus = normalizeStatus(stage.status);
  if (COMPLETED_STATUSES.has(stageStatus)) return 'completed';
  if (IN_PROGRESS_STATUSES.has(stageStatus)) return 'inprogress';

  const tasks = (stage.tasks ?? []).flat().filter(Boolean);
  if (tasks.length === 0) return 'notstarted';

  const statuses = tasks.map((t) => normalizeStatus(t?.status));
  const allCompleted = statuses.every((s) => COMPLETED_STATUSES.has(s));
  if (allCompleted) return 'completed';

  const anyStartedOrRunning = statuses.some(
    (s) => IN_PROGRESS_STATUSES.has(s) || COMPLETED_STATUSES.has(s),
  );
  if (anyStartedOrRunning) return 'inprogress';

  return 'notstarted';
}

export function deriveCurrentStage(stages: CaseGetStageResponse[] | null | undefined): LoanStage | null {
  if (!stages || stages.length === 0) return null;

  const mapped = stages
    .map((s) => ({
      stage: matchLoanStage(s.name),
      state: classifyStage(s),
    }))
    .filter((m): m is { stage: LoanStage; state: StageState } => m.stage !== null);

  if (mapped.length === 0) return null;

  // Pick the furthest-progressed stage with activity. Ad-hoc tasks defined in
  // the case JSON but never triggered stay "Not Started", so multiple earlier
  // stages can look in-progress simultaneously — the latest one is current.
  let lastInProgressIdx = -1;
  let lastCompletedIdx = -1;
  mapped.forEach((m, i) => {
    if (m.state === 'inprogress') lastInProgressIdx = i;
    if (m.state === 'completed') lastCompletedIdx = i;
  });

  if (lastInProgressIdx >= 0) return mapped[lastInProgressIdx].stage;

  if (lastCompletedIdx >= 0) {
    if (lastCompletedIdx + 1 < mapped.length) return mapped[lastCompletedIdx + 1].stage;
    return mapped[lastCompletedIdx].stage;
  }

  return mapped[0].stage;
}

export interface NewLoanApplicationInput {
  loanType: string;
  loanAmount: number;
  applicantId: string;
}

// Creates a new LoanOriginationEntity row in DataFabric. Mirrors the curl
// example in AGENTS.md — null-fills all of the per-stage boolean flags so
// the case process picks the row up in its initial state.
export async function createLoanApplication(
  sdk: UiPath,
  input: NewLoanApplicationInput,
): Promise<EntityInsertResponse> {
  if (!LOAN_ENTITY_ID) {
    throw new Error('VITE_LOAN_ENTITY_ID is not configured');
  }
  const entities = new Entities(sdk);
  const data: Record<string, unknown> = {
    LoanType: input.loanType,
    LoanAmount: input.loanAmount,
    ApplicationStatus: 'New',
    IsClosed: null,
    IsEscalated: null,
    IsRejected: null,
    IsWithdrawn: null,
    DocumentsRequested: null,
    EligibilityScreeningComplete: null,
    IntakeReviewComplete: null,
    ExtractDocsComplete: null,
    LoanPackageReviewComplete: null,
    UnderwritingReviewComplete: null,
    ComplianceComplete: null,
    FullAuditComplete: null,
    QCComplete: null,
    CDLEComparisonComplete: null,
    FundingComplete: null,
    InvestorDeliveryComplete: null,
    Applicant: { Id: input.applicantId },
    UnderwritingJobs: null,
    DisclosureDelivered: null,
    AppraisalComplete: null,
    DisclosureAcknowledged: null,
    RiskAssessmentComplete: null,
  };
  return entities.insertRecordById(LOAN_ENTITY_ID, data);
}

export interface LoanApplicationRecord {
  recordId: string;
  caseInstanceId: string | null;
  loanType: string | null;
  loanAmount: number | null;
  applicationStatus: string | null;
  createTime: string | null;
  applicantId: string | null;
}

// Maestro stamps the case instance id back onto the entity row after the run
// starts; the field name has shifted across builds, so accept a few variants.
const CASE_ID_FIELD_NAMES = ['CaseID', 'CaseId', 'caseId', 'caseID', 'CaseInstanceId'];

const APPLICANT_COMMENTS_ENTITY_ID =
  import.meta.env.VITE_APPLICANT_COMMENTS_ENTITY_ID ?? '284b3576-8657-f111-8fcb-000d3a45fabb';

function readEntityString(record: EntityRecord, ...names: string[]): string | null {
  const keys = Object.keys(record);
  for (const name of names) {
    const key = keys.find((k) => k.toLowerCase() === name.toLowerCase());
    if (!key) continue;
    const v = record[key];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return null;
}

function readEntityNumber(record: EntityRecord, name: string): number | null {
  const key = Object.keys(record).find((k) => k.toLowerCase() === name.toLowerCase());
  if (!key) return null;
  const v = record[key];
  return typeof v === 'number' ? v : null;
}

// Data Fabric reference fields land as either a plain string id or an object
// like { Id, Name, ... } — try both shapes so we don't miss the relation.
function readEntityRefId(record: EntityRecord, ...names: string[]): string | null {
  const keys = Object.keys(record);
  for (const name of names) {
    const key = keys.find((k) => k.toLowerCase() === name.toLowerCase());
    if (!key) continue;
    const v = record[key];
    if (typeof v === 'string' && v.length > 0) return v;
    if (v && typeof v === 'object' && 'Id' in v) {
      const id = (v as { Id: unknown }).Id;
      if (typeof id === 'string' && id.length > 0) return id;
    }
  }
  return null;
}

export async function fetchLoanApplicationRecords(
  sdk: UiPath,
): Promise<LoanApplicationRecord[]> {
  if (!LOAN_ENTITY_ID) return [];
  try {
    const entities = new Entities(sdk);
    const resp = await entities.getAllRecords(LOAN_ENTITY_ID, { pageSize: 200 });
    return resp.items.map((r) => ({
      recordId: r.Id,
      caseInstanceId: readEntityString(r, ...CASE_ID_FIELD_NAMES),
      loanType: readEntityString(r, 'LoanType'),
      loanAmount: readEntityNumber(r, 'LoanAmount'),
      applicationStatus: readEntityString(r, 'ApplicationStatus'),
      createTime: readEntityString(r, 'CreateTime', 'CreatedOn'),
      applicantId: readEntityRefId(r, 'Applicant', 'ApplicantID', 'ApplicantId', 'ApplicantUserID'),
    }));
  } catch (err) {
    console.warn('fetchLoanApplicationRecords failed', err);
    return [];
  }
}

export interface ApplicantComment {
  recordId: string;
  body: string;
  time: string | null;
  author: string | null;
}

// Pulls the applicant-side comments entity and filters client-side to rows
// linked to this loan (LoanID = the LoanOriginationEntity row id) and applicant
// (ApplicantID = the demo applicant id). Field names accept reference-object
// shape because Data Fabric returns relations as { Id, Name, ... }.
export async function fetchApplicantComments(
  sdk: UiPath,
  applicantId: string,
  loanId: string,
): Promise<ApplicantComment[]> {
  if (!APPLICANT_COMMENTS_ENTITY_ID || !applicantId || !loanId) return [];
  try {
    const entities = new Entities(sdk);
    const resp = await entities.getAllRecords(APPLICANT_COMMENTS_ENTITY_ID, { pageSize: 200 });
    if (import.meta.env.DEV) {
      console.log('[applicantComments] fetched', {
        applicantId,
        loanId,
        totalRows: resp.items.length,
        sampleKeys: resp.items[0] ? Object.keys(resp.items[0]) : null,
        sampleRow: resp.items[0],
      });
      // Inline summary of every row's ApplicantID/LoanID so we can eyeball
      // matches without expanding nested object logs.
      resp.items.forEach((r, i) => {
        const rApp = readEntityRefId(
          r,
          'ApplicanID',
          'ApplicantID',
          'ApplicantId',
          'Applicant',
          'ApplicantUserID',
        );
        const rLoan = readEntityRefId(
          r,
          'LoanID',
          'LoanId',
          'Loan',
          'LoanOrigination',
          'LoanOriginationEntity',
        );
        console.log(
          `[applicantComments] row[${i}] id=${r.Id} ApplicantID=${rApp} LoanID=${rLoan}`,
        );
      });
    }
    const normalizeId = (s: string | null) => (s ?? '').trim().toLowerCase();
    const wantApplicant = normalizeId(applicantId);
    const wantLoan = normalizeId(loanId);
    const matched = resp.items.filter((r) => {
      const recApplicantId = readEntityRefId(
        r,
        'ApplicanID',
        'ApplicantID',
        'ApplicantId',
        'Applicant',
        'ApplicantUserID',
      );
      const recLoanId = readEntityRefId(
        r,
        'LoanID',
        'LoanId',
        'Loan',
        'LoanOrigination',
        'LoanOriginationEntity',
      );
      const isMatch =
        normalizeId(recApplicantId) === wantApplicant &&
        normalizeId(recLoanId) === wantLoan;
      if (import.meta.env.DEV && !isMatch) {
        console.log(
          `[applicantComments] skipped row id=${r.Id} ApplicantID=${recApplicantId} LoanID=${recLoanId} (wanted ApplicantID=${applicantId} LoanID=${loanId})`,
        );
      }
      return isMatch;
    });
    const mapped: ApplicantComment[] = matched.map((r) => ({
      recordId: r.Id,
      body:
        readEntityString(
          r,
          'Commentary',
          'Comment',
          'CommentText',
          'Body',
          'Message',
          'Text',
          'Note',
        ) ?? '',
      time: readEntityString(r, 'CreateTime', 'CreatedTime', 'CreatedOn', 'Timestamp'),
      author: readEntityString(r, 'AuthorName', 'Author', 'Name', 'ApplicantName'),
    }));
    // Newest first.
    mapped.sort((a, b) => {
      const ta = a.time ? Date.parse(a.time) : 0;
      const tb = b.time ? Date.parse(b.time) : 0;
      return tb - ta;
    });
    return mapped;
  } catch (err) {
    console.warn('fetchApplicantComments failed', err);
    return [];
  }
}

export async function triggerApproveWebhook(accessToken?: string): Promise<void> {
  if (!APPROVE_WEBHOOK_URL) {
    throw new Error('VITE_APPROVE_WEBHOOK_URL is not configured');
  }
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(APPROVE_WEBHOOK_URL, { method: 'GET', headers });
  if (!res.ok) {
    throw new Error(`Webhook returned ${res.status} ${res.statusText}`);
  }
}

// CreatorJobKey ties the Action Center task to the case instance that spawned
// it. The SDK doesn't surface it on the typed response, so we peek at the raw
// object (and check metadata/data buckets where Maestro sometimes stashes it).
function getCreatorJobKey(task: TaskGetResponse): string | null {
  const peek = (obj: unknown): string | null => {
    if (!obj || typeof obj !== 'object') return null;
    const o = obj as Record<string, unknown>;
    const v = o.CreatorJobKey ?? o.creatorJobKey;
    return typeof v === 'string' ? v : null;
  };
  return (
    peek(task) ??
    peek(task.taskSource?.taskSourceMetadata) ??
    peek(task.data) ??
    null
  );
}

// Maestro also stamps the case instance id onto each task as an "externalid"
// tag — handy as a fallback when CreatorJobKey isn't populated.
function getExternalIdTag(task: TaskGetResponse): string | null {
  const tags = (task as unknown as { tags?: unknown }).tags;
  if (!Array.isArray(tags)) return null;
  for (const raw of tags) {
    if (!raw || typeof raw !== 'object') continue;
    const t = raw as Record<string, unknown>;
    const name = typeof t.name === 'string' ? t.name : typeof t.Name === 'string' ? t.Name : null;
    const value =
      typeof t.value === 'string' ? t.value : typeof t.Value === 'string' ? t.Value : null;
    if (name?.toLowerCase() === 'externalid' && value) return value;
  }
  return null;
}

// Per-stage Action Center task title we expect from Maestro. When a stage is
// missing from this map we match purely on the case instance id.
const STAGE_ACTION_TITLE: Partial<Record<LoanStage, string>> = {
  Underwriting: 'underwriting review',
};

// Looks up the open Action Center task spawned by this case instance. The
// task's CreatorJobKey (and its "externalid" tag) is stamped with the case
// instance id, not the Maestro run id, so we match on caseInstanceId. When a
// stage is provided and it has an expected task title, we also require the
// title to match — keeps stage-specific approvals (e.g. Underwriting Review)
// from picking up unrelated open tasks on the same case.
export async function findOpenActionTask(
  sdk: UiPath,
  caseInstanceId: string,
  _folderKey: string,
  stage?: LoanStage,
): Promise<TaskGetResponse | null> {
  if (!caseInstanceId) return null;
  try {
    const tasks = new Tasks(sdk);
    const result = await tasks.getAll({ pageSize: 200 });
    const expectedTitle = stage ? STAGE_ACTION_TITLE[stage] : undefined;
    const open = result.items.find((t) => {
      if (String(t.status ?? '').toLowerCase() === 'completed') return false;
      const caseMatches =
        getCreatorJobKey(t) === caseInstanceId ||
        getExternalIdTag(t) === caseInstanceId;
      if (!caseMatches) return false;
      if (!expectedTitle) return true;
      return String(t.title ?? '').trim().toLowerCase() === expectedTitle;
    });
    if (import.meta.env.DEV) {
      console.debug('[findOpenActionTask]', {
        caseInstanceId,
        stage,
        expectedTitle,
        scanned: result.items.length,
        matched: open ? { id: open.id, status: open.status, title: open.title } : null,
      });
    }
    return open ?? null;
  } catch (err) {
    console.warn('findOpenActionTask failed', err);
    return null;
  }
}

// Completes the open Action Center task whose CreatorJobKey matches the case
// instance's latest Maestro run. Used as the in-app Approve action — replaces
// the older webhook-based approval path.
export async function completeMaestroActionTask(
  sdk: UiPath,
  caseInstanceId: string,
  folderKey: string,
  action: string = 'Approve',
  stage?: LoanStage,
): Promise<void> {
  if (!caseInstanceId || !folderKey) {
    throw new Error('Missing case instance — cannot complete action task');
  }
  const open = await findOpenActionTask(sdk, caseInstanceId, folderKey, stage);
  if (!open) {
    throw new Error('No open action task found for this case');
  }
  const options: TaskCompleteOptions =
    open.type === TaskType.App || open.type === TaskType.Form
      ? { type: open.type, action, data: {} }
      : { type: open.type, action };
  await open.complete(options);
}

export function actionCenterUrlForTask(taskId: number | string): string | null {
  const orgName = import.meta.env.VITE_UIPATH_ORG_NAME as string | undefined;
  const tenantName = import.meta.env.VITE_UIPATH_TENANT_NAME as string | undefined;
  if (!orgName || !tenantName) return null;
  return `https://staging.uipath.com/${orgName}/${tenantName}/actions_/tasks/${taskId}`;
}

// Embed URL for the Action Center "current-task" view, per:
// https://docs.uipath.com/action-center/automation-cloud/latest/user-guide/embedding-actions
// Renders just the single task without the surrounding Action Center chrome,
// safe to drop into an iframe in the host app.
export function embedActionCenterUrlForTask(taskId: number | string): string | null {
  const orgName = import.meta.env.VITE_UIPATH_ORG_NAME as string | undefined;
  const tenantName = import.meta.env.VITE_UIPATH_TENANT_NAME as string | undefined;
  if (!orgName || !tenantName) return null;
  return `https://staging.uipath.com/embed_/${orgName}/${tenantName}/actions_/current-task/tasks/${taskId}`;
}

export interface EntityDocument {
  recordId: string;
  title: string;
  meta: string;
}

export interface EntityDocumentsResult {
  documents: EntityDocument[];
  attachmentFieldName: string | null;
}

// Picks the attachment field on the entity. Falls back to common names if no
// field is explicitly flagged as an attachment. Exact-name matches come before
// regex matches so labels like "DocumentName" don't get picked over the real
// "File" attachment field.
function pickAttachmentField(fields: FieldMetaData[]): string | null {
  const flagged = fields.find((f) => f.isAttachment);
  if (flagged) return flagged.name;
  const exactPreferred = ['File', 'Attachment', 'Document'];
  for (const name of exactPreferred) {
    const m = fields.find((f) => f.name.toLowerCase() === name.toLowerCase());
    if (m) return m.name;
  }
  const named = fields.find((f) => /document|file|attach/i.test(f.name));
  return named?.name ?? null;
}

// Picks a field to use as the row's display title.
function pickDisplayField(fields: FieldMetaData[]): string | null {
  const preferred = ['Name', 'Title', 'DocumentName', 'FileName', 'DisplayName'];
  for (const p of preferred) {
    const m = fields.find((f) => f.name.toLowerCase() === p.toLowerCase());
    if (m) return m.name;
  }
  const stringy = fields.find(
    (f) => !f.isAttachment && !f.isPrimaryKey && !f.isSystemField,
  );
  return stringy?.name ?? null;
}

function recordValue(record: EntityRecord, fieldName: string | null): string | null {
  if (!fieldName) return null;
  const v = record[fieldName];
  if (v == null) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && 'name' in v && typeof (v as { name: unknown }).name === 'string') {
    return (v as { name: string }).name;
  }
  return String(v);
}

export async function fetchEntityDocuments(sdk: UiPath): Promise<EntityDocumentsResult> {
  if (!DOCUMENTS_ENTITY_ID) {
    return { documents: [], attachmentFieldName: null };
  }
  const entities = new Entities(sdk);
  const [entity, recordsResp] = await Promise.all([
    entities.getById(DOCUMENTS_ENTITY_ID),
    entities.getAllRecords(DOCUMENTS_ENTITY_ID, { pageSize: 100 }),
  ]);
  const attachmentFieldName = pickAttachmentField(entity.fields);
  const displayField = pickDisplayField(entity.fields);
  const documents: EntityDocument[] = recordsResp.items.map((r) => {
    const title = recordValue(r, displayField) ?? `Document ${r.Id.slice(0, 8)}`;
    const fileMeta = attachmentFieldName ? recordValue(r, attachmentFieldName) : null;
    return {
      recordId: r.Id,
      title,
      meta: fileMeta ? `PDF · ${fileMeta}` : 'PDF',
    };
  });
  return { documents, attachmentFieldName };
}

export async function downloadEntityDocument(
  sdk: UiPath,
  recordId: string,
  fieldName: string,
): Promise<Blob> {
  const entities = new Entities(sdk);
  return entities.downloadAttachment(DOCUMENTS_ENTITY_ID, recordId, fieldName);
}
