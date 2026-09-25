import { useEffect, useState } from 'react';
import { MessageSquarePlus, CalendarPlus, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import DateCarousel from '@/components/DateCarousel';
import FollowupList from '@/components/FollowupList';
import ConversationForm from '@/components/ConversationForm';
import ScheduleMeetingForm from '@/components/ScheduleMeetingForm';
import ClientHistory from '@/components/ClientHistory';
import AuthScreen from '@/components/AuthScreen';
import { useAuth } from '@/context/AuthContext';
import { supabase, type Followup } from '@/lib/supabase';

type Tab = 'conversation' | 'schedule';

function App() {
  const { user, loading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [loadingFollowups, setLoadingFollowups] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>('conversation');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingFollowups(true);
      const { data, error } = await supabase
        .from('followups')
        .select('*, client:clients(*)')
        .eq('scheduled_date', selectedDate)
        .order('time_slot', { ascending: true });
      if (!cancelled) {
        if (error) {
          console.error('Failed to load followups:', error.message);
        }
        setFollowups((data as unknown as Followup[]) ?? []);
        setLoadingFollowups(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedDate, refreshKey]);

  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0D1117]">
        <Loader2 className="h-8 w-8 animate-spin text-[#10B981]" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-[#0D1117] text-gray-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Header />
        <DateCarousel selectedDate={selectedDate} onSelect={setSelectedDate} />
        <main className="grid grid-cols-1 gap-6 pb-12 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <FollowupList
              followups={followups}
              loading={loadingFollowups}
              selectedDate={selectedDate}
              onUpdate={triggerRefresh}
            />
            <ClientHistory />
          </div>
          <div className="lg:col-span-1">
            <section className="sticky top-4 rounded-2xl border border-[#30363D] bg-[#161B22] p-5">
              {/* Tab header */}
              <div className="mb-4 flex gap-1 rounded-lg border border-[#30363D] bg-[#0D1117] p-1">
                <button
                  onClick={() => setActiveTab('conversation')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-all ${
                    activeTab === 'conversation'
                      ? 'bg-[#10B981]/10 text-[#10B981]'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <MessageSquarePlus className="h-4 w-4" />
                  New Conversation
                </button>
                <button
                  onClick={() => setActiveTab('schedule')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-all ${
                    activeTab === 'schedule'
                      ? 'bg-[#10B981]/10 text-[#10B981]'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <CalendarPlus className="h-4 w-4" />
                  Schedule Meeting
                </button>
              </div>

              {activeTab === 'conversation' ? (
                <ConversationForm onSaved={triggerRefresh} />
              ) : (
                <ScheduleMeetingForm onSaved={triggerRefresh} />
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
