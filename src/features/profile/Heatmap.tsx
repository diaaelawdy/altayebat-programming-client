import { memo, useMemo } from 'react';
import { useI18n } from '@/i18n';

/** GitHub-style activity grid for the last 53 weeks. Shown only to the owner. */
export const Heatmap = memo(function Heatmap({ days }: { days: { day: string; count: number }[] }) {
  const { t, fmt } = useI18n();
  const { weeks, max } = useMemo(() => {
    const map = new Map(days.map((d) => [d.day, d.count]));
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 7 * 52 - start.getDay());
    const cols: { day: string; count: number }[][] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      if (d.getDay() === 0) cols.push([]);
      cols[cols.length - 1]!.push({ day: key, count: map.get(key) ?? 0 });
    }
    return { weeks: cols, max: Math.max(1, ...days.map((d) => d.count)) };
  }, [days]);
  const level = (c: number) => (c === 0 ? 0 : Math.ceil((c / max) * 4));
  const bg = [
    'var(--surface-3)',
    'color-mix(in oklab, var(--accent) 30%, var(--surface-3))',
    'color-mix(in oklab, var(--accent) 55%, var(--surface-3))',
    'color-mix(in oklab, var(--accent) 78%, var(--surface-3))',
    'var(--accent)',
  ];
  return (
    <div>
      <div className="overflow-x-auto pb-2" dir="ltr">
        <div className="flex gap-[3px]">
          {weeks.map((w, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              {w.map((d) => (
                <span
                  key={d.day}
                  title={t('profile.activityCount', { n: d.count, d: fmt.date(d.day) })}
                  className="h-[11px] w-[11px] rounded-[3px]"
                  style={{ background: bg[level(d.count)] }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="text-subtle mt-2 flex items-center justify-end gap-1 text-[11px]">
        {t('profile.less')}
        {bg.map((b) => (
          <span key={b} className="h-[10px] w-[10px] rounded-[3px]" style={{ background: b }} />
        ))}
        {t('profile.more')}
      </div>
    </div>
  );
});
