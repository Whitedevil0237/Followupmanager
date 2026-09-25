import { useState } from 'react';
import { CalendarPlus, Loader2, AlertCircle, Check, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Props = {
  onSaved: () => void;
};

const TIME_SLOTS = [
  '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
  '06:00 PM', '07:00 PM',
];

function ScheduleMeetingForm({ onSaved }: Props) {
  const [clientCode, setClientCode] = useState('');
  const [clientName, setClientName] = useState('');
  const [meetingDate, setMeetingDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [meetingTime, setMeetingTime] = useState('10:00 AM');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const canSave = clientCode.trim() && clientName.trim() && meetingDate && meetingTime && !loading;

  const handleSave = async () => {
    if (!canSave) return;
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

      // Insert follow-up directly — no conversation needed
      const { error: fuErr } = await supabase.from('followups').insert({
        conversation_id: null,
        client_id: clientId,
        scheduled_date: meetingDate,
        time_slot: meetingTime,
        description:
          description.trim() || `Meeting with ${clientName.trim()}`,
        status: 'SCHEDULED',
      });
      if (fuErr) throw fuErr;

      setSaved(true);
      setClientCode('');
      setClientName('');
      setDescription('');
      onSaved();
       } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Failed to schedule meeting.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSaved(false);
    setError(null);
  };

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
          <Check className="h-6 w-6 text-[#10B981]" />
        </div>
        <p className="text-sm font-medium text-white">Meeting scheduled!</p>
        <p className="mt-1 text-xs text-gray-500">
          The meeting appears on your calendar. Log the conversation after it happens.
        </p>
        <button
          onClick={handleReset}
          className="mt-4 rounded-lg border border-[#30363D] bg-[#0D1117] px-4 py-2 text-sm text-gray-300 transition-colors hover:border-[#10B981]/50 hover:text-[#10B981]"
        >
          Schedule Another
        </button>
      </div>
    );
  }

  return (
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-400">
            Meeting Date <span className="text-[#10B981]">*</span>
          </label>
          <input
            type="date"
            value={meetingDate}
            onChange={(e) => setMeetingDate(e.target.value)}
            className="w-full rounded-lg border border-[#30363D] bg-[#0D1117] px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-[#10B981]/50 focus:ring-1 focus:ring-[#10B981]/30 [color-scheme:dark]"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-400">
            Time Slot <span className="text-[#10B981]">*</span>
          </label>
          <select
            value={meetingTime}
            onChange={(e) => setMeetingTime(e.target.value)}
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

      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-400">
          Description <span className="text-gray-600">(optional)</span>
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Quarterly review, product demo, etc."
          className="w-full rounded-lg border border-[#30363D] bg-[#0D1117] px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-[#10B981]/50 focus:ring-1 focus:ring-[#10B981]/30"
        />
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-[#30363D] bg-[#0D1117] p-3 text-xs text-gray-500">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
        <span>
          This schedules a meeting without a conversation. After the meeting, open it
          from the follow-ups list and log the conversation there.
        </span>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={!canSave}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#10B981] to-[#00E699] py-3 text-sm font-bold text-[#0D1117] transition-all hover:shadow-lg hover:shadow-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Scheduling...</>
        ) : (
          <><CalendarPlus className="h-4 w-4" /> Schedule Meeting</>
        )}
      </button>
    </div>
  );
}

export default ScheduleMeetingForm;
