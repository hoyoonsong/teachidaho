import type { ReactNode } from "react";

type AdminModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function AdminModal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
}: AdminModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        className="relative z-10 flex max-h-[min(90vh,640px)] w-full max-w-lg flex-col rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <h2
            id="admin-modal-title"
            className="text-lg font-bold tracking-tight text-slate-900"
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">{children}</div>
        {footer ? (
          <div className="border-t border-slate-100 px-5 py-4 sm:px-6">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
