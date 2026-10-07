"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import {
  CREDENTIAL_TYPES,
  organizationsApi,
  skillsApi,
  tagsApi,
  type CredentialSummary,
  type CredentialType,
  type NamedRef,
  type OrganizationRef,
} from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const textareaClass =
  "flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export interface CredentialFormValue {
  title: string;
  description: string;
  type: CredentialType;
  organizationId: string | null;
  date: string; // yyyy-mm-dd or ""
  location: string;
  url: string;
  skillIds: string[];
  tagIds: string[];
}

export function formValueFrom(c: CredentialSummary): CredentialFormValue {
  return {
    title: c.title,
    description: c.description ?? "",
    type: c.type,
    organizationId: c.organization?.id ?? null,
    date: c.date ? c.date.slice(0, 10) : "",
    location: c.location ?? "",
    url: c.url ?? "",
    skillIds: c.skills.map((s) => s.id),
    tagIds: c.tags.map((t) => t.id),
  };
}

export const EMPTY_FORM: CredentialFormValue = {
  title: "",
  description: "",
  type: "OTHER",
  organizationId: null,
  date: "",
  location: "",
  url: "",
  skillIds: [],
  tagIds: [],
};

function RefPicker({
  label,
  available,
  selectedIds,
  onToggle,
  onCreate,
  placeholder,
}: {
  label: string;
  available: NamedRef[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onCreate: (name: string) => Promise<void>;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  const [creating, setCreating] = useState(false);
  const selected = new Set(selectedIds);
  const unselected = available.filter((r) => !selected.has(r.id));

  async function create() {
    const name = draft.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      await onCreate(name);
      setDraft("");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {available
            .filter((r) => selected.has(r.id))
            .map((r) => (
              <Badge key={r.id} variant="default" className="gap-1">
                {r.name}
                <button
                  type="button"
                  aria-label={`Remove ${r.name}`}
                  onClick={() => onToggle(r.id)}
                  className="rounded-full hover:opacity-70"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
        </div>
      )}
      {unselected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unselected.map((r) => (
            <button key={r.id} type="button" onClick={() => onToggle(r.id)}>
              <Badge variant="outline" className="hover:bg-accent">
                {r.name}
              </Badge>
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              create();
            }
          }}
        />
        <Button type="button" variant="outline" size="sm" disabled={creating} onClick={create}>
          <Plus />
          Add
        </Button>
      </div>
    </div>
  );
}

export function CredentialForm({
  initial,
  skills,
  tags,
  orgs,
  pending,
  error,
  submitLabel,
  onSkillsChange,
  onTagsChange,
  onOrgsChange,
  onSubmit,
}: {
  initial: CredentialFormValue;
  skills: NamedRef[];
  tags: NamedRef[];
  orgs: OrganizationRef[];
  pending: boolean;
  error: string | null;
  submitLabel: string;
  onSkillsChange: (s: NamedRef[]) => void;
  onTagsChange: (t: NamedRef[]) => void;
  onOrgsChange: (o: OrganizationRef[]) => void;
  onSubmit: (v: CredentialFormValue) => void;
}) {
  const [value, setValue] = useState<CredentialFormValue>(initial);
  const [newOrgMode, setNewOrgMode] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgWebsite, setNewOrgWebsite] = useState("");
  const [orgError, setOrgError] = useState<string | null>(null);

  function patch(p: Partial<CredentialFormValue>) {
    setValue((v) => ({ ...v, ...p }));
  }

  function toggle(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  async function createOrg() {
    const name = newOrgName.trim();
    if (!name) {
      setOrgError("Organization name is required");
      return;
    }
    try {
      const created = await organizationsApi.create({
        name,
        website: newOrgWebsite.trim() || undefined,
      });
      onOrgsChange([...orgs, created]);
      patch({ organizationId: created.id });
      setNewOrgMode(false);
      setNewOrgName("");
      setNewOrgWebsite("");
      setOrgError(null);
    } catch (e) {
      setOrgError(e instanceof Error ? e.message : "Could not create organization");
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(value);
      }}
      className="space-y-6"
    >
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              required
              maxLength={200}
              placeholder="e.g. SOLARIS — Solar Pre-Assessment System"
              value={value.title}
              onChange={(e) => patch({ title: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                className={selectClass}
                value={value.type}
                onChange={(e) => patch({ type: e.target.value as CredentialType })}
              >
                {CREDENTIAL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={value.date}
                onChange={(e) => patch({ date: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              className={textareaClass}
              rows={4}
              maxLength={10000}
              placeholder="What happened, what you built, what you learned…"
              value={value.description}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                maxLength={200}
                placeholder="e.g. Cebu City"
                value={value.location}
                onChange={(e) => patch({ location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">Link</Label>
              <Input
                id="url"
                type="url"
                maxLength={2048}
                placeholder="https://…"
                value={value.url}
                onChange={(e) => patch({ url: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="space-y-2">
            <Label htmlFor="org">Organization</Label>
            {!newOrgMode ? (
              <div className="flex gap-2">
                <select
                  id="org"
                  className={selectClass}
                  value={value.organizationId ?? ""}
                  onChange={(e) => patch({ organizationId: e.target.value || null })}
                >
                  <option value="">None</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
                <Button type="button" variant="outline" size="sm" onClick={() => setNewOrgMode(true)}>
                  <Plus />
                  New
                </Button>
              </div>
            ) : (
              <div className="space-y-2 rounded-md border border-dashed p-3">
                <Input
                  placeholder="Organization name *"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                />
                <Input
                  placeholder="Website (optional)"
                  value={newOrgWebsite}
                  onChange={(e) => setNewOrgWebsite(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={createOrg}>
                    Create
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setNewOrgMode(false)}>
                    Cancel
                  </Button>
                </div>
                {orgError && (
                  <p role="alert" className="text-sm text-destructive">
                    {orgError}
                  </p>
                )}
              </div>
            )}
          </div>

          <RefPicker
            label="Skills"
            available={skills}
            selectedIds={value.skillIds}
            onToggle={(id) => patch({ skillIds: toggle(value.skillIds, id) })}
            onCreate={async (name) => {
              const created = await skillsApi.create(name);
              onSkillsChange([...skills, created]);
              patch({ skillIds: [...value.skillIds, created.id] });
            }}
            placeholder="e.g. Node.js"
          />

          <RefPicker
            label="Tags"
            available={tags}
            selectedIds={value.tagIds}
            onToggle={(id) => patch({ tagIds: toggle(value.tagIds, id) })}
            onCreate={async (name) => {
              const created = await tagsApi.create(name);
              onTagsChange([...tags, created]);
              patch({ tagIds: [...value.tagIds, created.id] });
            }}
            placeholder="e.g. portfolio"
          />
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
