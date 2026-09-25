import { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  User as UserIcon,
  Loader2,
  AlertCircle,
  Sparkles,
  MessageCircle,
  ListChecks,
  Copy,
  Check,
  ChevronRight,
  History,
  Trash2,
} from 'lucide-react';
import {
  supabase,
  type Followup,
  type FollowupStatus,
  type Conversation,
  type GenerateFollowupResult,
} from '@/lib/supabase';
import ConfirmDialog from '@/components/ConfirmDialog';

type Props = {
  followup: Followup;
  onClose: () => void;
  onUpdate: () => void;
};

const STATUS_OPTIONS: { value: FollowupStatus; label: string; bg: string; text: string; border: string }[] = [
  { value: 'SCHEDULED', label: 'Scheduled', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  { value: 'PENDING', label: 'Pending', bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  { value: 'COMPLETED', label: 'Completed', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
];

const TIME_SLOTS = [
  '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
  '06:00 PM', '07:00 PM',
];

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-md border border-[#30363D] bg-[#161B22] px-2.5 py-1 text-xs text-gray-400 transition-colors hover:border-[#10B981]/50 hover:text-[#10B981]"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-[#10B981]" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

function FollowupDetailModal({ followup, onClose, onUpdate }: Props) {
  const [status, setStatus] = useState<FollowupStatus>(followup.status as FollowupStatus);
  const [rescheduleDate, setRescheduleDate] = useState(followup.scheduled_date);
  const [rescheduleTime, setRescheduleTime] = useState(followup.time_slot);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Conversation logging state
  const [showConvForm, setShowConvForm] = useState(false);
  const [notes, setNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<GenerateFollowupResult | null>(null);
  const [scheduleFollowup, setScheduleFollowup] = useState(true);

  // Past conversations for this client
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [expandedConvo, setExpandedConvo] = useState<string | null>(null);

  // Delete confirmation state
  const [deletingFollowup, setDeletingFollowup] = useState(false);
  const [confirmDeleteFollowup, setConfirmDeleteFollowup] = useState(false);
  const [convoToDelete, setConvoToDelete] = useState<Conversation | null>(null);
  const [deletingConvo, setDeletingConvo] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingConvos(true);
      const { data, error: err } = await supabase
        .from('conversations')
        .select('*, client:clients(*)')
        .eq('client_id', followup.client_id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (!cancelled) {
        if (err) console.error('Failed to load conversations:', err.message);
        setConversations((data as unknown as Conversation[]) ?? []);
        setLoadingConvos(false);
      }
    })();
    return () => { cancelled = true; };
  }, [followup.client_id]);

  // When status changes to Completed, default to not scheduling a follow-up
  useEffect(() => {
    if (status === 'COMPLETED') setScheduleFollowup(false);
  }, [status]);

  const hasRescheduleChanges =
    rescheduleDate !== followup.scheduled_date || rescheduleTime !== followup.time_slot;
  const hasStatusChange = status !== (followup.status as FollowupStatus);

  const handleSaveChanges = async () => {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const updates: Record<string, string> = { status };
      if (hasRescheduleChanges) {
        updates.scheduled_date = rescheduleDate;
        updates.time_slot = rescheduleTime;
      }
      const { error: err } = await supabase.from('followups').update(updates).eq('id', followup.id);
      if (err) throw err;
      setSuccessMsg(
        hasRescheduleChanges && hasStatusChange
          ? 'Status updated and follow-up rescheduled.'
          : hasRescheduleChanges
            ? 'Follow-up rescheduled successfully.'
            : 'Status updated successfully.'
      );
      onUpdate();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!notes.trim() || generating) return;
    setGenerating(true);
    setError(null);
    setGenResult(null);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-followup`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          notes: notes.trim(),
          clientName: followup.client?.name ?? 'the client',
          clientCode: followup.client?.client_code ?? '',
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Request failed (${res.status})`);
      }
      const data = (await res.json()) as GenerateFollowupResult;
      if (!data.summary || !data.whatsappMessage || !data.taskComment) {
        throw new Error('Received an incomplete response from the AI service.');
      }
      setGenResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate follow-up.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveConversation = async () => {
    if (!genResult) return;
    setSaving(true);
    setError(null);
    try {
      const { data: convo, error: convoErr } = await supabase
        .from('conversations')
        .insert({
          client_id: followup.client_id,
          notes: notes.trim(),
          ai_summary: genResult.summary,
          ai_actions: genResult.actions,
          whatsapp_message: genResult.whatsappMessage,
          task_comment: genResult.taskComment,
        })
        .select('id')
        .single();
      if (convoErr) throw convoErr;

      // Link this conversation to the original follow-up if it had none
      if (!followup.conversation_id) {
        await supabase
          .from('followups')
          .update({ conversation_id: convo.id })
          .eq('id', followup.id);
      }

      // Also create a new follow-up from the AI suggestion (unless user opted out)
      if (scheduleFollowup) {
        const { error: fuErr } = await supabase.from('followups').insert({
          conversation_id: convo.id,
          client_id: followup.client_id,
          scheduled_date: genResult.suggestedDate,
          time_slot: genResult.suggestedTime,
          description: genResult.actionList[0],
          status: 'SCHEDULED',
        });
        if (fuErr) throw fuErr;
      }

      // Refresh conversations list
      const { data: refreshed } = await supabase
        .from('conversations')
        .select('*, client:clients(*)')
        .eq('client_id', followup.client_id)
        .order('created_at', { ascending: false })
        .limit(20);
      setConversations((refreshed as unknown as Conversation[]) ?? []);

      setNotes('');
      setGenResult(null);
      setShowConvForm(false);
      setScheduleFollowup(true);
      setSuccessMsg(scheduleFollowup ? 'New conversation logged and follow-up scheduled.' : 'New conversation logged.');
      onUpdate();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save conversation.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFollowup = async () => {
    setDeletingFollowup(true);
    setError(null);
    try {
      const { error: err } = await supabase.from('followups').delete().eq('id', followup.id);
      if (err) throw err;
      onUpdate();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete follow-up.');
      setDeletingFollowup(false);
      setConfirmDeleteFollowup(false);
    }
  };

  const handleDeleteConversation = async () => {
    if (!convoToDelete) return;
    setDeletingConvo(true);
    setError(null);
    try {
      const { error: err } = await supabase.from('conversations').delete().eq('id', convoToDelete.id);
      if (err) throw err;
      setConversations((prev) => prev.filter((c) => c.id !== convoToDelete.id));
      if (expandedConvo === convoToDelete.id) setExpandedConvo(null);
      setConvoToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete conversation log.');
    } finally {
      setDeletingConvo(false);
    }
  };

  const clientName = followup.client?.name ?? 'Unknown Client';
  const clientCode = followup.client?.client_code ?? '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#30363D] bg-[#161B22] shadow-2xl [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-[#30363D]">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#30363D] bg-[#161B22] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#10B981]/10 text-sm font-bold text-[#10B981]">
              {clientName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">{clientName}</h2>
              <div className="flex items-center gap-2">
                <span className="rounded bg-[#30363D] px-1.5 py-0.5 font-mono text-[10px] text-gray-400">
                  {clientCode}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(followup.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  at {followup.time_slot}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setConfirmDeleteFollowup(true)}
              title="Delete follow-up"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#30363D] bg-[#0D1117] text-gray-400 transition-colors hover:border-red-500/50 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#30363D] bg-[#0D1117] text-gray-400 transition-colors hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-5 p-5">
          {/* Current follow-up description */}
          <div className="rounded-lg border border-[#30363D] bg-[#0D1117] p-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              Current Follow-up
            </p>
            <p className="text-sm text-gray-300">{followup.description}</p>
          </div>

          {/* Status section */}
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
              <Check className="h-4 w-4 text-[#10B981]" />
              Update Status
            </h3>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-all ${
                    status === opt.value
                      ? `${opt.bg} ${opt.text} ${opt.border} ring-1 ring-offset-0`
                      : 'border-[#30363D] bg-[#0D1117] text-gray-500 hover:border-gray-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reschedule section */}
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
              <Calendar className="h-4 w-4 text-[#10B981]" />
              Reschedule
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">Date</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full rounded-lg border border-[#30363D] bg-[#0D1117] px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-[#10B981]/50 focus:ring-1 focus:ring-[#10B981]/30 [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">Time</label>
                <select
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full rounded-lg border border-[#30363D] bg-[#0D1117] px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-[#10B981]/50 focus:ring-1 focus:ring-[#10B981]/30"
                >
                  {TIME_SLOTS.map((t) => (
                    <option key={t} value={t} className="bg-[#0D1117]">
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Save changes button */}
          {(hasStatusChange || hasRescheduleChanges) && (
            <button
              onClick={handleSaveChanges}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#10B981] to-[#00E699] py-2.5 text-sm font-semibold text-[#0D1117] transition-all hover:shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save Changes
            </button>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">
              <Check className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-[#30363D]" />

          {/* Log new conversation section */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                <MessageCircle className="h-4 w-4 text-[#25D366]" />
                Log New Conversation
              </h3>
              <button
                onClick={() => {
                  setShowConvForm(!showConvForm);
                  setGenResult(null);
                  setNotes('');
                }}
                className="flex items-center gap-1.5 rounded-lg border border-[#30363D] bg-[#0D1117] px-3 py-1.5 text-xs text-gray-400 transition-colors hover:border-[#10B981]/50 hover:text-[#10B981]"
              >
                {showConvForm ? 'Cancel' : '+ New Log'}
              </button>
            </div>

            {showConvForm && (
              <div className="space-y-3 rounded-lg border border-[#30363D] bg-[#0D1117] p-4">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <UserIcon className="h-3.5 w-3.5" />
                  Logging conversation for <span className="font-medium text-gray-300">{clientName}</span>
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="What did you talk about in this conversation?"
                  className="w-full resize-none rounded-lg border border-[#30363D] bg-[#161B22] px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-[#10B981]/50 focus:ring-1 focus:ring-[#10B981]/30"
                />
                {!genResult ? (
                  <button
                    onClick={handleGenerate}
                    disabled={!notes.trim() || generating}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#10B981] to-[#00E699] py-2.5 text-sm font-bold text-[#0D1117] transition-all hover:shadow-lg hover:shadow-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {generating ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                    ) : (
                      <><Sparkles className="h-4 w-4" /> Generate Follow-Up</>
                    )}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#10B981]">
                        AI Summary
                      </p>
                      <p className="rounded-lg border border-[#30363D] bg-[#161B22] p-2.5 text-xs text-gray-300">
                        {genResult.summary}
                      </p>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#25D366]">
                          WhatsApp Message
                        </p>
                        <CopyButton text={genResult.whatsappMessage} label="Copy" />
                      </div>
                      <pre className="whitespace-pre-wrap rounded-lg border border-[#25D366]/20 bg-[#25D366]/5 p-2.5 text-xs text-gray-200">
                        {genResult.whatsappMessage}
                      </pre>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#10B981]">
                          Task Manager Comment
                        </p>
                        <CopyButton text={genResult.taskComment} label="Copy" />
                      </div>
                      <pre className="whitespace-pre-wrap rounded-lg border border-[#10B981]/20 bg-[#10B981]/5 p-2.5 text-xs text-gray-200">
                        {genResult.taskComment}
                      </pre>
                    </div>
                    <label className="flex items-center gap-3 rounded-lg border border-[#30363D] bg-[#161B22] p-2.5 text-xs text-gray-400 cursor-pointer">
                      <button
                        type="button"
                        onClick={() => setScheduleFollowup(!scheduleFollowup)}
                        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${scheduleFollowup ? 'bg-[#10B981]' : 'bg-[#30363D]'}`}
                      >
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${scheduleFollowup ? 'left-4' : 'left-0.5'}`} />
                      </button>
                      <span>
                        {scheduleFollowup
                          ? <>Follow-up will be scheduled for <span className="font-medium text-gray-200">{new Date(genResult.suggestedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {genResult.suggestedTime}</span></>
                          : 'No follow-up will be scheduled — conversation will be saved only.'}
                      </span>
                    </label>
                    <button
                      onClick={handleSaveConversation}
                      disabled={saving}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#10B981] to-[#00E699] py-2.5 text-sm font-semibold text-[#0D1117] transition-all hover:shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      {scheduleFollowup ? 'Save & Schedule New Follow-up' : 'Save Conversation'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-[#30363D]" />

          {/* Conversation history for this client */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
              <History className="h-4 w-4 text-[#10B981]" />
              Conversation History — {clientName}
            </h3>
            {loadingConvos ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg border border-[#30363D] bg-[#0D1117]" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[#30363D] py-6 text-center text-sm text-gray-500">
                No previous conversations for this client.
              </p>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-[#30363D]">
                {conversations.map((c) => {
                  const isExpanded = expandedConvo === c.id;
                  return (
                    <div
                      key={c.id}
                      className="rounded-lg border border-[#30363D] bg-[#0D1117] transition-colors hover:border-gray-600"
                    >
                      <div className="flex items-center gap-1 p-2.5">
                        <button
                          onClick={() => setExpandedConvo(isExpanded ? null : c.id)}
                          className="flex flex-1 items-center gap-2 text-left"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500">
                              {new Date(c.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                            <p className="mt-0.5 truncate text-sm text-gray-300">
                              {c.notes.slice(0, 70)}
                              {c.notes.length > 70 ? '...' : ''}
                            </p>
                          </div>
                          <ChevronRight
                            className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${
                              isExpanded ? 'rotate-90' : ''
                            }`}
                          />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConvoToDelete(c);
                          }}
                          title="Delete log"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="space-y-2 border-t border-[#30363D] p-2.5">
                          <div>
                            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                              Notes
                            </p>
                            <p className="text-xs text-gray-300 whitespace-pre-wrap">{c.notes}</p>
                          </div>
                          {c.ai_summary && (
                            <div>
                              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#10B981]">
                                AI Summary
                              </p>
                              <p className="text-xs text-gray-300">{c.ai_summary}</p>
                            </div>
                          )}
                          {c.whatsapp_message && (
                            <div>
                              <div className="mb-0.5 flex items-center justify-between">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#25D366]">
                                  WhatsApp Message
                                </p>
                                <CopyButton text={c.whatsapp_message} label="Copy" />
                              </div>
                              <pre className="whitespace-pre-wrap rounded border border-[#25D366]/20 bg-[#25D366]/5 p-2 text-[11px] text-gray-200">
                                {c.whatsapp_message}
                              </pre>
                            </div>
                          )}
                          {c.task_comment && (
                            <div>
                              <div className="mb-0.5 flex items-center justify-between">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#10B981]">
                                  Task Comment
                                </p>
                                <CopyButton text={c.task_comment} label="Copy" />
                              </div>
                              <pre className="whitespace-pre-wrap rounded border border-[#10B981]/20 bg-[#10B981]/5 p-2 text-[11px] text-gray-200">
                                {c.task_comment}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {confirmDeleteFollowup && (
        <ConfirmDialog
          title="Delete Follow-up"
          message={`Are you sure you want to delete this scheduled follow-up for ${clientName}? This cannot be undone.`}
          confirmLabel="Delete"
          busy={deletingFollowup}
          onConfirm={handleDeleteFollowup}
          onCancel={() => setConfirmDeleteFollowup(false)}
        />
      )}

      {convoToDelete && (
        <ConfirmDialog
          title="Delete Conversation Log"
          message="Are you sure you want to delete this logged conversation? This cannot be undone."
          confirmLabel="Delete"
          busy={deletingConvo}
          onConfirm={handleDeleteConversation}
          onCancel={() => setConvoToDelete(null)}
        />
      )}
    </div>
  );
}

export default FollowupDetailModal;
