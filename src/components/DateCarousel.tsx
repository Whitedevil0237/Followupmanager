import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  selectedDate: string;
  onSelect: (date: string) => void;
};

const DAY_RANGE = 14;

function DateCarousel({ selectedDate, onSelect }: Props) {
  const days = useMemo(() => {
    const result: { date: string; day: Date }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - 3);
    for (let i = 0; i < DAY_RANGE; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      result.push({ date: d.toISOString().split('T')[0], day: d });
    }
    return result;
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  const scrollBy = (dir: number) => {
    const container = document.getElementById('date-carousel-scroll');
    if (container) container.scrollBy({ left: dir * 220, behavior: 'smooth' });
  };

  return (
    <div className="flex items-center gap-3 py-5">
      <button
        onClick={() => scrollBy(-1)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#30363D] bg-[#161B22] text-gray-400 transition-colors hover:border-[#10B981]/50 hover:text-[#10B981]"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div
        id="date-carousel-scroll"
        className="flex flex-1 gap-2 overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        {days.map(({ date, day }) => {
          const isSelected = date === selectedDate;
          const isToday = date === todayStr;
          const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
          const dayNum = day.getDate();
          const monthLabel = day.toLocaleDateString('en-US', { month: 'short' });
          return (
            <button
              key={date}
              onClick={() => onSelect(date)}
              className={`group flex min-w-[80px] flex-col items-center gap-0.5 rounded-xl border px-3 py-2.5 transition-all ${
                isSelected
                  ? 'border-[#10B981] bg-[#10B981]/10 shadow-lg shadow-emerald-500/10'
                  : 'border-[#30363D] bg-[#161B22] hover:border-gray-600'
              }`}
            >
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider ${
                  isSelected ? 'text-[#10B981]' : 'text-gray-500'
                }`}
              >
                {dayName}
              </span>
              <span
                className={`text-xl font-bold ${
                  isSelected ? 'text-white' : 'text-gray-300'
                }`}
              >
                {dayNum}
              </span>
              <span
                className={`text-[10px] ${
                  isSelected ? 'text-[#10B981]' : 'text-gray-600'
                }`}
              >
                {monthLabel}
              </span>
              {isToday && (
                <span
                  className={`mt-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ${
                    isSelected
                      ? 'bg-[#10B981] text-[#0D1117]'
                      : 'bg-[#30363D] text-gray-400'
                  }`}
                >
                  Today
                </span>
              )}
            </button>
          );
        })}
      </div>
      <button
        onClick={() => scrollBy(1)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#30363D] bg-[#161B22] text-gray-400 transition-colors hover:border-[#10B981]/50 hover:text-[#10B981]"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

export default DateCarousel;
