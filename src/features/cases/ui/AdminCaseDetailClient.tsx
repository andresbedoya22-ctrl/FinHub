"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/ui/components/Card";
import { Header } from "@/ui/components/Header";
import { InfoBox } from "@/ui/components/InfoBox";
import { Screen } from "@/ui/components/Screen";
import {
  createAdminCaseNote,
  getAdminCaseDetail,
  updateAdminCaseTaskStatus,
  type AdminCaseDetailResponse,
} from "@/features/cases/adminCasesApi";

export function AdminCaseDetailClient({ caseId }: { caseId: string }) {
  const [detail, setDetail] = useState<AdminCaseDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminCaseDetail(caseId);
      setDetail(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load case detail");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const tasks = useMemo(() => detail?.tasks ?? [], [detail]);
  const documents = useMemo(() => detail?.documents ?? [], [detail]);
  const notes = useMemo(() => detail?.notes ?? [], [detail]);

  const doneRatio = useMemo(() => {
    if (tasks.length === 0) return "0/0";
    const done = tasks.filter((t) => t.status === "done").length;
    return `${done}/${tasks.length}`;
  }, [tasks]);

  async function onToggleTask(taskId: string, currentStatus: "open" | "in_progress" | "done") {
    const next = currentStatus === "done" ? "open" : "done";
    try {
      await updateAdminCaseTaskStatus(caseId, taskId, next);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update task");
    }
  }

  async function onAddNote() {
    if (!note.trim() || savingNote) return;
    setSavingNote(true);
    try {
      await createAdminCaseNote(caseId, note.trim());
      setNote("");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save note");
    } finally {
      setSavingNote(false);
    }
  }

  return (
    <Screen className="space-y-6">
      <Header
        title="Admin · Case detail"
        subtitle={detail?.case.title ?? "Case operations"}
        right={<Link href="/app/admin/cases" className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2">Back</Link>}
      />

      {loading ? <Card><InfoBox title="Loading" variant="info">Loading case detail...</InfoBox></Card> : null}
      {error ? <Card><InfoBox title="Error" variant="danger">{error}</InfoBox></Card> : null}

      {detail ? (
        <div className="space-y-4">
          <Card className="grid gap-2 md:grid-cols-3 text-sm">
            <div>Status: <b>{detail.case.status}</b></div>
            <div>Step: <b>{detail.case.step_key}</b></div>
            <div>Authorization: <b>{detail.case.authorization_status}</b></div>
            <div>Type: <b>{detail.case.type}</b></div>
            <div>Tasks done: <b>{doneRatio}</b></div>
            <div>Validated docs: <b>{documents.length}</b></div>
          </Card>

          <Card className="space-y-3">
            <div className="text-sm font-semibold">Tasks</div>
            {tasks.length === 0 ? (
              <InfoBox title="No tasks" variant="warning">This case has no tasks yet.</InfoBox>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div key={task.id} className="rounded-xl border border-fh-border p-3 text-sm flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">{task.title}</div>
                      <div className="text-xs text-fh-muted">Status: {task.status} · Updated: {new Date(task.updated_at).toLocaleString()}</div>
                    </div>
                    <button
                      onClick={() => void onToggleTask(task.id, task.status)}
                      className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-xs hover:bg-fh-surface-2"
                    >
                      {task.status === "done" ? "Reopen" : "Mark done"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="space-y-3">
            <div className="text-sm font-semibold">Validated documents</div>
            {documents.length === 0 ? (
              <InfoBox title="No validated docs" variant="warning">Only validated docs are shown in admin review.</InfoBox>
            ) : (
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left opacity-80">
                    <tr>
                      <th className="py-2 pr-4">File</th>
                      <th className="py-2 pr-4">Type</th>
                      <th className="py-2 pr-4">Validated at</th>
                      <th className="py-2 pr-0">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc.id} className="border-t border-fh-border">
                        <td className="py-2 pr-4">{doc.document?.file_name ?? doc.document_id}</td>
                        <td className="py-2 pr-4">{doc.document?.type ?? "-"}</td>
                        <td className="py-2 pr-4">{doc.validated_at ? new Date(doc.validated_at).toLocaleString() : "-"}</td>
                        <td className="py-2 pr-0">{doc.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="space-y-3">
            <div className="text-sm font-semibold">Internal notes</div>
            <div className="flex gap-2">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Write an internal note..."
                className="flex-1 rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"
              />
              <button
                onClick={() => void onAddNote()}
                disabled={savingNote || !note.trim()}
                className="rounded-xl bg-fh-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {savingNote ? "Saving..." : "Add note"}
              </button>
            </div>
            {notes.length === 0 ? (
              <InfoBox title="No notes" variant="warning">No internal notes yet.</InfoBox>
            ) : (
              <div className="space-y-2">
                {notes.map((n) => (
                  <div key={n.id} className="rounded-xl border border-fh-border bg-fh-surface-2 p-3 text-sm">
                    <div>{n.note}</div>
                    <div className="text-xs text-fh-muted mt-1">{new Date(n.created_at).toLocaleString()} · by {n.author_user_id}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : null}
    </Screen>
  );
}
