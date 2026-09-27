"use client";

import { Modal } from "@/components/ui/modal";

interface Props {
  isOpen: boolean;
  title: string;
  itemName: string;
  warning?: string;
  confirmLabel: string;
  cancelLabel: string;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmModal({
  isOpen,
  title,
  itemName,
  warning,
  confirmLabel,
  cancelLabel,
  isDeleting,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} showCloseButton={false} className="max-w-md mx-4">
      <div className="p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10">
            <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium text-gray-700 dark:text-gray-300">&ldquo;{itemName}&rdquo;</span>
            </p>
            {warning && (
              <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">{warning}</p>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50 dark:bg-red-500 dark:hover:bg-red-600"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
