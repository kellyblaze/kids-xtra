"use client";

import { type ReactNode, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PhotoUploadButton } from "@/components/kid/PhotoUploadButton";
import { markChoreComplete } from "@/app/actions/completion-actions";
import { Camera, CheckCircle2, ClipboardCheck, Send, Sparkles, X } from "lucide-react";

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
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);

  const hasChecklist = checklistItems.length > 0;
  const readyForPhoto = !requiresPhoto || Boolean(photoUrl);
  const readyForChecklist = !hasChecklist || checkedItems.length === checklistItems.length;
  const readyToSubmit = readyForPhoto && readyForChecklist;

  function handleDoneClick() {
    if (requiresPhoto && !photoUrl) {
      setStarted(true);
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
      <div className="w-full sm:w-60 rounded-3xl border-4 border-emerald-300 bg-emerald-50 p-3 text-emerald-800 shadow-[0_4px_0_#a7f3d0]">
        <div className="flex items-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-500 text-white">
            <CheckCircle2 className="size-5" />
          </div>
          <div>
            <p className="text-sm font-black">Sent for Check</p>
            <p className="text-xs font-bold text-emerald-700">Parent review is next.</p>
          </div>
        </div>
      </div>
    );
  }

  if (submitError) {
    return (
      <div className="w-full sm:w-60 rounded-3xl border-4 border-red-200 bg-red-50 p-3 text-left shadow-[0_4px_0_#fecaca]">
        <p className="text-xs font-black text-red-700">{submitError}</p>
        <Button
          size="sm"
          type="button"
          onClick={() => setSubmitError(null)}
          className="mt-2 w-full rounded-2xl bg-red-500 text-xs font-black text-white hover:bg-red-600"
        >
          Try again
        </Button>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="w-full sm:w-52">
        <button
          type="button"
          onClick={() => {
            setStarted(true);
            if (requiresPhoto) setShowPhotoFlow(true);
          }}
          className="group w-full rounded-3xl border-4 border-emerald-200 bg-gradient-to-br from-emerald-50 to-lime-50 p-3 text-left shadow-[0_5px_0_#bbf7d0] transition-all hover:-translate-y-0.5 hover:shadow-[0_7px_0_#bbf7d0] active:translate-y-1 active:shadow-[0_2px_0_#bbf7d0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
        >
          <span className="flex items-center gap-2">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-500 text-white transition-transform group-hover:rotate-3">
              <Sparkles className="size-5" />
            </span>
            <span>
              <span className="block text-sm font-black text-emerald-800">Finish Mission</span>
              <span className="block text-xs font-bold text-emerald-700">Tap for the steps</span>
            </span>
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full sm:w-64 rounded-3xl border-4 border-violet-200 bg-white p-3 shadow-[0_5px_0_#ddd6fe]">
      <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 p-3 text-white">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 shrink-0" />
          <div>
            <p className="text-sm font-black">Finish Map</p>
            <p className="text-xs font-bold text-white/80">Follow the path, then send it.</p>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <FlowStep icon={<ClipboardCheck className="size-4" />} label="Do it" done={readyForChecklist} active={!readyForChecklist} />
        <FlowStep icon={<Camera className="size-4" />} label="Proof" done={readyForPhoto} active={readyForChecklist && !readyForPhoto} />
        <FlowStep icon={<Send className="size-4" />} label="Send" done={false} active={readyToSubmit} />
      </div>

      {hasChecklist && (
        <div className="mt-3 rounded-2xl border-2 border-slate-100 bg-slate-50 p-2 text-left">
          <p className="mb-2 text-xs font-black text-slate-600">
            Checklist {checkedItems.length}/{checklistItems.length}
          </p>
          <div className="space-y-1.5">
            {checklistItems.map((item) => (
              <label key={item} className="flex items-start gap-2 rounded-xl bg-white px-2 py-1.5 text-xs font-bold text-slate-600">
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
                  className="mt-0.5 size-4 accent-violet-600"
                />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {(showPhotoFlow && !photoUrl) && (
        <div className="mt-3 rounded-2xl border-2 border-amber-200 bg-amber-50 p-2">
          <PhotoUploadButton
            childId={childId}
            onUploaded={(url) => {
              setPhotoUrl(url);
              setShowPhotoFlow(false);
            }}
          />
        </div>
      )}

      {photoUrl && (
        <div className="mt-3 flex items-center justify-between rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-3 py-2">
          <span className="text-xs font-black text-emerald-700">Photo ready</span>
          <button
            type="button"
            onClick={() => {
              setPhotoUrl(null);
              setShowPhotoFlow(true);
            }}
            className="text-xs font-black text-emerald-700 underline underline-offset-2"
          >
            Retake
          </button>
        </div>
      )}

      {!requiresPhoto && !photoUrl && !showPhotoFlow && (
        <button
          type="button"
          onClick={() => setShowPhotoFlow(true)}
          className="mt-3 flex w-full items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-500 transition-colors hover:border-violet-200 hover:text-violet-700"
        >
          <Camera className="size-3.5" /> Add optional photo
        </button>
      )}

      <Button
        size="sm"
        type="button"
        onClick={handleDoneClick}
        disabled={isPending || !readyToSubmit}
        className="mt-3 h-12 w-full rounded-2xl bg-emerald-500 text-sm font-black text-white shadow-[0_4px_0_#047857] transition-all hover:bg-emerald-600 active:translate-y-1 active:shadow-none disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
      >
        <Send className="mr-1.5 size-4" />
        {isPending ? "Sending..." : readyToSubmit ? "Send for Check" : "Finish steps first"}
      </Button>

      <button
        type="button"
        onClick={() => {
          setStarted(false);
          setShowPhotoFlow(false);
        }}
        className="mt-2 flex w-full items-center justify-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600"
      >
        <X className="size-3" /> Close
      </button>
    </div>
  );
}

function FlowStep({
  icon,
  label,
  done,
  active,
}: {
  icon: ReactNode;
  label: string;
  done: boolean;
  active: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border-2 px-1.5 py-2 text-center ${
        done
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : active
            ? "border-violet-300 bg-violet-50 text-violet-700"
            : "border-slate-100 bg-slate-50 text-slate-400"
      }`}
    >
      <div className="mx-auto mb-1 flex size-7 items-center justify-center rounded-xl bg-white">
        {done ? <CheckCircle2 className="size-4" /> : icon}
      </div>
      <p className="text-[10px] font-black leading-none">{label}</p>
    </div>
  );
}
