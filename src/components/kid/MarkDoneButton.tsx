"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PhotoUploadButton } from "@/components/kid/PhotoUploadButton";
import { markChoreComplete } from "@/app/actions/completion-actions";
import { Camera, CheckCircle2, X } from "lucide-react";

interface Props {
  assignmentId: string;
  childId: string;
  requiresPhoto: boolean;
  checklistItems?: string[];
}

export function MarkDoneButton({
  assignmentId,
  childId,
  requiresPhoto,
  checklistItems = [],
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [showPhotoFlow, setShowPhotoFlow] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);

  function handleDoneClick() {
    if (requiresPhoto && !photoUrl) {
      setShowPhotoFlow(true);
      return;
    }
    setSubmitError(null);
    setSubmitted(true); // optimistic — show success immediately
    startTransition(async () => {
      const result = await markChoreComplete(
        assignmentId,
        childId,
        photoUrl ?? undefined,
        checkedItems,
      );
      if ("error" in result && result.error) {
        setSubmitted(false);
        setSubmitError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  if (submitted) {
    return (
      <div className="shrink-0 flex items-center gap-1.5 bg-emerald-100 text-emerald-700 font-black text-sm px-3 py-1.5 rounded-xl border-2 border-emerald-300">
        <CheckCircle2 className="w-4 h-4" />
        Waiting for Check
      </div>
    );
  }

  if (submitError) {
    return (
      <div className="shrink-0 flex flex-col items-end gap-1">
        <p className="text-xs font-bold text-red-600">{submitError}</p>
        <Button
          size="sm"
          onClick={() => setSubmitError(null)}
          className="rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs"
        >
          Try again
        </Button>
      </div>
    );
  }

  if (showPhotoFlow && !photoUrl) {
    return (
      <div className="shrink-0 w-40 space-y-2">
        <PhotoUploadButton
          childId={childId}
          onUploaded={(url) => {
            setPhotoUrl(url);
            setShowPhotoFlow(false);
          }}
        />
        <button
          type="button"
          onClick={() => setShowPhotoFlow(false)}
          className="text-xs text-slate-400 w-full text-center flex items-center justify-center gap-1"
        >
          <X className="w-3 h-3" /> Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="shrink-0 flex flex-col gap-1 items-end">
      {checklistItems.length > 0 && (
        <details className="w-44 rounded-xl border border-slate-200 bg-white p-2 text-left">
          <summary className="cursor-pointer text-xs font-black text-slate-600">
            {checkedItems.length > 0 ? "In Progress" : "Checklist"} {checkedItems.length}/{checklistItems.length}
          </summary>
          <div className="mt-2 space-y-1">
            {checklistItems.map((item) => (
              <label key={item} className="flex items-start gap-1.5 text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={checkedItems.includes(item)}
                  onChange={(event) => {
                    setCheckedItems((current) =>
                      event.target.checked
                        ? [...current, item]
                        : current.filter((currentItem) => currentItem !== item),
                    );
                  }}
                  className="mt-0.5"
                />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </details>
      )}
      <Button
        size="sm"
        onClick={handleDoneClick}
        disabled={isPending}
        className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white"
      >
        <CheckCircle2 className="w-4 h-4 mr-1.5" />
        {isPending
          ? "…"
          : photoUrl
            ? "Submit Photo"
            : requiresPhoto
              ? "Add Photo"
              : "Complete"}
      </Button>
      {!requiresPhoto && !photoUrl && (
        <button
          type="button"
          onClick={() => setShowPhotoFlow(true)}
          className="text-xs text-slate-400 hover:text-violet-600 flex items-center gap-1 transition-colors"
        >
          <Camera className="w-3 h-3" /> add mission photo
        </button>
      )}
      {photoUrl && !requiresPhoto && (
        <button
          type="button"
          onClick={() => setPhotoUrl(null)}
          className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
        >
          <X className="w-3 h-3" /> remove photo
        </button>
      )}
    </div>
  );
}
