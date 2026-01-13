import { useMemo, useState } from 'react';
import { HeadChannel, SubChannelMark } from '@/types';
import { formatTimeShort, getElapsedMs } from '@/hooks/useStopwatch';
import { Copy, Check } from 'lucide-react';

interface TimelineChartProps {
  headChannel: HeadChannel;
}

interface TimelineInterval {
  startMs: number;
  endMs: number;
}

// Calculate running intervals from marks
function calculateIntervals(marks: SubChannelMark[], currentlyRunning: boolean, headElapsedMs: number): TimelineInterval[] {
  const intervals: TimelineInterval[] = [];
  let startMs: number | null = null;

  for (const mark of marks) {
    if (mark.action === 'start') {
      startMs = mark.headTimeMs;
    } else if (mark.action === 'pause' && startMs !== null) {
      intervals.push({ startMs, endMs: mark.headTimeMs });
      startMs = null;
    }
  }

  // If currently running, add interval from last start to current head time
  if (currentlyRunning && startMs !== null) {
    intervals.push({ startMs, endMs: headElapsedMs });
  }

  return intervals;
}

export function TimelineChart({ headChannel }: TimelineChartProps) {
  const [copied, setCopied] = useState(false);

  const headElapsedMs = getElapsedMs(headChannel);

  // Minimum timeline duration (at least 1 minute for visibility)
  const timelineDuration = Math.max(headElapsedMs, 60000);

  // Calculate intervals for each sub channel
  const subChannelData = useMemo(() => {
    return headChannel.subChannels.map(sub => ({
      sub,
      intervals: calculateIntervals(sub.marks, sub.running, headElapsedMs),
      elapsed: getElapsedMs(sub),
    }));
  }, [headChannel.subChannels, headElapsedMs]);

  // Generate time markers
  const timeMarkers = useMemo(() => {
    const markers: number[] = [];
    const step = timelineDuration > 300000 ? 60000 : timelineDuration > 60000 ? 30000 : 10000; // 1min, 30s, or 10s steps
    for (let i = 0; i <= timelineDuration; i += step) {
      markers.push(i);
    }
    return markers;
  }, [timelineDuration]);

  const handleCopy = async () => {
    const lines: string[] = [];
    lines.push(`📌 ${headChannel.name}: ${formatTimeShort(headElapsedMs)}`);
    lines.push('');

    subChannelData.forEach(({ sub, intervals, elapsed }) => {
      lines.push(`└─ ${sub.name}: ${formatTimeShort(elapsed)}`);
      if (intervals.length > 0) {
        intervals.forEach((interval, idx) => {
          lines.push(`   ${idx + 1}. ${formatTimeShort(interval.startMs)} → ${formatTimeShort(interval.endMs)}`);
        });
      }
    });

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (headChannel.subChannels.length === 0) {
    return null;
  }

  return (
    <div
      className="bg-muted/30 rounded-lg p-3 mt-2 cursor-pointer hover:bg-muted/50 transition-colors relative group"
      onClick={handleCopy}
    >
      {/* Copy indicator */}
      <div className={`absolute top-2 right-2 flex items-center gap-1 text-xs font-medium transition-opacity ${copied ? 'opacity-100 text-green-500' : 'opacity-0 group-hover:opacity-100 text-muted-foreground'}`}>
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5" />
            <span>Copied!</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            <span>Click to copy</span>
          </>
        )}
      </div>

      <div className="text-xs font-medium text-muted-foreground mb-2">Timeline Visual</div>

      {/* Timeline container */}
      <div className="relative">
        {/* Time markers */}
        <div className="flex justify-between text-[9px] text-muted-foreground mb-1 px-1">
          {timeMarkers.map((ms, idx) => (
            <span key={idx} style={{ position: 'absolute', left: `${(ms / timelineDuration) * 100}%`, transform: 'translateX(-50%)' }}>
              {formatTimeShort(ms)}
            </span>
          ))}
        </div>

        <div className="mt-4 space-y-1.5">
          {/* Head channel bar */}
          <div className="flex items-center gap-2">
            <div className="w-16 text-[10px] font-medium text-foreground truncate flex-shrink-0">
              {headChannel.name}
            </div>
            <div className="flex-1 h-5 bg-primary/20 rounded relative overflow-hidden">
              {/* Progress bar */}
              <div
                className="absolute top-0 left-0 h-full bg-primary/60 rounded"
                style={{ width: `${Math.min((headElapsedMs / timelineDuration) * 100, 100)}%` }}
              />
              {/* Current position marker */}
              <div
                className="absolute top-0 h-full w-0.5 bg-primary"
                style={{ left: `${Math.min((headElapsedMs / timelineDuration) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Sub channel bars */}
          {subChannelData.map(({ sub, intervals }) => (
            <div key={sub.id} className="flex items-center gap-2">
              <div className="w-16 text-[10px] text-muted-foreground truncate flex-shrink-0 pl-2">
                └ {sub.name}
              </div>
              <div className="flex-1 h-4 bg-secondary/50 rounded relative overflow-hidden">
                {/* Interval bars */}
                {intervals.map((interval, idx) => {
                  const left = (interval.startMs / timelineDuration) * 100;
                  const width = ((interval.endMs - interval.startMs) / timelineDuration) * 100;
                  return (
                    <div
                      key={idx}
                      className="absolute top-0 h-full bg-green-500/70 rounded-sm"
                      style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%` }}
                      title={`${formatTimeShort(interval.startMs)} → ${formatTimeShort(interval.endMs)}`}
                    />
                  );
                })}

                {/* Mark points */}
                {sub.marks.map((mark, idx) => {
                  const left = (mark.headTimeMs / timelineDuration) * 100;
                  return (
                    <div
                      key={idx}
                      className={`absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full border border-background ${
                        mark.action === 'start' ? 'bg-green-500' : 'bg-orange-500'
                      }`}
                      style={{ left: `${left}%` }}
                      title={`${mark.action === 'start' ? '▶ Start' : '⏸ Pause'} @${formatTimeShort(mark.headTimeMs)}`}
                    />
                  );
                })}

                {/* Currently running indicator */}
                {sub.running && (
                  <div
                    className="absolute top-0 h-full w-0.5 bg-green-500 animate-pulse"
                    style={{ left: `${Math.min((headElapsedMs / timelineDuration) * 100, 100)}%` }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 mt-3 text-[9px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500/70 rounded-sm" />
            <span>Running</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            <span>Start</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
            <span>Pause</span>
          </div>
        </div>
      </div>
    </div>
  );
}
