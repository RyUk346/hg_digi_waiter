"use client";

import { useActionState, useReducer, useState, useTransition } from "react";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Star,
  ChevronDown,
  ChevronUp,
  Save,
  AlertCircle,
} from "lucide-react";
import {
  saveMenuItemAndSteps,
  type SaveMenuItemState,
} from "@/app/actions/menu-actions";
import { CategorySelector, type CategoryOption } from "./category-selector";
import { StockToggle } from "./stock-toggle";
import { ImageUpload } from "./image-upload";

// ─── Types ────────────────────────────────────────────────────────────────

export interface OptionDraft {
  uiId: string;
  label: string;
  description: string;
  deltaPence: number;
  featured: boolean;
  badge: string;
}

export interface StepDraft {
  uiId: string;
  question: string;
  subtitle: string;
  options: OptionDraft[];
}

export interface ItemDefaults {
  sku: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  basePricePence: number;
  station: string;
  tint: string | null;
  available: boolean;
  crossSell: boolean;
  allergens: string[];
  sortOrder: number;
  imageUrl: string | null;
}

interface Props {
  mode: "create" | "edit";
  menuItemId?: string;
  defaults?: ItemDefaults;
  initialSteps?: StepDraft[];
  categories: CategoryOption[];
  statsHeader?: React.ReactNode;
}

const STATIONS = ["grill", "pasta", "pizza", "cold", "dessert", "bar"];
const TINTS = [
  { v: "", label: "None" },
  { v: "amber", label: "Amber" },
  { v: "rose", label: "Rose" },
  { v: "olive", label: "Olive" },
  { v: "blue", label: "Blue" },
  { v: "purple", label: "Purple" },
];

// ─── Reducer for build sequence steps ─────────────────────────────────────

type Action =
  | { type: "ADD_STEP" }
  | { type: "REMOVE_STEP"; stepIdx: number }
  | { type: "MOVE_STEP"; stepIdx: number; dir: -1 | 1 }
  | {
      type: "SET_STEP_FIELD";
      stepIdx: number;
      field: "question" | "subtitle";
      value: string;
    }
  | { type: "ADD_OPTION"; stepIdx: number }
  | { type: "REMOVE_OPTION"; stepIdx: number; optionIdx: number }
  | {
      type: "SET_OPTION_FIELD";
      stepIdx: number;
      optionIdx: number;
      field: keyof OptionDraft;
      value: string | number | boolean;
    };

const uid = () => Math.random().toString(36).slice(2, 9);

const blankOption = (): OptionDraft => ({
  uiId: uid(),
  label: "",
  description: "",
  deltaPence: 0,
  featured: false,
  badge: "",
});

const blankStep = (): StepDraft => ({
  uiId: uid(),
  question: "",
  subtitle: "",
  options: [
    {
      ...blankOption(),
      label: "Yes, upgrade",
      featured: true,
      badge: "Most popular",
    },
    { ...blankOption(), label: "No, keep it simple" },
  ],
});

function stepsReducer(state: StepDraft[], action: Action): StepDraft[] {
  switch (action.type) {
    case "ADD_STEP":
      if (state.length >= 3) return state;
      return [...state, blankStep()];
    case "REMOVE_STEP":
      return state.filter((_, i) => i !== action.stepIdx);
    case "MOVE_STEP": {
      const target = action.stepIdx + action.dir;
      if (target < 0 || target >= state.length) return state;
      const next = state.slice();
      [next[action.stepIdx], next[target]] = [
        next[target]!,
        next[action.stepIdx]!,
      ];
      return next;
    }
    case "SET_STEP_FIELD":
      return state.map((s, i) =>
        i === action.stepIdx ? { ...s, [action.field]: action.value } : s,
      );
    case "ADD_OPTION":
      return state.map((s, i) =>
        i === action.stepIdx
          ? { ...s, options: [...s.options, blankOption()] }
          : s,
      );
    case "REMOVE_OPTION":
      return state.map((s, i) =>
        i === action.stepIdx
          ? {
              ...s,
              options: s.options.filter((_, oi) => oi !== action.optionIdx),
            }
          : s,
      );
    case "SET_OPTION_FIELD":
      return state.map((s, i) =>
        i === action.stepIdx
          ? {
              ...s,
              options: s.options.map((o, oi) =>
                oi === action.optionIdx
                  ? { ...o, [action.field]: action.value }
                  : o,
              ),
            }
          : s,
      );
    default:
      return state;
  }
}

// ─── Component ────────────────────────────────────────────────────────────

export function MenuItemEditor({
  mode,
  menuItemId,
  defaults,
  initialSteps = [],
  categories,
  statsHeader,
}: Props) {
  const [steps, dispatch] = useReducer(stepsReducer, initialSteps);
  const [inStock, setInStock] = useState(defaults?.available ?? true);

  const bound = saveMenuItemAndSteps.bind(null, menuItemId ?? null);
  const [state, formAction] = useActionState<SaveMenuItemState, FormData>(
    bound,
    { ok: true },
  );
  const [pending, startTransition] = useTransition();
  const errors = state.ok ? {} : state.errors;
  const values = state.ok ? null : state.values;

  function v(key: string, fallback: string | number | null | undefined = "") {
    if (values?.[key] !== undefined) return values[key]!;
    if (fallback === null || fallback === undefined) return "";
    return String(fallback);
  }

  function onSubmit(formData: FormData) {
    // Inject steps JSON before action runs
    formData.set(
      "stepsJson",
      JSON.stringify(
        steps.map((s) => ({
          question: s.question,
          subtitle: s.subtitle || null,
          options: s.options.map((o) => ({
            label: o.label,
            description: o.description || null,
            deltaPence: Math.round(o.deltaPence),
            featured: o.featured,
            badge: o.badge || null,
          })),
        })),
      ),
    );
    // Inject availability (might come from form OR from controlled toggle on /new)
    if (!formData.has("available") || !menuItemId) {
      formData.set("available", inStock ? "on" : "off");
    }
    startTransition(() => formAction(formData));
  }

  return (
    <form action={onSubmit} className="space-y-6">
      {/* Header */}
      <header className="flex items-end justify-between gap-6">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-[0.12em] text-terraFg font-medium">
            {mode === "create" ? "New menu item" : "Menu"}
          </p>
          {statsHeader}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/menu"
            className="text-sm text-muted hover:text-ink px-4 py-2 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-1.5 bg-ink text-bg px-5 py-2 rounded font-medium hover:bg-text transition-colors disabled:opacity-50"
          >
            <Save size={14} strokeWidth={2} />
            {pending
              ? "Saving…"
              : mode === "create"
                ? "Create item"
                : "Save changes"}
          </button>
        </div>
      </header>

      {/* Top-level error banner */}
      {errors._ ? (
        <div className="flex items-start gap-2 bg-red/10 border border-red/30 text-red text-sm px-3 py-2 rounded">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{errors._}</span>
        </div>
      ) : null}

      {/* Basic info */}
      <section className="card">
        <header className="flex items-start justify-between mb-5">
          <div>
            <h3 className="font-serif text-xl text-ink">Basic info</h3>
            {/* <p className="text-sm text-muted italic mt-1">
              Specificity raises perceived value — &ldquo;Aged Aberdeen
              Angus&rdquo; beats &ldquo;beef patty&rdquo;.
            </p> */}
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted font-medium mb-1 text-right">
              Stock status
            </p>
            <StockToggle
              id={menuItemId}
              inStock={inStock}
              onChange={setInStock}
            />
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-5">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted font-medium mb-1">
              Photo
            </p>
            <ImageUpload name="imageUrl" defaultValue={defaults?.imageUrl} />
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="SKU" error={errors.sku} required>
                <input
                  name="sku"
                  required
                  defaultValue={v("sku", defaults?.sku)}
                  placeholder="tavola-burger"
                  className={inputCls}
                />
              </Field>
              <Field label="Name" error={errors.name} required>
                <input
                  name="name"
                  required
                  defaultValue={v("name", defaults?.name)}
                  placeholder="The Tavola burger"
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="Description">
              <textarea
                name="description"
                rows={3}
                defaultValue={v("description", defaults?.description)}
                placeholder="Aged Aberdeen Angus, brioche bun, aged cheddar."
                className={inputCls}
              />
            </Field>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Category" error={errors.categoryId}>
            <CategorySelector
              name="categoryId"
              initial={categories}
              defaultValue={values?.categoryId ?? defaults?.categoryId ?? null}
            />
          </Field>
          <Field label="Station" error={errors.station} required>
            <select
              name="station"
              required
              defaultValue={v("station", defaults?.station ?? "grill")}
              className={inputCls}
            >
              {STATIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Base price (£)" error={errors.basePriceGbp} required>
            <input
              name="basePriceGbp"
              type="number"
              min="0"
              step="0.01"
              required
              defaultValue={v(
                "basePriceGbp",
                defaults?.basePricePence ? defaults.basePricePence / 100 : "",
              )}
              placeholder="12.00"
              className={inputCls}
            />
          </Field>
          <Field label="Tint (Order App card)" error={errors.tint}>
            <select
              name="tint"
              defaultValue={v("tint", defaults?.tint)}
              className={inputCls}
            >
              {TINTS.map((t) => (
                <option key={t.v} value={t.v}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Sort order" error={errors.sortOrder}>
            <input
              name="sortOrder"
              type="number"
              min="0"
              defaultValue={v("sortOrder", defaults?.sortOrder ?? 0)}
              className={inputCls}
            />
          </Field>
          <Field
            label="Allergens (comma-separated)"
            error={errors.allergens}
            help="Per Natasha's Law — required for every item before serve."
          >
            <input
              name="allergens"
              defaultValue={v("allergens", defaults?.allergens?.join(", "))}
              placeholder="gluten, milk, egg"
              className={inputCls}
            />
          </Field>
        </div>

        <div className="mt-4">
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              name="crossSell"
              defaultChecked={
                values
                  ? values.crossSell === "on"
                  : (defaults?.crossSell ?? false)
              }
              className="accent-terra w-4 h-4"
            />
            Show as cart cross-sell on the Order App
          </label>
        </div>
      </section>

      {/* Upsell sequence */}
      <section className="card">
        <header className="flex items-start justify-between mb-5">
          <div>
            <h3 className="font-serif text-xl text-ink">Upsell sequence</h3>
            <p className="text-sm text-muted italic mt-1">
              {steps.length} of 3 step{steps.length === 1 ? "" : "s"} · max 3
              recommended. Conversion drops sharply past three.
            </p>
          </div>
          {steps.length < 3 ? (
            <button
              type="button"
              onClick={() => dispatch({ type: "ADD_STEP" })}
              className="inline-flex items-center gap-1.5 text-xs border border-border bg-surface text-text px-3 py-1.5 rounded hover:bg-surface2 transition-colors"
            >
              <Plus size={13} strokeWidth={2} />
              Add step
            </button>
          ) : null}
        </header>

        {steps.length === 0 ? (
          <div className="text-center py-10 px-6 border-2 border-dashed border-border rounded-lg">
            <p className="text-sm text-muted">No upsell steps yet.</p>
            <button
              type="button"
              onClick={() => dispatch({ type: "ADD_STEP" })}
              className="inline-flex items-center gap-1.5 mt-3 text-sm text-terraFg hover:text-terra"
            >
              <Plus size={14} strokeWidth={2} />
              Add the first step
            </button>
          </div>
        ) : (
          <ol className="space-y-4">
            {steps.map((step, stepIdx) => (
              <StepCard
                key={step.uiId}
                step={step}
                stepIdx={stepIdx}
                total={steps.length}
                dispatch={dispatch}
                errors={errors}
              />
            ))}
          </ol>
        )}
      </section>

      {/* Footer save (sticky duplicate of the header button for long forms) */}
      <div className="flex justify-end pt-2 sticky bottom-4">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 bg-ink text-bg px-5 py-2.5 rounded font-medium hover:bg-text transition-colors disabled:opacity-50 shadow-lg"
        >
          <Save size={14} strokeWidth={2} />
          {pending
            ? "Saving…"
            : mode === "create"
              ? "Create item"
              : "Save changes"}
        </button>
      </div>
    </form>
  );
}

// ─── Step card ────────────────────────────────────────────────────────────

function StepCard({
  step,
  stepIdx,
  total,
  dispatch,
  errors,
}: {
  step: StepDraft;
  stepIdx: number;
  total: number;
  dispatch: React.Dispatch<Action>;
  errors: Record<string, string>;
}) {
  return (
    <li className="border border-border rounded-xl p-5 bg-surface2/40">
      <header className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="pill bg-ink text-bg font-mono">
            Step {stepIdx + 1} of {total}
          </span>
          <p className="text-sm text-muted italic">
            {step.question || "Untitled step"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <IconBtn
            onClick={() => dispatch({ type: "MOVE_STEP", stepIdx, dir: -1 })}
            disabled={stepIdx === 0}
            ariaLabel="Move step up"
          >
            <ChevronUp size={14} strokeWidth={1.75} />
          </IconBtn>
          <IconBtn
            onClick={() => dispatch({ type: "MOVE_STEP", stepIdx, dir: 1 })}
            disabled={stepIdx === total - 1}
            ariaLabel="Move step down"
          >
            <ChevronDown size={14} strokeWidth={1.75} />
          </IconBtn>
          <IconBtn
            onClick={() => dispatch({ type: "REMOVE_STEP", stepIdx })}
            ariaLabel="Remove step"
            danger
          >
            <Trash2 size={14} strokeWidth={1.75} />
          </IconBtn>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Question" error={errors[`steps.${stepIdx}.question`]}>
          <input
            value={step.question}
            onChange={(e) =>
              dispatch({
                type: "SET_STEP_FIELD",
                stepIdx,
                field: "question",
                value: e.target.value,
              })
            }
            placeholder="Make it a double?"
            className={inputCls}
          />
        </Field>
        <Field label="Subtitle (optional)">
          <input
            value={step.subtitle}
            onChange={(e) =>
              dispatch({
                type: "SET_STEP_FIELD",
                stepIdx,
                field: "subtitle",
                value: e.target.value,
              })
            }
            placeholder="A second patty turns this into a proper hand-burner."
            className={inputCls}
          />
        </Field>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] uppercase tracking-wide text-muted font-medium">
            Options ({step.options.length})
          </p>
          <button
            type="button"
            onClick={() => dispatch({ type: "ADD_OPTION", stepIdx })}
            className="inline-flex items-center gap-1 text-xs text-terraFg hover:text-terra"
          >
            <Plus size={12} strokeWidth={2} />
            Add option
          </button>
        </div>

        <ul className="space-y-2">
          {step.options.map((option, optionIdx) => (
            <OptionRow
              key={option.uiId}
              option={option}
              stepIdx={stepIdx}
              optionIdx={optionIdx}
              canRemove={step.options.length > 1}
              dispatch={dispatch}
              error={errors[`steps.${stepIdx}.options.${optionIdx}.label`]}
            />
          ))}
        </ul>
      </div>
    </li>
  );
}

function OptionRow({
  option,
  stepIdx,
  optionIdx,
  canRemove,
  dispatch,
  error,
}: {
  option: OptionDraft;
  stepIdx: number;
  optionIdx: number;
  canRemove: boolean;
  dispatch: React.Dispatch<Action>;
  error?: string;
}) {
  const set = (field: keyof OptionDraft, value: string | number | boolean) =>
    dispatch({ type: "SET_OPTION_FIELD", stepIdx, optionIdx, field, value });

  const featuredCls = option.featured
    ? "border-terra bg-terraSoft/40"
    : "border-border bg-surface";

  return (
    <li className={`border rounded-lg p-3 ${featuredCls}`}>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_110px_auto] gap-3 items-start">
        <div>
          <input
            value={option.label}
            onChange={(e) => set("label", e.target.value)}
            placeholder="Yes, double it up"
            className={`${inputCls} font-medium`}
          />
          {error ? <p className="text-xs text-red mt-1">{error}</p> : null}
        </div>
        <input
          value={option.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Two patties, two slices of cheese"
          className={`${inputCls} text-text`}
        />
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-text font-mono text-sm">+£</span>
            <input
              type="number"
              min="0"
              step="0.50"
              value={(option.deltaPence / 100).toString()}
              onChange={(e) =>
                set("deltaPence", Math.round(Number(e.target.value || 0) * 100))
              }
              className={`${inputCls} text-right tabular-nums`}
            />
          </div>
          {option.deltaPence === 0 ? (
            <p className="text-[10px] text-muted text-right mt-0.5">
              no change
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <FeaturedToggle
            on={option.featured}
            onClick={() => set("featured", !option.featured)}
          />
          {canRemove ? (
            <IconBtn
              onClick={() =>
                dispatch({ type: "REMOVE_OPTION", stepIdx, optionIdx })
              }
              ariaLabel="Remove option"
              danger
            >
              <Trash2 size={13} strokeWidth={1.75} />
            </IconBtn>
          ) : null}
        </div>
      </div>

      {option.featured ? (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wide text-terraFg font-medium">
            Badge
          </span>
          <input
            value={option.badge}
            onChange={(e) => set("badge", e.target.value)}
            placeholder="Most popular"
            className={`${inputCls} max-w-[220px]`}
          />
        </div>
      ) : null}
    </li>
  );
}

// ─── Small UI bits ────────────────────────────────────────────────────────

const inputCls =
  "w-full px-3 py-2 bg-surface2 border border-border rounded text-sm text-ink focus:outline-none focus:ring-2 focus:ring-terra/30";

function Field({
  label,
  error,
  help,
  required,
  children,
}: {
  label: string;
  error?: string;
  help?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wide text-muted font-medium">
        {label}
        {required ? <span className="text-terra ml-1">*</span> : null}
      </span>
      <div className="mt-1">{children}</div>
      {error ? <p className="text-xs text-red mt-1">{error}</p> : null}
      {help ? <p className="text-xs text-muted italic mt-1">{help}</p> : null}
    </label>
  );
}

function IconBtn({
  children,
  onClick,
  ariaLabel,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={[
        "p-1.5 rounded transition-colors",
        disabled
          ? "text-muted/40 cursor-not-allowed"
          : danger
            ? "text-muted hover:text-red hover:bg-red/10"
            : "text-muted hover:text-ink hover:bg-surface2",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function FeaturedToggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={on ? "Unmark as featured" : "Mark as featured"}
      title={
        on ? "Featured option (shows a badge)" : "Make this the featured option"
      }
      className={[
        "p-1.5 rounded transition-colors",
        on
          ? "text-terra bg-terraSoft"
          : "text-muted hover:text-terra hover:bg-terraSoft/50",
      ].join(" ")}
    >
      <Star
        size={13}
        strokeWidth={on ? 2.5 : 1.75}
        fill={on ? "#B8543D" : "none"}
      />
    </button>
  );
}
