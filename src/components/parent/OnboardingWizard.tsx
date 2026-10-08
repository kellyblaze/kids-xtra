"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Download,
  ExternalLink,
  HelpCircle,
  PartyPopper,
  Plus,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PushNotificationToggle } from "@/components/parent/PushNotificationToggle";
import { createChildProfile } from "@/app/actions/child-actions";
import { setChildPin } from "@/app/actions/kid-auth";
import {
  addStarterChores,
  addStarterRewards,
  saveOnboardingProgress,
} from "@/app/actions/onboarding-actions";
import { STARTER_REWARDS, type OnboardingPreferences } from "@/lib/onboarding";
import { AVATAR_EMOJI, AVATAR_OPTIONS, COLOR_THEMES } from "@/lib/constants";
import { CHORE_TEMPLATES, type AgeGroup } from "@/lib/chore-templates";

type Child = {
  id: string;
  name: string;
  avatar_key: string | null;
  hasPin: boolean;
};
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
const STEPS = [
  "Welcome",
  "Add child",
  "First Missions",
  "First Reward",
  "Install",
  "Extras",
  "Kid view",
  "Ready",
];

export function OnboardingWizard(props: {
  familyName: string;
  familyCode: string;
  subscriptionStatus: string;
  initialStep: number;
  initialPreferences: OnboardingPreferences;
  initialChildren: Child[];
  initialChoreCount: number;
  initialRewardCount: number;
}) {
  const router = useRouter();
  const [step, setStep] = useState(props.initialStep),
    [children, setChildren] = useState(props.initialChildren);
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("6-8"),
    templates = useMemo(
      () => CHORE_TEMPLATES.filter((x) => x.ageGroup === ageGroup).slice(0, 6),
      [ageGroup],
    );
  const [selectedChores, setSelectedChores] = useState<string[]>(() =>
      CHORE_TEMPLATES.filter((x) => x.ageGroup === "6-8")
        .slice(0, 3)
        .map((x) => x.id),
    ),
    [selectedRewards, setSelectedRewards] = useState(["movie", "screen"]);
  const [preferences, setPreferences] = useState(props.initialPreferences),
    [choreCount, setChoreCount] = useState(props.initialChoreCount),
    [rewardCount, setRewardCount] = useState(props.initialRewardCount);
  const [error, setError] = useState<string | null>(null),
    [pending, startTransition] = useTransition();
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve());
  function go(next: number) {
    setError(null);
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
    saveQueue.current = saveQueue.current.then(() =>
      saveOnboardingProgress(next, preferences),
    );
  }
  function finish() {
    startTransition(async () => {
      const result = await saveOnboardingProgress(7, preferences, true);
      if (result.error) return setError(result.error);
      router.push("/parent/dashboard");
      router.refresh();
    });
  }
  return (
    <div className="-m-4 min-h-full bg-[radial-gradient(circle_at_top_left,#ede9fe_0,transparent_38%),radial-gradient(circle_at_bottom_right,#d1fae5_0,transparent_35%)] p-4 md:-m-6 md:p-8 lg:-m-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-center justify-between">
          <Link
            href="/parent/dashboard"
            className="text-lg font-black text-violet-700"
          >
            Kids Xtra
          </Link>
          <a
            href="mailto:info@seethestarsllc.com?subject=Onboarding%20help"
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 hover:bg-white"
          >
            <HelpCircle className="size-4" /> Need help?
          </a>
        </header>
        <div className="mb-6 rounded-2xl border border-violet-100 bg-white/85 p-4 shadow-sm">
          <div className="mb-2 flex justify-between text-sm font-bold text-slate-600">
            <span>
              Step {step + 1} of {STEPS.length}
            </span>
            <span>{STEPS[step]}</span>
          </div>
          <div
            role="progressbar"
            aria-label="Family setup progress"
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
            aria-valuenow={step + 1}
            className="h-2 overflow-hidden rounded-full bg-slate-100"
          >
            <div
              className="h-full rounded-full bg-violet-600 transition-all duration-500"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>
        <main className="rounded-[2rem] border border-white bg-white/95 p-5 shadow-xl shadow-violet-100/60 md:p-9">
          {step === 0 && (
            <Welcome
              familyName={props.familyName}
              status={props.subscriptionStatus}
              counts={[children.length, choreCount, rewardCount]}
              onNext={() => go(children.length ? 2 : 1)}
            />
          )}
          {step === 1 && (
            <Children
              childProfiles={children}
              setChildren={setChildren}
              onNext={() => go(2)}
            />
          )}
          {step === 2 && (
            <Chores
              childProfiles={children}
              ageGroup={ageGroup}
              setAgeGroup={(value) => {
                setAgeGroup(value);
                setSelectedChores(
                  CHORE_TEMPLATES.filter((x) => x.ageGroup === value)
                    .slice(0, 3)
                    .map((x) => x.id),
                );
              }}
              templates={templates}
              selected={selectedChores}
              setSelected={setSelectedChores}
              photoProof={preferences.photoProof}
              setPhotoProof={(photoProof) =>
                setPreferences({ ...preferences, photoProof })
              }
              onDone={(n) => {
                setChoreCount(choreCount + n);
                go(3);
              }}
              setError={setError}
            />
          )}
          {step === 3 && (
            <Rewards
              selected={selectedRewards}
              setSelected={setSelectedRewards}
              onDone={(n) => {
                setRewardCount(rewardCount + n);
                go(4);
              }}
              setError={setError}
            />
          )}
          {step === 4 && <Install onNext={() => go(5)} />}
          {step === 5 && (
            <Extras
              value={preferences}
              setValue={setPreferences}
              onNext={() => go(6)}
            />
          )}
          {step === 6 && (
            <KidPreview
              code={props.familyCode}
              childProfiles={children}
              onNext={() => go(7)}
            />
          )}
          {step === 7 && (
            <Complete
              name={props.familyName}
              counts={[children.length, choreCount, rewardCount]}
              onFinish={finish}
              pending={pending}
            />
          )}
          {error && (
            <p
              role="alert"
              className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700"
            >
              {error}
            </p>
          )}
          {step > 0 && step < 7 && (
            <div className="mt-7 flex items-center justify-between border-t pt-5">
              <Button variant="ghost" onClick={() => go(step - 1)}>
                <ArrowLeft className="size-4" /> Back
              </Button>
              <button
                onClick={() => go(step + 1)}
                className="text-sm font-semibold text-slate-500 hover:underline"
              >
                Skip for now
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function Heading({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="mb-6">
      <p className="text-sm font-black uppercase tracking-widest text-violet-600">
        {eyebrow}
      </p>
      <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">
        {title}
      </h1>
      <p className="mt-2 max-w-2xl leading-6 text-slate-600">{text}</p>
    </div>
  );
}
function Welcome({
  familyName,
  status,
  counts,
  onNext,
}: {
  familyName: string;
  status: string;
  counts: number[];
  onNext: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-3xl bg-violet-100 text-3xl">
        ✨
      </div>
      <p className="text-sm font-black uppercase tracking-widest text-violet-600">
        Your family setup
      </p>
      <h1 className="mt-2 text-4xl font-black">Welcome, {familyName}</h1>
      <p className="mt-4 text-slate-600">
        We’ll build your first mission board, rewards, app shortcut, and kid
        login.
      </p>
      <div className="my-7 grid gap-3 text-left sm:grid-cols-3">
        {[
          [
            "Payment",
            status === "trialing" ? "Free first month" : "Plan active",
          ],
          ["Family", "Account ready"],
          [
            "Progress",
            `${counts[0]} kids · ${counts[1]} Missions · ${counts[2]} Rewards`,
          ],
        ].map(([a, b]) => (
          <div key={a} className="rounded-2xl bg-emerald-50 p-4">
            <CheckCircle2 className="mb-2 size-5 text-emerald-600" />
            <p className="text-xs font-bold uppercase text-emerald-700">{a}</p>
            <p className="font-bold">{b}</p>
          </div>
        ))}
      </div>
      <Button size="lg" onClick={onNext}>
        Start earning setup <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}

function Children({
  childProfiles,
  setChildren,
  onNext,
}: {
  childProfiles: Child[];
  setChildren: (v: Child[]) => void;
  onNext: () => void;
}) {
  const [avatar, setAvatar] = useState("star"),
    [color, setColor] = useState("purple"),
    [message, setMessage] = useState<{
      kind: "success" | "error";
      text: string;
    } | null>(null),
    [pending, startTransition] = useTransition();
  function add(form: FormData) {
    form.set("avatar_key", avatar);
    form.set("color_theme", color);
    const pin = String(form.get("pin") ?? "");
    startTransition(async () => {
      const result = await createChildProfile(form);
      if (result.error || !result.child)
        return setMessage({
          kind: "error",
          text: result.error ?? "Could not add child",
        });
      const child = { ...result.child, hasPin: false };
      setChildren([...childProfiles, child]);
      if (pin) {
        const pinResult = await setChildPin(result.child.id, pin);
        if (pinResult.error)
          return setMessage({
            kind: "error",
            text: `${result.child.name} was added, but the PIN could not be saved. You can add it from their profile.`,
          });
        child.hasPin = true;
        setChildren([...childProfiles, child]);
      }
      setMessage({
        kind: "success",
        text: `${result.child.name} is ready! 🎉`,
      });
    });
  }
  return (
    <div>
      <Heading
        eyebrow="Meet the team"
        title="Add your children"
        text="Step one: add the child who will complete Missions and earn Credits."
      />
      {childProfiles.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-3">
          {childProfiles.map((x) => (
            <div
              key={x.id}
              className="flex items-center gap-2 rounded-2xl border bg-slate-50 px-3 py-2"
            >
              <span className="text-2xl">
                {AVATAR_EMOJI[x.avatar_key ?? "star"] ?? "⭐"}
              </span>
              <b>{x.name}</b>
              {x.hasPin && <ShieldCheck className="size-4 text-emerald-600" />}
            </div>
          ))}
        </div>
      )}
      <form
        action={add}
        className="grid gap-5 rounded-3xl border bg-slate-50 p-5 md:grid-cols-2"
      >
        <Field id="child-name" label="Name">
          <Input id="child-name" name="name" required maxLength={60} />
        </Field>
        <Field id="child-nickname" label="Nickname (optional)">
          <Input id="child-nickname" name="nickname" maxLength={60} />
        </Field>
        <div className="md:col-span-2">
          <Label>Avatar</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {AVATAR_OPTIONS.map((x) => (
              <button
                aria-label={`Choose ${x.key}`}
                aria-pressed={avatar === x.key}
                key={x.key}
                type="button"
                onClick={() => setAvatar(x.key)}
                className={`size-11 rounded-xl text-2xl focus-visible:outline-2 focus-visible:outline-violet-600 active:scale-95 ${avatar === x.key ? "bg-violet-100 ring-2 ring-violet-600" : "bg-white"}`}
              >
                {x.emoji}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>Colour</Label>
          <div className="mt-3 flex gap-3">
            {COLOR_THEMES.map((x) => (
              <button
                aria-label={`Choose ${x.value}`}
                aria-pressed={color === x.value}
                key={x.value}
                type="button"
                onClick={() => setColor(x.value)}
                className={`size-8 rounded-full focus-visible:outline-2 focus-visible:outline-slate-800 active:scale-95 ${x.bg} ${color === x.value ? "ring-2 ring-slate-800 ring-offset-2" : ""}`}
              />
            ))}
          </div>
        </div>
        <Field id="child-pin" label="4-digit kid PIN (optional)">
          <Input
            id="child-pin"
            name="pin"
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            placeholder="••••"
          />
        </Field>
        <div className="md:col-span-2 flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            <Plus className="size-4" /> {pending ? "Adding…" : "Add child"}
          </Button>
          {message && (
            <p
              role={message.kind === "error" ? "alert" : "status"}
              className={`text-sm font-semibold ${message.kind === "error" ? "text-red-700" : "text-emerald-700"}`}
            >
              {message.text}
            </p>
          )}
        </div>
      </form>
      <Button
        size="lg"
        className="mt-6 w-full"
        disabled={!childProfiles.length}
        onClick={onNext}
      >
        Choose first Missions <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}
function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function Chores({
  childProfiles,
  ageGroup,
  setAgeGroup,
  templates,
  selected,
  setSelected,
  photoProof,
  setPhotoProof,
  onDone,
  setError,
}: {
  childProfiles: Child[];
  ageGroup: AgeGroup;
  setAgeGroup: (v: AgeGroup) => void;
  templates: typeof CHORE_TEMPLATES;
  selected: string[];
  setSelected: (v: string[]) => void;
  photoProof: boolean;
  setPhotoProof: (v: boolean) => void;
  onDone: (n: number) => void;
  setError: (v: string | null) => void;
}) {
  const [pending, startTransition] = useTransition();
  const toggle = (id: string) =>
    setSelected(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id],
    );
  const save = () =>
    startTransition(async () => {
      const r = await addStarterChores(
        selected,
        childProfiles.map((x) => x.id),
        photoProof,
      );
      if (r.error) return setError(r.error);
      onDone(r.created ?? 0);
    });
  return (
    <div>
      <Heading
        eyebrow="First missions"
        title="Pick starter Mission packs"
        text="Start with clear responsibility packs, then adjust Credit and XP values later."
      />
      <div className="mb-5 flex flex-wrap gap-2">
        {(["3-5", "6-8", "9-12", "13+"] as AgeGroup[]).map((x) => (
          <button
            key={x}
            aria-pressed={ageGroup === x}
            onClick={() => setAgeGroup(x)}
            className={`rounded-full px-4 py-2 text-sm font-bold focus-visible:outline-2 focus-visible:outline-violet-600 active:scale-95 ${ageGroup === x ? "bg-violet-600 text-white" : "bg-slate-100"}`}
          >
            Ages {x}
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {templates.map((x) => (
          <button
            key={x.id}
            aria-pressed={selected.includes(x.id)}
            onClick={() => toggle(x.id)}
            className={`flex gap-3 rounded-2xl border-2 p-4 text-left focus-visible:outline-2 focus-visible:outline-violet-600 active:scale-[.99] ${selected.includes(x.id) ? "border-violet-500 bg-violet-50" : "border-slate-200"}`}
          >
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-full ${selected.includes(x.id) ? "bg-violet-600 text-white" : "border"}`}
            >
              {selected.includes(x.id) && <Check className="size-4" />}
            </span>
            <span>
              <b>{x.title}</b>
              <small className="block text-slate-500">
                {x.creditValue} Credits · {x.timesPerPeriod}× per {x.periodUnit}
              </small>
            </span>
          </button>
        ))}
      </div>
      <button
        role="switch"
        aria-checked={photoProof}
        onClick={() => setPhotoProof(!photoProof)}
        className="mt-4 flex w-full items-center justify-between rounded-2xl border p-4 text-left focus-visible:outline-2 focus-visible:outline-violet-600 active:scale-[.99]"
      >
        <span>
          <b className="block">📸 Require photo proof</b>
          <small className="text-slate-500">
            Kids attach a photo when completing these missions.
          </small>
        </span>
        <span
          className={`relative h-7 w-12 rounded-full ${photoProof ? "bg-violet-600" : "bg-slate-200"}`}
        >
          <span
            className={`absolute top-1 size-5 rounded-full bg-white transition-transform ${photoProof ? "translate-x-6" : "translate-x-1"}`}
          />
        </span>
      </button>
      <Button
        size="lg"
        className="mt-6 w-full"
        disabled={!selected.length || pending}
        onClick={save}
      >
        {pending ? "Creating missions…" : `Add ${selected.length} missions`}{" "}
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}
function Rewards({
  selected,
  setSelected,
  onDone,
  setError,
}: {
  selected: string[];
  setSelected: (v: string[]) => void;
  onDone: (n: number) => void;
  setError: (v: string | null) => void;
}) {
  const [pending, startTransition] = useTransition();
  const toggle = (id: string) =>
    setSelected(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id],
    );
  const save = () =>
    startTransition(async () => {
      const r = await addStarterRewards(selected);
      if (r.error) return setError(r.error);
      onDone(r.created ?? 0);
    });
  return (
    <div>
      <Heading
        eyebrow="Something to earn"
        title="Add something to earn"
        text="Choose one or two simple Rewards so kids immediately see why saving Credits matters."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {STARTER_REWARDS.map((x) => (
          <button
            key={x.id}
            aria-pressed={selected.includes(x.id)}
            onClick={() => toggle(x.id)}
            className={`rounded-2xl border-2 p-5 text-left focus-visible:outline-2 focus-visible:outline-amber-600 active:scale-[.99] ${selected.includes(x.id) ? "border-amber-400 bg-amber-50" : "border-slate-200"}`}
          >
            <span className="text-3xl">{x.emoji}</span>
            <b className="mt-2 block">{x.title}</b>
            <span className="text-sm text-amber-700">
              {x.creditCost} Credits
            </span>
          </button>
        ))}
      </div>
      <Button
        size="lg"
        className="mt-6 w-full"
        disabled={!selected.length || pending}
        onClick={save}
      >
        {pending ? "Creating rewards…" : `Add ${selected.length} rewards`}{" "}
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}

function Install({ onNext }: { onNext: () => void }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null),
    [installed, setInstalled] = useState(
      () =>
        typeof window !== "undefined" &&
        window.matchMedia("(display-mode: standalone)").matches,
    );
  useEffect(() => {
    const h = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    if ((await prompt.userChoice).outcome === "accepted") setInstalled(true);
    setPrompt(null);
  }
  return (
    <div>
      <Heading
        eyebrow="One tap away"
        title="Install Kids Xtra"
        text="Open the secure web app from your home screen—no app store download needed."
      />
      {prompt && (
        <button
          onClick={install}
          className="mb-5 flex w-full items-center gap-4 rounded-2xl bg-violet-600 p-5 text-left text-white"
        >
          <Download className="size-7" />
          <b>Install on this device</b>
        </button>
      )}
      {installed && (
        <p className="mb-5 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-700">
          ✓ Kids Xtra is installed.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {[
          [
            "🤖",
            "Android",
            "Chrome: tap ⋮, then Install app or Add to Home screen.",
          ],
          [
            "🍎",
            "iPhone & iPad",
            "Safari: tap Share, choose Add to Home Screen, then Open as Web App.",
          ],
          [
            "🔥",
            "Amazon Fire",
            "Silk: open the menu and add Kids Xtra to bookmarks or favorites.",
          ],
          [
            "💻",
            "Computer",
            "Chrome or Edge: click the install icon in the address bar.",
          ],
        ].map(([e, t, x]) => (
          <div key={t} className="rounded-2xl border bg-slate-50 p-5">
            <span className="text-3xl">{e}</span>
            <h3 className="mt-2 font-black">{t}</h3>
            <p className="mt-1 text-sm text-slate-600">{x}</p>
          </div>
        ))}
      </div>
      <Button size="lg" className="mt-6 w-full" onClick={onNext}>
        Continue <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}
function Extras({
  value,
  setValue,
  onNext,
}: {
  value: OnboardingPreferences;
  setValue: (v: OnboardingPreferences) => void;
  onNext: () => void;
}) {
  const opts: [keyof OnboardingPreferences, string, string, string][] = [
    [
      "choreReminders",
      "⏰",
      "Mission reminders",
      "Notify you about unfinished daily missions.",
    ],
    [
      "weeklyReport",
      "📊",
      "Weekly family summary",
      "Save your preference for weekly progress summaries.",
    ],
    [
      "photoProof",
      "📸",
      "Photo proof",
      "Require photos on future starter missions.",
    ],
  ];
  return (
    <div>
      <Heading
        eyebrow="Make it yours"
        title="Choose your extras"
        text="You’re in control and can change these preferences later."
      />
      <div className="space-y-3">
        {opts.map(([k, e, t, d]) => (
          <button
            key={k}
            role="switch"
            aria-checked={value[k]}
            onClick={() => setValue({ ...value, [k]: !value[k] })}
            className="flex w-full items-center gap-4 rounded-2xl border p-4 text-left hover:bg-slate-50"
          >
            <span className="text-2xl">{e}</span>
            <span className="flex-1">
              <b className="block">{t}</b>
              <small className="text-slate-500">{d}</small>
            </span>
            <span
              className={`relative h-7 w-12 rounded-full ${value[k] ? "bg-violet-600" : "bg-slate-200"}`}
            >
              <span
                className={`absolute top-1 size-5 rounded-full bg-white transition-transform ${value[k] ? "translate-x-6" : "translate-x-1"}`}
              />
            </span>
          </button>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between rounded-2xl bg-violet-50 p-4">
        <div>
          <b>Push notifications</b>
          <p className="text-sm text-violet-700">
            Receive approvals and reminders on this device.
          </p>
        </div>
        <PushNotificationToggle />
      </div>
      <Button size="lg" className="mt-6 w-full" onClick={onNext}>
        Save extras <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}
function KidPreview({
  code,
  childProfiles,
  onNext,
}: {
  code: string;
  childProfiles: Child[];
  onNext: () => void;
}) {
  return (
    <div>
      <Heading
        eyebrow="See what they see"
        title="Try the kid experience"
        text="Kids enter the family code, choose their avatar, and use their private PIN."
      />
      <div className="mx-auto max-w-lg rounded-[2rem] border-4 border-violet-200 bg-violet-50 p-6 text-center">
        <Smartphone className="mx-auto size-8 text-violet-600" />
        <p className="mt-2 text-xs font-black uppercase text-violet-500">
          Family code
        </p>
        <p className="my-2 text-4xl font-black tracking-[.25em] text-violet-800">
          {code}
        </p>
        <div className="mt-5 flex justify-center gap-3">
          {childProfiles.slice(0, 4).map((x) => (
            <div key={x.id}>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-white text-2xl">
                {AVATAR_EMOJI[x.avatar_key ?? "star"] ?? "⭐"}
              </div>
              <small className="font-bold">{x.name}</small>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Button variant="outline" size="lg" asChild>
          <Link href="/kid/select" target="_blank">
            Open Kid Mode <ExternalLink className="size-4" />
          </Link>
        </Button>
        <Button size="lg" onClick={onNext}>
          Looks good <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
function Complete({
  name,
  counts,
  onFinish,
  pending,
}: {
  name: string;
  counts: number[];
  onFinish: () => void;
  pending: boolean;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="mx-auto mb-5 flex size-20 items-center justify-center rounded-full bg-amber-100">
        <PartyPopper className="size-10 text-amber-600" />
      </div>
      <p className="text-sm font-black uppercase text-violet-600">
        Setup complete
      </p>
      <h1 className="mt-2 text-4xl font-black">{name} is ready!</h1>
      <p className="mt-4 text-slate-600">
        Your first real missions are assigned. Kids can start earning now.
      </p>
      <div className="my-7 grid grid-cols-3 gap-3">
        {["Kids", "Missions", "Rewards"].map((x, i) => (
          <div key={x} className="rounded-2xl bg-slate-50 p-4">
            <p className="text-3xl font-black text-violet-700">{counts[i]}</p>
            <small className="font-bold uppercase text-slate-500">{x}</small>
          </div>
        ))}
      </div>
      <Button
        size="lg"
        className="w-full"
        onClick={onFinish}
        disabled={pending}
      >
        <Sparkles className="size-4" />{" "}
        {pending ? "Finishing…" : "Go to my dashboard"}
      </Button>
    </div>
  );
}
