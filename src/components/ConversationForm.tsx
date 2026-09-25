import { useState } from 'react';
import {
  Sparkles,
  Loader2,
  MessageSquarePlus,
  AlertCircle,
  Copy,
  Check,
  MessageCircle,
  ListChecks,
} from 'lucide-react';
import { supabase, type GenerateFollowupResult } from '@/lib/supabase';

type Props = {
  onSaved: () => void;
};

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

function ConversationForm({ onSaved }: Props) {
  const [clientCode, setClientCode] = useState('');
  const [clientName, setClientName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateFollowupResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [scheduleFollowup, setScheduleFollowup] = useState(true);

  const canGenerate = clientCode.trim() && clientName.trim() && notes.trim() && !loading;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);

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
          clientName: clientName.trim(),
          clientCode: clientCode.trim(),
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Request failed (${res.status})`);
      }
      const data = (await res.json()) as GenerateFollowupResult;
      if (!data.summary || !data.actionList || !data.whatsappMessage || !data.taskComment) {
        throw new Error('Received an incomplete response from the AI service.');
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate follow-up.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setLoading(true);
    setError(null);
    try {
      // Upsert client by code
      const { data: existingClient, error: clientErr } = await supabase
        .from('clients')
        .select('id')
        .eq('client_code', clientCode.trim())
        .maybeSingle();

      if (clientErr) throw clientErr;

      let clientId = existingClient?.id;

      if (!clientId) {
        const { data: newClient, error: insertErr } = await supabase
          .from('clients')
          .insert({ client_code: clientCode.trim(), name: clientName.trim() })
          .select('id')
          .single();
        if (insertErr) throw insertErr;
        clientId = newClient.id;
      } else {
        await supabase
          .from('clients')
          .update({ name: clientName.trim() })
          .eq('id', clientId);
      }

      // Insert conversation with WhatsApp message and task comment
      const { data: convo, error: convoErr } = await supabase
        .from('conversations')
        .insert({
          client_id: clientId,
          notes: notes.trim(),
          ai_summary: result.summary,
          ai_actions: result.actions,
          whatsapp_message: result.whatsappMessage,
          task_comment: result.taskComment,
        })
        .select('id')
        .single();
      if (convoErr) throw convoErr;

      if (scheduleFollowup) {
        const { error: fuErr } = await supabase.from('followups').insert({
          conversation_id: convo.id,
          client_id: clientId,
          scheduled_date: result.suggestedDate,
          time_slot: result.suggestedTime,
          description: result.actionList[0],
          status: 'SCHEDULED',
        });
        if (fuErr) throw fuErr;
      }

      setSaved(true);
      setClientCode('');
      setClientName('');
      setNotes('');
      setResult(null);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save conversation.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setSaved(false);
    setError(null);
  };

  return (
    <div>
      {saved ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
            <Sparkles className="h-6 w-6 text-[#10B981]" />
          </div>
          <p className="text-sm font-medium text-white">Conversation saved!</p>
          <p className="mt-1 text-xs text-gray-500">
            A follow-up has been scheduled and added to your calendar.
          </p>
          <button
            onClick={handleReset}
            className="mt-4 rounded-lg border border-[#30363D] bg-[#0D1117] px-4 py-2 text-sm text-gray-300 transition-colors hover:border-[#10B981]/50 hover:text-[#10B981]"
          >
            Log Another
          </button>
        </div>
      ) : result ? (
        <div className="max-h-[calc(100vh-8rem)] space-y-4 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-[#30363D]">
          {/* AI Summary */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#10B981]" />
              <h3 className="text-sm font-semibold text-white">AI Summary</h3>
            </div>
            <p className="rounded-lg border border-[#30363D] bg-[#0D1117] p-3 text-sm text-gray-300">
              {result.summary}
            </p>
          </div>

          {/* WhatsApp Message */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-[#25D366]" />
                <h3 className="text-sm font-semibold text-white">WhatsApp Message</h3>
              </div>
              <CopyButton text={result.whatsappMessage} label="Copy" />
            </div>
            <pre className="whitespace-pre-wrap rounded-lg border border-[#25D366]/20 bg-[#25D366]/5 p-3 text-sm text-gray-200">
              {result.whatsappMessage}
            </pre>
          </div>

          {/* Task Manager Comment */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-[#10B981]" />
                <h3 className="text-sm font-semibold text-white">Task Manager Comment</h3>
              </div>
              <CopyButton text={result.taskComment} label="Copy" />
            </div>
            <pre className="whitespace-pre-wrap rounded-lg border border-[#10B981]/20 bg-[#10B981]/5 p-3 text-sm text-gray-200">
              {result.taskComment}
            </pre>
          </div>

          {/* Suggested follow-up date */}
          <label className="flex items-center gap-3 rounded-lg border border-[#30363D] bg-[#0D1117] p-3 text-xs text-gray-400 cursor-pointer">
            <button
              type="button"
              onClick={() => setScheduleFollowup(!scheduleFollowup)}
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${scheduleFollowup ? 'bg-[#10B981]' : 'bg-[#30363D]'}`}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${scheduleFollowup ? 'left-4' : 'left-0.5'}`} />
            </button>
            <span>
              {scheduleFollowup ? (
                <>Follow-up will be scheduled for <span className="font-medium text-gray-200">{new Date(result.suggestedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {result.suggestedTime}</span></>
              ) : (
                'No follow-up will be scheduled — conversation will be saved only.'
              )}
            </span>
          </label>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#10B981] to-[#00E699] py-2.5 text-sm font-semibold text-[#0D1117] transition-all hover:shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Save & Schedule
            </button>
            <button
              onClick={handleReset}
              disabled={loading}
              className="rounded-lg border border-[#30363D] bg-[#0D1117] px-4 py-2.5 text-sm text-gray-400 transition-colors hover:text-gray-200 disabled:opacity-50"
            >
              Discard
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">
                Client ID <span className="text-[#10B981]">*</span>
              </label>
              <input
                type="text"
                value={clientCode}
                onChange={(e) => setClientCode(e.target.value)}
                placeholder="e.g. CLI-0042"
                className="w-full rounded-lg border border-[#30363D] bg-[#0D1117] px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-[#10B981]/50 focus:ring-1 focus:ring-[#10B981]/30"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">
                Client Name <span className="text-[#10B981]">*</span>
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Acme Corporation"
                className="w-full rounded-lg border border-[#30363D] bg-[#0D1117] px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-[#10B981]/50 focus:ring-1 focus:ring-[#10B981]/30"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">
              What We Talked About <span className="text-[#10B981]">*</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
              placeholder="Describe the conversation in detail — topics discussed, client concerns, next steps mentioned, deadlines, etc."
              className="w-full resize-none rounded-lg border border-[#30363D] bg-[#0D1117] px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-[#10B981]/50 focus:ring-1 focus:ring-[#10B981]/30"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#10B981] to-[#00E699] py-3 text-sm font-bold text-[#0D1117] transition-all hover:shadow-lg hover:shadow-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Follow-Up
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default ConversationForm;
