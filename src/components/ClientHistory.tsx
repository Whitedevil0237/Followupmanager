import { useEffect, useState } from 'react';
import { Search, History, MessageSquare, ChevronRight, MessageCircle, ListChecks, Copy, Check, Trash2 } from 'lucide-react';
import { supabase, type Conversation } from '@/lib/supabase';
import ConfirmDialog from '@/components/ConfirmDialog';

function ClientHistory() {
  const [query, setQuery] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleCopy = async (text: string, fieldKey: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // clipboard not available
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('conversations').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setConversations((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      if (expandedId === deleteTarget.id) setExpandedId(null);
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete conversation:', err instanceof Error ? err.message : err);
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase
        .from('conversations')
        .select('*, client:clients(*)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (query.trim()) {
        const like = `%${query.trim()}%`;
        q = q.or(`notes.ilike.${like},ai_summary.ilike.${like}`);
      }
      const { data, error } = await q;
      if (!cancelled) {
        if (error) console.error('History load error:', error.message);
        setConversations((data as unknown as Conversation[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <>
    <section className="rounded-2xl border border-[#30363D] bg-[#161B22] p-5">
      <div className="mb-4 flex items-center gap-2">
        <History className="h-5 w-5 text-[#10B981]" />
        <h2 className="text-base font-semibold text-white">Client History</h2>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by client name or conversation content..."
          className="w-full rounded-lg border border-[#30363D] bg-[#0D1117] py-2.5 pl-10 pr-3 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-[#10B981]/50 focus:ring-1 focus:ring-[#10B981]/30"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl border border-[#30363D] bg-[#0D1117]"
            />
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#30363D] py-10 text-center">
          <MessageSquare className="mb-3 h-8 w-8 text-gray-600" />
          <p className="text-sm text-gray-500">
            {query.trim() ? 'No conversations match your search.' : 'No conversations logged yet.'}
          </p>
        </div>
      ) : (
        <div className="max-h-[400px] space-y-2 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-[#30363D]">
          {conversations.map((c) => {
            const isExpanded = expandedId === c.id;
            return (
              <div
                key={c.id}
                className="rounded-xl border border-[#30363D] bg-[#0D1117] transition-colors hover:border-gray-600"
              >
                <div className="flex w-full items-center gap-3 p-3">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                    className="flex flex-1 min-w-0 items-center gap-3 text-left"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#10B981]/10 text-sm font-bold text-[#10B981]">
                      {(c.client?.name ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-white">
                          {c.client?.name ?? 'Unknown Client'}
                        </span>
                        <span className="shrink-0 rounded bg-[#30363D] px-1.5 py-0.5 font-mono text-[10px] text-gray-400">
                          {c.client?.client_code ?? '—'}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {new Date(c.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' '}
                        · {c.notes.slice(0, 60)}
                        {c.notes.length > 60 ? '...' : ''}
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
                      setDeleteTarget(c);
                    }}
                    title="Delete log"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {isExpanded && (
                  <div className="space-y-3 border-t border-[#30363D] p-3">
                    <div>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                        Notes
                      </p>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{c.notes}</p>
                    </div>
                    {c.ai_summary && (
                      <div>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#10B981]">
                          AI Summary
                        </p>
                        <p className="text-sm text-gray-300">{c.ai_summary}</p>
                      </div>
                    )}
                    {c.whatsapp_message && (
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#25D366]">
                            <span className="inline-flex items-center gap-1">
                              <MessageCircle className="h-3 w-3" /> WhatsApp Message
                            </span>
                          </p>
                          <button
                            onClick={() => handleCopy(c.whatsapp_message!, `wa-${c.id}`)}
                            className="flex items-center gap-1 rounded-md border border-[#30363D] bg-[#161B22] px-2 py-0.5 text-[10px] text-gray-400 transition-colors hover:text-[#25D366]"
                          >
                            {copiedField === `wa-${c.id}` ? (
                              <><Check className="h-3 w-3" /> Copied</>
                            ) : (
                              <><Copy className="h-3 w-3" /> Copy</>
                            )}
                          </button>
                        </div>
                        <pre className="whitespace-pre-wrap rounded-lg border border-[#25D366]/20 bg-[#25D366]/5 p-2.5 text-xs text-gray-200">
                          {c.whatsapp_message}
                        </pre>
                      </div>
                    )}
                    {c.task_comment && (
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#10B981]">
                            <span className="inline-flex items-center gap-1">
                              <ListChecks className="h-3 w-3" /> Task Manager Comment
                            </span>
                          </p>
                          <button
                            onClick={() => handleCopy(c.task_comment!, `task-${c.id}`)}
                            className="flex items-center gap-1 rounded-md border border-[#30363D] bg-[#161B22] px-2 py-0.5 text-[10px] text-gray-400 transition-colors hover:text-[#10B981]"
                          >
                            {copiedField === `task-${c.id}` ? (
                              <><Check className="h-3 w-3" /> Copied</>
                            ) : (
                              <><Copy className="h-3 w-3" /> Copy</>
                            )}
                          </button>
                        </div>
                        <pre className="whitespace-pre-wrap rounded-lg border border-[#10B981]/20 bg-[#10B981]/5 p-2.5 text-xs text-gray-200">
                          {c.task_comment}
                        </pre>
                      </div>
                    )}
                    {c.ai_actions && (
                      <div>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#10B981]">
                          Suggested Actions
                        </p>
                        <ul className="space-y-1">
                          {c.ai_actions.split('\n').map((a, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-sm text-gray-300"
                            >
                              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[#10B981]" />
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>

    {deleteTarget && (
      <ConfirmDialog
        title="Delete Conversation Log"
        message={`Delete this logged conversation with ${deleteTarget.client?.name ?? 'this client'}? This cannot be undone.`}
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    )}
    </>
  );
}

export default ClientHistory;
