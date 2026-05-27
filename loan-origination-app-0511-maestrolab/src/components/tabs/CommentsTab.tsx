import { useEffect, useState } from 'react';
import { Card, CardHeader } from '../ui/Card';
import { useAuth } from '../../hooks/useAuth';
import { fetchApplicantComments, type ApplicantComment } from '../../services/loanService';
import type { LoanDetailData } from '../../types/loan';

interface CommentsTabProps {
  data: LoanDetailData;
  applicantId?: string;
  loanId?: string;
}

export function CommentsTab({ data, applicantId, loanId }: CommentsTabProps) {
  const { sdk } = useAuth();
  const [applicantComments, setApplicantComments] = useState<ApplicantComment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!applicantId || !loanId) {
      setApplicantComments([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchApplicantComments(sdk, applicantId, loanId)
      .then((comments) => {
        if (!cancelled) setApplicantComments(comments);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sdk, applicantId, loanId]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5">
      <div className="grid gap-3.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Card>
          <CardHeader>
            <span>Comments</span>
          </CardHeader>
          <div className="p-4">
            {data.comments.map((c) => (
              <div key={c.id} className="flex gap-2.5 mb-3.5">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-semibold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#1E4480,#0F9D8F)' }}
                >
                  {c.initials}
                </div>
                <div>
                  <div className="text-xs" style={{ color: 'var(--fg)' }}>
                    <b>{c.author}</b>
                    <span className="text-[10px] ml-1" style={{ color: 'var(--fg4)' }}>
                      {c.time}
                    </span>
                  </div>
                  <div className="text-[13px] leading-relaxed mt-1" style={{ color: 'var(--fg2)' }}>
                    {c.body}
                  </div>
                </div>
              </div>
            ))}
            <input
              placeholder="Add a comment..."
              className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none"
              style={{
                background: 'var(--elevated)',
                border: '1px solid var(--border)',
                color: 'var(--fg)',
              }}
            />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <span>Comments from the applicant</span>
          </CardHeader>
          <div className="p-4 flex flex-col gap-3.5">
            {!loanId && (
              <div className="text-[12px]" style={{ color: 'var(--fg4)' }}>
                Applicant comments unavailable on demo cases.
              </div>
            )}
            {loanId && loading && (
              <div className="text-[12px]" style={{ color: 'var(--fg4)' }}>
                Loading…
              </div>
            )}
            {loanId && !loading && applicantComments.length === 0 && (
              <div className="text-[12px]" style={{ color: 'var(--fg4)' }}>
                No comments from the applicant yet.
              </div>
            )}
            {applicantComments.map((c) => (
              <ApplicantCommentRow key={c.recordId} comment={c} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ApplicantCommentRow({ comment }: { comment: ApplicantComment }) {
  const initials = pickInitials(comment.author);
  const when = formatTime(comment.time);
  return (
    <div className="flex gap-2.5">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-semibold flex-shrink-0"
        style={{ background: 'linear-gradient(135deg,#EC4899,#F43F5E)' }}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs" style={{ color: 'var(--fg)' }}>
          <b>{comment.author ?? 'Applicant'}</b>
          {when && (
            <span className="text-[10px] ml-1" style={{ color: 'var(--fg4)' }}>
              {when}
            </span>
          )}
        </div>
        <div className="text-[13px] leading-relaxed mt-1" style={{ color: 'var(--fg2)' }}>
          {comment.body || <span style={{ color: 'var(--fg4)' }}>(empty comment)</span>}
        </div>
      </div>
    </div>
  );
}

function pickInitials(name: string | null): string {
  if (!name) return 'AP';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || 'AP';
}

function formatTime(iso: string | null): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return new Date(t).toLocaleString();
}
