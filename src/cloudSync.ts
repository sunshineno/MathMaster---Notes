import type { NotebookState } from "./types";
import { supabase } from "./supabase";

const META_PREFIX = "mathmaster-cloud-meta-v1:";

export type CloudSyncStatus =
  | "initializing"
  | "synced"
  | "syncing"
  | "offline"
  | "conflict"
  | "error";

export interface CloudNotebookRow {
  user_id: string;
  state: NotebookState;
  updated_at: string;
}

interface CloudSyncMeta {
  lastSyncedHash: string;
  lastCloudUpdatedAt: string;
}

function metaKey(userId: string) {
  return `${META_PREFIX}${userId}`;
}

export function readCloudMeta(userId: string): CloudSyncMeta | null {
  try {
    const raw = localStorage.getItem(metaKey(userId));
    return raw ? (JSON.parse(raw) as CloudSyncMeta) : null;
  } catch {
    return null;
  }
}

export function writeCloudMeta(
  userId: string,
  state: NotebookState,
  updatedAt: string
) {
  const meta: CloudSyncMeta = {
    lastSyncedHash: hashNotebook(state),
    lastCloudUpdatedAt: updatedAt
  };
  localStorage.setItem(metaKey(userId), JSON.stringify(meta));
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map(key => `${JSON.stringify(key)}:${stableStringify(object[key])}`)
    .join(",")}}`;
}

export function hashNotebook(state: NotebookState): string {
  const content = stableStringify(state);
  let hash = 2166136261;

  for (let index = 0; index < content.length; index += 1) {
    hash ^= content.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function ensureClient() {
  if (!supabase) {
    throw new Error("Supabase n’est pas configuré.");
  }
  return supabase;
}

export async function fetchCloudNotebook(
  userId: string
): Promise<CloudNotebookRow | null> {
  const client = ensureClient();
  const { data, error } = await client
    .from("user_notebooks")
    .select("user_id,state,updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as CloudNotebookRow | null;
}

export async function uploadCloudNotebook(
  userId: string,
  state: NotebookState
): Promise<CloudNotebookRow> {
  const client = ensureClient();
  const updatedAt = new Date().toISOString();
  const { data, error } = await client
    .from("user_notebooks")
    .upsert(
      {
        user_id: userId,
        state,
        updated_at: updatedAt
      },
      { onConflict: "user_id" }
    )
    .select("user_id,state,updated_at")
    .single();

  if (error) throw error;
  return data as CloudNotebookRow;
}

export function formatCloudDate(value: string | null) {
  if (!value) return "Jamais";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}
