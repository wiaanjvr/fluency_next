"use client";

import { useState, useEffect, useCallback } from "react";
import type { CommunityDonation } from "@/types/ocean-impact";

/* =============================================================================
   ADMIN — DONATIONS PANEL
   Route: /admin/donations

   Monthly tool for:
     1. Creating community_donations rows (with auto-computed impact figures)
     2. Uploading receipt URLs to existing donations
     3. Triggering proportional allocation across redeemed credits
     4. Sending impact notification emails to users

   Access: Must be signed in as ADMIN_EMAIL (checked server-side per request).
============================================================================= */

// ── Impact constants (must match src/lib/impact-constants.ts) ───────────────
const BOTTLES_PER_DOLLAR = 19;
const FIELDS_PER_DOLLAR = 0.05; // $20 = 1 football field
const DEFAULT_ZAR_RATE = 16.5;

// ── Helpers ──────────────────────────────────────────────────────────────────
function lastMonthRange(): { start: string; end: string } {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const last = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    start: first.toISOString().split("T")[0],
    end: last.toISOString().split("T")[0],
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ── Status badge ─────────────────────────────────────────────────────────────
function Badge({
  ok,
  label,
  okLabel,
}: {
  ok: boolean;
  label: string;
  okLabel: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${
        ok ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
      }`}
    >
      {ok ? "✓" : "✗"} {ok ? okLabel : label}
    </span>
  );
}

// ── Row action button ─────────────────────────────────────────────────────────
function ActionButton({
  onClick,
  loading,
  disabled,
  variant,
  children,
}: {
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
  variant: "blue" | "violet" | "slate";
  children: React.ReactNode;
}) {
  const colors = {
    blue: "bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300",
    violet: "bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300",
    slate: "bg-slate-600 hover:bg-slate-700 disabled:bg-slate-400",
  };
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`rounded px-3 py-1.5 text-xs font-medium text-white transition-colors ${colors[variant]} disabled:cursor-not-allowed`}
    >
      {loading ? "…" : children}
    </button>
  );
}

// ── Receipt row ───────────────────────────────────────────────────────────────
function ReceiptCell({
  donation,
  onSaved,
}: {
  donation: CommunityDonation;
  onSaved: (url: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(donation.receipt_url || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    if (!value.trim()) return;
    setSaving(true);
    setMsg("");
    const res = await fetch(`/api/admin/donations/${donation.id}/receipt`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receipt_url: value.trim() }),
    });
    setSaving(false);
    if (res.ok) {
      onSaved(value.trim());
      setEditing(false);
      setMsg("Saved");
    } else {
      const j = await res.json();
      setMsg(j.error || "Error saving");
    }
  }

  if (!editing && donation.receipt_url) {
    return (
      <div className="flex items-center gap-2">
        <a
          href={donation.receipt_url}
          target="_blank"
          rel="noopener noreferrer"
          className="max-w-[140px] truncate text-xs text-blue-600 underline"
        >
          View
        </a>
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <input
          type="url"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://…"
          className="w-36 rounded border border-slate-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
        />
        <ActionButton onClick={save} loading={saving} variant="slate">
          Save
        </ActionButton>
        {editing && (
          <button
            onClick={() => setEditing(false)}
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            Cancel
          </button>
        )}
      </div>
      {msg && (
        <span
          className={`text-xs ${msg === "Saved" ? "text-emerald-600" : "text-red-600"}`}
        >
          {msg}
        </span>
      )}
    </div>
  );
}

// ── Donation row ──────────────────────────────────────────────────────────────
function DonationRow({
  donation: initial,
  onReceiptSaved,
}: {
  donation: CommunityDonation;
  onReceiptSaved: (id: string, url: string) => void;
}) {
  const [donation, setDonation] = useState(initial);
  const [allocLoading, setAllocLoading] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [allocResult, setAllocResult] = useState<string | null>(null);
  const [notifyResult, setNotifyResult] = useState<string | null>(null);

  async function runAllocation() {
    setAllocLoading(true);
    setAllocResult(null);
    const res = await fetch(`/api/admin/donations/${donation.id}/allocate`, {
      method: "POST",
    });
    const j = await res.json();
    setAllocLoading(false);
    if (res.ok) {
      setAllocResult(
        `✓ ${j.users_updated} users — ${Math.round(j.bottles_intercepted).toLocaleString()} bottles`,
      );
    } else {
      setAllocResult(`✗ ${j.error}`);
    }
  }

  async function sendNotifications() {
    setNotifyLoading(true);
    setNotifyResult(null);
    const res = await fetch(`/api/admin/donations/${donation.id}/notify`, {
      method: "POST",
    });
    const j = await res.json();
    setNotifyLoading(false);
    if (res.ok) {
      setNotifyResult(
        j.emails_sent !== undefined
          ? `✓ ${j.emails_sent} sent${j.emails_failed ? `, ${j.emails_failed} failed` : ""}`
          : j.message || "Done",
      );
    } else {
      setNotifyResult(`✗ ${j.error}`);
    }
  }

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      {/* Period */}
      <td className="px-3 py-3 text-sm">
        <div className="font-medium text-slate-800">
          {formatDate(donation.period_start)}
        </div>
        <div className="text-xs text-slate-500">
          → {formatDate(donation.period_end)}
        </div>
      </td>

      {/* Amounts */}
      <td className="px-3 py-3 text-sm">
        <div className="font-medium text-slate-800">
          R{Number(donation.amount_zar).toLocaleString()}
        </div>
        <div className="text-xs text-slate-500">
          ${Number(donation.amount_usd).toFixed(2)}
        </div>
      </td>

      {/* Impact */}
      <td className="px-3 py-3 text-sm">
        <div className="text-slate-800">
          🍶 {Math.round(donation.bottles_intercepted).toLocaleString()}
        </div>
        <div className="text-xs text-slate-500">
          🏈 {Number(donation.football_fields_swept).toFixed(2)} fields
        </div>
      </td>

      {/* Credits */}
      <td className="px-3 py-3 text-sm text-slate-700">
        {donation.total_credits_redeemed.toLocaleString()}
      </td>

      {/* Receipt */}
      <td className="px-3 py-3">
        <ReceiptCell
          donation={donation}
          onSaved={(url) => {
            setDonation((d) => ({ ...d, receipt_url: url }));
            onReceiptSaved(donation.id, url);
          }}
        />
      </td>

      {/* Allocate */}
      <td className="px-3 py-3">
        <div className="flex flex-col gap-1">
          <ActionButton
            onClick={runAllocation}
            loading={allocLoading}
            variant="blue"
          >
            Run Allocation
          </ActionButton>
          {allocResult && (
            <span
              className={`text-xs ${allocResult.startsWith("✓") ? "text-emerald-600" : "text-red-600"}`}
            >
              {allocResult}
            </span>
          )}
        </div>
      </td>

      {/* Notify */}
      <td className="px-3 py-3">
        <div className="flex flex-col gap-1">
          <ActionButton
            onClick={sendNotifications}
            loading={notifyLoading}
            variant="violet"
          >
            Send Notifications
          </ActionButton>
          {notifyResult && (
            <span
              className={`text-xs ${notifyResult.startsWith("✓") ? "text-emerald-600" : "text-red-600"}`}
            >
              {notifyResult}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Create donation form ──────────────────────────────────────────────────────
function CreateDonationForm({
  onCreated,
}: {
  onCreated: (d: CommunityDonation) => void;
}) {
  const { start, end } = lastMonthRange();

  const [periodStart, setPeriodStart] = useState(start);
  const [periodEnd, setPeriodEnd] = useState(end);
  const [zarAmount, setZarAmount] = useState("");
  const [zarRate, setZarRate] = useState(String(DEFAULT_ZAR_RATE));
  const [usdAmount, setUsdAmount] = useState("");
  const [bottles, setBottles] = useState("");
  const [fields, setFields] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [donatedAt, setDonatedAt] = useState(
    new Date().toISOString().slice(0, 16),
  );
  const [autoCompute, setAutoCompute] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Auto-compute USD, bottles, fields from ZAR
  useEffect(() => {
    if (!autoCompute) return;
    const zar = parseFloat(zarAmount);
    const rate = parseFloat(zarRate);
    if (!isNaN(zar) && !isNaN(rate) && rate > 0) {
      const usd = zar / rate;
      setUsdAmount(usd.toFixed(2));
      setBottles(Math.round(usd * BOTTLES_PER_DOLLAR).toString());
      setFields((usd * FIELDS_PER_DOLLAR).toFixed(4));
    } else {
      setUsdAmount("");
      setBottles("");
      setFields("");
    }
  }, [zarAmount, zarRate, autoCompute]);

  function setLastMonth() {
    const { start, end } = lastMonthRange();
    setPeriodStart(start);
    setPeriodEnd(end);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    const res = await fetch("/api/admin/donations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount_zar: parseFloat(zarAmount),
        amount_usd: parseFloat(usdAmount),
        bottles_intercepted: parseFloat(bottles),
        football_fields_swept: parseFloat(fields),
        period_start: periodStart,
        period_end: periodEnd,
        receipt_url: receiptUrl.trim() || null,
        donated_at: new Date(donatedAt).toISOString(),
      }),
    });

    setSubmitting(false);

    if (res.ok) {
      const j = await res.json();
      onCreated(j.donation);
      setSuccess(`Donation created — ID: ${j.donation.id.slice(0, 8)}…`);
      setZarAmount("");
      setReceiptUrl("");
    } else {
      const j = await res.json();
      setError(j.error || "Failed to create donation");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 className="mb-5 text-base font-semibold text-slate-800">
        Create New Donation
      </h2>

      {/* Period */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">
            Period Start
          </label>
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            required
            className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">
            Period End
          </label>
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            required
            className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={setLastMonth}
          className="rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          ← Last Month
        </button>
      </div>

      {/* Amounts */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">
            ZAR Amount (R)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={zarAmount}
            onChange={(e) => setZarAmount(e.target.value)}
            placeholder="500"
            required
            className="w-32 rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">
            ZAR → USD Rate
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={zarRate}
            onChange={(e) => setZarRate(e.target.value)}
            className="w-24 rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">
            USD Amount
            {autoCompute && <span className="ml-1 text-slate-400">(auto)</span>}
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={usdAmount}
            onChange={(e) => {
              setAutoCompute(false);
              setUsdAmount(e.target.value);
            }}
            placeholder="30.30"
            required
            className="w-28 rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50"
          />
        </div>

        {!autoCompute && (
          <button
            type="button"
            onClick={() => setAutoCompute(true)}
            className="self-end rounded border border-slate-300 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
          >
            Re-enable auto
          </button>
        )}
      </div>

      {/* Impact */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">
            🍶 Bottles Intercepted
            {autoCompute && (
              <span className="ml-1 text-slate-400">
                (auto @ {BOTTLES_PER_DOLLAR}/USD)
              </span>
            )}
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={bottles}
            onChange={(e) => {
              setAutoCompute(false);
              setBottles(e.target.value);
            }}
            placeholder="575"
            required
            className="w-36 rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">
            🏈 Football Fields
            {autoCompute && (
              <span className="ml-1 text-slate-400">(auto @ $20/field)</span>
            )}
          </label>
          <input
            type="number"
            step="0.0001"
            min="0"
            value={fields}
            onChange={(e) => {
              setAutoCompute(false);
              setFields(e.target.value);
            }}
            placeholder="1.5151"
            required
            className="w-36 rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Receipt & date */}
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">
            Receipt URL{" "}
            <span className="text-slate-400">(optional — can add later)</span>
          </label>
          <input
            type="url"
            value={receiptUrl}
            onChange={(e) => setReceiptUrl(e.target.value)}
            placeholder="https://drive.google.com/…"
            className="w-72 rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">
            Donated At
          </label>
          <input
            type="datetime-local"
            value={donatedAt}
            onChange={(e) => setDonatedAt(e.target.value)}
            required
            className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Preview */}
      {zarAmount && usdAmount && (
        <div className="mb-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <strong>Preview:</strong> R{parseFloat(zarAmount).toLocaleString()} ={" "}
          ${parseFloat(usdAmount).toFixed(2)} USD →{" "}
          {bottles ? Math.round(parseFloat(bottles)).toLocaleString() : "—"}{" "}
          bottles + {fields ? parseFloat(fields).toFixed(2) : "—"} football
          fields
        </div>
      )}

      {/* Feedback */}
      {error && (
        <p className="mb-3 rounded bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p className="mb-3 rounded bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-teal-300"
      >
        {submitting ? "Creating…" : "Create Donation"}
      </button>
    </form>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function AdminDonationsPage() {
  const [donations, setDonations] = useState<CommunityDonation[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  const fetchDonations = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/donations");
    if (res.status === 401) {
      setAuthError(
        "Unauthorized — you must be signed in as the admin account to use this page.",
      );
      setLoading(false);
      return;
    }
    if (res.ok) {
      const j = await res.json();
      setDonations(j.donations);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  function handleCreated(donation: CommunityDonation) {
    setDonations((prev) => [donation, ...prev]);
  }

  function handleReceiptSaved(id: string, url: string) {
    setDonations((prev) =>
      prev.map((d) => (d.id === id ? { ...d, receipt_url: url } : d)),
    );
  }

  if (authError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <p className="text-2xl">🔒</p>
          <p className="mt-2 text-sm text-red-700">{authError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              🌊 Ocean Donations Admin
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Monthly panel — create donation records, upload receipts, run
              allocation & send impact emails.
            </p>
          </div>
          <div className="rounded-lg bg-white px-4 py-2 text-xs text-slate-500 shadow-sm border border-slate-200">
            <div>
              Constants: {BOTTLES_PER_DOLLAR} bottles/$1 · $20 = 1 field
            </div>
            <div className="mt-0.5">ZAR default rate: {DEFAULT_ZAR_RATE}</div>
          </div>
        </div>

        {/* Create form */}
        <CreateDonationForm onCreated={handleCreated} />

        {/* Donations table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-800">
              Existing Donations
              <span className="ml-2 text-sm font-normal text-slate-400">
                ({donations.length})
              </span>
            </h2>
            <button
              onClick={fetchDonations}
              className="rounded border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Loading…
            </div>
          ) : donations.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No donations yet — create one above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3">Period</th>
                    <th className="px-3 py-3">Amount</th>
                    <th className="px-3 py-3">Impact</th>
                    <th className="px-3 py-3">Credits</th>
                    <th className="px-3 py-3">Receipt</th>
                    <th className="px-3 py-3">Allocate</th>
                    <th className="px-3 py-3">Notify</th>
                  </tr>
                </thead>
                <tbody>
                  {donations.map((d) => (
                    <DonationRow
                      key={d.id}
                      donation={d}
                      onReceiptSaved={handleReceiptSaved}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Workflow guide */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">
            Monthly workflow
          </h3>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-600">
            <li>
              Make the donation on{" "}
              <a
                href="https://theoceancleanup.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                theoceancleanup.com
              </a>{" "}
              and save the receipt URL (e.g. Google Drive link).
            </li>
            <li>
              <strong>Create Donation</strong> above — enter the ZAR amount,
              adjust the exchange rate, confirm the auto-computed impact
              figures, and paste the receipt URL.
            </li>
            <li>
              Click <strong>Run Allocation</strong> on the new row — this
              spreads impact proportionally to users who redeemed credits during
              that period.
            </li>
            <li>
              Click <strong>Send Notifications</strong> — sends personalised
              email impact summaries to each user via Resend.
            </li>
            <li>
              If you added the receipt later, use the <strong>Receipt</strong>{" "}
              column to upload it to the row.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
