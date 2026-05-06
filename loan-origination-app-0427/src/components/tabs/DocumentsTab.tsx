import { useEffect, useState } from 'react';
import { Card } from '../ui/Card';
import { Pill } from '../ui/Pill';
import { Button } from '../ui/Button';
import type { LoanDetailData, LoanDocument } from '../../types/loan';

interface DocumentsTabProps {
  data: LoanDetailData;
}

const ICON_COLORS: Record<NonNullable<LoanDocument['iconColor']>, { bg: string; fg: string }> = {
  red: { bg: 'var(--red-bg)', fg: 'var(--red)' },
  blue: { bg: 'var(--blue-bg)', fg: 'var(--blue)' },
  green: { bg: 'var(--green-bg)', fg: 'var(--green)' },
  purple: { bg: 'var(--purple-bg)', fg: 'var(--purple)' },
  amber: { bg: 'var(--amber-bg)', fg: 'var(--amber)' },
};

// Maps a doc title to a static asset under /public. Only docs listed here
// open in the preview modal — everything else is a no-op for now.
function previewUrlFor(title: string): string | null {
  if (/pay\s*stub/i.test(title)) return '/paystub.pdf';
  return null;
}

export function DocumentsTab({ data }: DocumentsTabProps) {
  const [preview, setPreview] = useState<{ title: string; url: string } | null>(null);

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreview(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [preview]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5">
      <div className="flex justify-between items-center mb-3">
        <div className="text-[14px] font-semibold" style={{ color: 'var(--fg)' }}>
          Documents ({data.documents.length})
        </div>
        <Button>+ Upload</Button>
      </div>
      <Card>
        <div>
          {data.documents.map((doc, idx) => {
            const icon = ICON_COLORS[doc.iconColor];
            const url = previewUrlFor(doc.title);
            return (
              <div
                key={doc.id}
                className="flex items-center gap-3 px-3.5 py-2.5 cursor-pointer transition-colors"
                style={{
                  borderBottom: idx < data.documents.length - 1 ? '1px solid var(--border)' : 'none',
                }}
                onClick={() => url && setPreview({ title: doc.title, url })}
                onMouseOver={(e) => (e.currentTarget.style.background = 'var(--hover)')}
                onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                  style={{ background: icon.bg, color: icon.fg }}
                >
                  📄
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-medium" style={{ color: 'var(--fg)' }}>
                    {doc.title}
                  </div>
                  <div className="text-[11px]" style={{ color: 'var(--fg4)' }}>
                    {doc.meta}
                  </div>
                </div>
                <Pill tone={doc.statusPill}>{doc.status}</Pill>
              </div>
            );
          })}
        </div>
      </Card>

      {preview && <PdfPreviewModal title={preview.title} url={preview.url} onClose={() => setPreview(null)} />}
    </div>
  );
}

function PdfPreviewModal({
  title,
  url,
  onClose,
}: {
  title: string;
  url: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="flex flex-col w-[min(960px,92vw)] h-[min(900px,90vh)] rounded-[12px] overflow-hidden"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-md)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="text-[13px] font-semibold" style={{ color: 'var(--fg)' }}>
            {title}
          </div>
          <div className="flex items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-[11px] px-2 py-1 rounded-md"
              style={{
                background: 'var(--elevated)',
                color: 'var(--fg3)',
                border: '1px solid var(--border)',
              }}
            >
              Open in new tab ↗
            </a>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-[7px] flex items-center justify-center"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--fg3)',
              }}
              aria-label="Close preview"
            >
              ✕
            </button>
          </div>
        </div>
        <iframe src={url} title={title} className="flex-1 w-full" style={{ border: 'none', background: '#fff' }} />
      </div>
    </div>
  );
}
