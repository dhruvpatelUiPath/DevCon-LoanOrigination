import { useEffect } from 'react';

interface ActionEmbedModalProps {
  embedUrl: string;
  externalUrl?: string | null;
  taskId: number | string;
  open: boolean;
  onClose: () => void;
}

export function ActionEmbedModal({
  embedUrl,
  externalUrl,
  taskId,
  open,
  onClose,
}: ActionEmbedModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.55)' }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Action Center task"
        className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
      >
        <div
          className="relative w-full max-w-[1200px] h-[85vh] rounded-2xl overflow-hidden flex flex-col pointer-events-auto"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div
            className="px-5 py-3 flex items-center justify-between flex-shrink-0"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div>
              <div className="text-[14px] font-bold" style={{ color: 'var(--fg)' }}>
                Action Center task
              </div>
              <div className="text-[11px] mt-px" style={{ color: 'var(--fg3)' }}>
                Task #{taskId}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {externalUrl && (
                <a
                  href={externalUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-[11px] font-semibold hover:underline"
                  style={{ color: 'var(--blue)' }}
                >
                  Open in new tab ↗
                </a>
              )}
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-[7px] flex items-center justify-center"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--fg3)',
                }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>
          <iframe
            src={embedUrl}
            title={`Action Center task ${taskId}`}
            className="flex-1 w-full"
            style={{ border: '0', background: 'var(--bg)' }}
            allow="clipboard-read; clipboard-write"
          />
        </div>
      </div>
    </>
  );
}
