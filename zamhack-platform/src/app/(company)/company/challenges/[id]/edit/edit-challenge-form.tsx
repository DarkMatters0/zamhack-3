"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateChallenge,
  type MilestoneInput,
  type UpdateChallengeInput,
} from "@/app/challenges/edit-actions";
import { Constants } from "@/types/supabase";

// Pulled directly from generated Supabase constants — always in sync with DB.
const STATUSES = Constants.public.Enums.challenge_status;
const DIFFICULTIES = Constants.public.Enums.proficiency_level;
const INDUSTRIES = ["Technology", "Finance", "Healthcare", "Education", "Other"] as const;
const PARTICIPATION_TYPES = ["solo", "team", "both"] as const;

export default function EditChallengeForm({ challenge }: { challenge: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState<string>(challenge.title ?? "");
  const [description, setDescription] = useState<string>(challenge.description ?? "");
  const [problemBrief, setProblemBrief] = useState<string>(challenge.problem_brief ?? "");
  const [industry, setIndustry] = useState<string>(challenge.industry ?? "");
  const [difficulty, setDifficulty] = useState<UpdateChallengeInput["difficulty"]>(
    challenge.difficulty ?? "beginner"
  );
  const [status, setStatus] = useState<UpdateChallengeInput["status"]>(
    challenge.status ?? "draft"
  );
  const [participationType, setParticipationType] = useState<UpdateChallengeInput["participation_type"]>(
    challenge.participation_type ?? "solo"
  );
  const [maxParticipants, setMaxParticipants] = useState<number>(challenge.max_participants ?? 50);
  const [maxTeams, setMaxTeams] = useState<number>(challenge.max_teams ?? 20);
  const [maxTeamSize, setMaxTeamSize] = useState<number>(challenge.max_team_size ?? 4);
  const [startDate, setStartDate] = useState<string>(toDatetimeLocal(challenge.start_date));
  const [endDate, setEndDate] = useState<string>(toDatetimeLocal(challenge.end_date));
  const [registrationDeadline, setRegistrationDeadline] = useState<string>(
    toDatetimeLocal(challenge.registration_deadline)
  );
  const [entryFee, setEntryFee] = useState<number>(challenge.entry_fee_amount ?? 0);
  const [currency, setCurrency] = useState<string>(challenge.currency ?? "PHP");

  const [milestones, setMilestones] = useState<MilestoneInput[]>(
    (challenge.milestones ?? [])
      .sort((a: any, b: any) => a.sequence_order - b.sequence_order)
      .map((m: any) => ({
        id: m.id,
        title: m.title,
        description: m.description ?? "",
        due_date: toDatetimeLocal(m.due_date),
        sequence_order: m.sequence_order,
        requires_github: m.requires_github ?? false,
        requires_url: m.requires_url ?? false,
        requires_text: m.requires_text ?? false,
      }))
  );

  function addMilestone() {
    setMilestones((prev) => [
      ...prev,
      {
        title: "",
        description: "",
        due_date: "",
        sequence_order: prev.length + 1,
        requires_github: false,
        requires_url: false,
        requires_text: true,
      },
    ]);
  }

  function removeMilestone(index: number) {
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  }

  function updateMilestone(index: number, field: keyof MilestoneInput, value: any) {
    setMilestones((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await updateChallenge(challenge.id, {
        title,
        description,
        problem_brief: problemBrief,
        industry,
        difficulty,
        status,
        participation_type: participationType,
        max_participants: maxParticipants,
        max_teams: maxTeams,
        max_team_size: maxTeamSize,
        start_date: startDate,
        end_date: endDate,
        registration_deadline: registrationDeadline,
        entry_fee_amount: entryFee,
        currency,
        milestones,
      });
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* ── Basic Info ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Basic Info</h2>

        <Field label="Title">
          <input
            title="Title"
            placeholder="Title"
            className={inputCls}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </Field>

        <Field label="Description">
          <textarea
            title="Description"
            placeholder="Description"
            className={inputCls}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <Field label="Problem Brief">
          <textarea
            title="Problem Brief"
            placeholder="Problem Brief"
            className={inputCls}
            rows={5}
            value={problemBrief}
            onChange={(e) => setProblemBrief(e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Industry">
            <select
              title="Industry"
              className={inputCls}
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            >
              <option value="">Select industry</option>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </Field>

          <Field label="Difficulty">
            <select
              title="Difficulty"
              className={inputCls}
              value={difficulty}
              onChange={(e) =>
                setDifficulty(e.target.value as UpdateChallengeInput["difficulty"])
              }
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      {/* ── Status & Participation ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Status &amp; Participation</h2>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Status">
            <select
              title="Status"
              className={inputCls}
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as UpdateChallengeInput["status"])
              }
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>

          <Field label="Participation Type">
            <select
              title="Participation Type"
              className={inputCls}
              value={participationType}
              onChange={(e) =>
                setParticipationType(
                  e.target.value as UpdateChallengeInput["participation_type"]
                )
              }
            >
              {PARTICIPATION_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Max Participants">
            <input
              title="Max Participants"
              placeholder="50"
              type="number"
              className={inputCls}
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(Number(e.target.value))}
              min={1}
            />
          </Field>
          <Field label="Max Teams">
            <input
              title="Max Teams"
              placeholder="20"
              type="number"
              className={inputCls}
              value={maxTeams}
              onChange={(e) => setMaxTeams(Number(e.target.value))}
              min={1}
            />
          </Field>
          <Field label="Max Team Size">
            <input
              title="Max Team Size"
              placeholder="4"
              type="number"
              className={inputCls}
              value={maxTeamSize}
              onChange={(e) => setMaxTeamSize(Number(e.target.value))}
              min={1}
            />
          </Field>
        </div>
      </section>

      {/* ── Dates ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Dates</h2>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Start Date">
            <input
              title="Start Date"
              type="datetime-local"
              className={inputCls}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Field>
          <Field label="End Date">
            <input
              title="End Date"
              type="datetime-local"
              className={inputCls}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Field>
          <Field label="Registration Deadline">
            <input
              title="Registration Deadline"
              type="datetime-local"
              className={inputCls}
              value={registrationDeadline}
              onChange={(e) => setRegistrationDeadline(e.target.value)}
            />
          </Field>
        </div>
      </section>

      {/* ── Prize / Reward ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Prize / Entry Fee</h2>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Entry Fee Amount">
            <input
              title="Entry Fee Amount"
              placeholder="0.00"
              type="number"
              className={inputCls}
              value={entryFee}
              onChange={(e) => setEntryFee(Number(e.target.value))}
              min={0}
              step="0.01"
            />
          </Field>
          <Field label="Currency">
            <input
              title="Currency"
              placeholder="PHP"
              className={inputCls}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            />
          </Field>
        </div>
      </section>

      {/* ── Milestones ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Milestones</h2>
          <button
            type="button"
            onClick={addMilestone}
            className="text-sm text-orange-600 hover:underline font-medium"
          >
            + Add Milestone
          </button>
        </div>

        {milestones.map((m, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-500">Milestone {i + 1}</span>
              <button
                type="button"
                onClick={() => removeMilestone(i)}
                className="text-xs text-red-500 hover:underline"
              >
                Remove
              </button>
            </div>

            <Field label="Title">
              <input
                title="Milestone Title"
                placeholder="Milestone Title"
                className={inputCls}
                value={m.title}
                onChange={(e) => updateMilestone(i, "title", e.target.value)}
                required
              />
            </Field>

            <Field label="Description">
              <textarea
                title="Milestone Description"
                placeholder="Milestone Description"
                className={inputCls}
                rows={2}
                value={m.description}
                onChange={(e) => updateMilestone(i, "description", e.target.value)}
              />
            </Field>

            <Field label="Due Date">
              <input
                title="Due Date"
                type="datetime-local"
                className={inputCls}
                value={m.due_date}
                onChange={(e) => updateMilestone(i, "due_date", e.target.value)}
              />
            </Field>

            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  title="Requires GitHub"
                  checked={m.requires_github}
                  onChange={(e) => updateMilestone(i, "requires_github", e.target.checked)}
                />
                Requires GitHub
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  title="Requires URL"
                  checked={m.requires_url}
                  onChange={(e) => updateMilestone(i, "requires_url", e.target.checked)}
                />
                Requires URL
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  title="Requires Text"
                  checked={m.requires_text}
                  onChange={(e) => updateMilestone(i, "requires_text", e.target.checked)}
                />
                Requires Text
              </label>
            </div>
          </div>
        ))}
      </section>

      {/* ── Actions ── */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-md font-medium disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="border px-6 py-2 rounded-md font-medium hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Helpers ──

const inputCls =
  "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

function toDatetimeLocal(isoString: string | null | undefined): string {
  if (!isoString) return "";
  return new Date(isoString).toISOString().slice(0, 16);
}