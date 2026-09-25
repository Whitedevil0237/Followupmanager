import { useState } from 'react';
import { Calendar, Clock, User as UserIcon, ChevronRight, MessageSquare, Trash2 } from 'lucide-react';
import { supabase, type Followup, type FollowupStatus } from '@/lib/supabase';
import FollowupDetailModal from '@/components/FollowupDetailModal';
import ConfirmDialog from '@/components/ConfirmDialog';

type Props = {
  followups: Followup[];
  loading: boolean;
  selectedDate: string;
  onUpdate: () => void;
};

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  SCHEDULED: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    label: 'Scheduled',
  },
  PENDING: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
    label: 'Pending',
  },
  COMPLETED: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    label: 'Completed',
  },
};

function FollowupList({ followups, loading, selectedDate, onUpdate }: Props) {
  const [activeFollowup, setActiveFollowup] = useState<Followup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Followup | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('followups').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setDeleteTarget(null);
      onUpdate();
    } catch (err) {
      console.error('Failed to delete follow-up:', err instanceof Error ? err.message : err);
    } finally {
      setDeleting(false);
    }
  };

  const formattedDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <section className="rounded-2xl border border-[#30363D] bg-[#161B22] p-5">
        <div className="mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-[#10B981]" />
          <h2 className="text-base font-semibold text-white">Scheduled Follow-ups</h2>
          <span className="ml-auto rounded-full bg-[#0D1117] px-2.5 py-0.5 text-xs text-gray-400">
            {followups.length} {followups.length === 1 ? 'item' : 'items'}
          </span>
        </div>
        <p className="mb-4 text-sm text-gray-500">{formattedDate}</p>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl border border-[#30363D] bg-[#0D1117]"
              />
            ))}
          </div>
        ) : followups.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#30363D] py-12 text-center">
            <Calendar className="mb-3 h-8 w-8 text-gray-600" />
            <p className="text-sm text-gray-500">No follow-ups scheduled for this date.</p>
            <p className="mt-1 text-xs text-gray-600">
              Log a new client conversation to generate one.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {followups.map((f) => {
              const style = STATUS_STYLES[f.status] ?? STATUS_STYLES.SCHEDULED;
              return (
                <div
                  key={f.id}
                  className="group flex w-full items-start gap-2 rounded-xl border border-[#30363D] bg-[#0D1117] p-4 transition-all hover:border-[#10B981]/40 hover:bg-[#10B981]/[0.03]"
                >
                  <button
                    onClick={() => setActiveFollowup(f)}
                    className="flex flex-1 items-start gap-4 text-left"
                  >
                    <div className="flex flex-col items-center gap-1 pt-0.5">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-xs font-medium text-gray-300">{f.time_slot}</span>
                    </div>
                    <div className="flex-1 border-l border-[#30363D] pl-4">
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-gray-500" />
                        <span className="font-semibold text-white">
                          {f.client?.name ?? 'Unknown Client'}
                        </span>
                        <span className="rounded bg-[#30363D] px-1.5 py-0.5 font-mono text-[10px] text-gray-400">
                          {f.client?.client_code ?? '—'}
                        </span>
                        {!f.conversation_id && (
                          <span className="flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-orange-400">
                            <MessageSquare className="h-2.5 w-2.5" />
                            No Log
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm text-gray-400">{f.description}</p>
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-2 pt-0.5">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${style.bg} ${style.text} ${style.border}`}
                    >
                      {style.label}
                    </span>
                    <button
                      onClick={() => setDeleteTarget(f)}
                      title="Delete follow-up"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => setActiveFollowup(f)}>
                      <ChevronRight className="h-4 w-4 text-gray-600 transition-colors group-hover:text-[#10B981]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {activeFollowup && (
        <FollowupDetailModal
          followup={activeFollowup}
          onClose={() => setActiveFollowup(null)}
          onUpdate={onUpdate}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Follow-up"
          message={`Delete the scheduled follow-up for ${deleteTarget.client?.name ?? 'this client'}? This cannot be undone.`}
          confirmLabel="Delete"
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}

export default FollowupList;
