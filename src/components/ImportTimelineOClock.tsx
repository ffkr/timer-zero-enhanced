import { useState } from 'react';
import { X, Plus, Trash2, Eye, ChevronDown, ChevronRight } from 'lucide-react';

interface TimelineInterval {
  id: string;
  startTime: string; // Format: "HH:MM"
  endTime: string;   // Format: "HH:MM"
}

interface ImportSubChannel {
  id: string;
  name: string;
  intervals: TimelineInterval[];
  expanded: boolean;
}

interface ImportHeadChannel {
  id: string;
  name: string;
  startTime: string; // e.g. "07:00"
  endTime: string;   // e.g. "14:00"
  subChannels: ImportSubChannel[];
  expanded: boolean;
}

interface ImportTimelineOClockProps {
  onClose: () => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Convert "HH:MM" to minutes from midnight
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Convert minutes to "HH:MM" format
function minutesToTime(mins: number): string {
  const hours = Math.floor(mins / 60) % 24;
  const minutes = mins % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Format duration in minutes to readable string
function formatDuration(mins: number): string {
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

function TimelineVisualization({ headChannels }: { headChannels: ImportHeadChannel[] }) {
  if (headChannels.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-6 text-sm">
        Tambahkan Head Channel untuk melihat visualisasi
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {headChannels.map((head) => {
        const headStartMins = timeToMinutes(head.startTime);
        const headEndMins = timeToMinutes(head.endTime);
        const totalDurationMins = headEndMins - headStartMins;
        
        if (totalDurationMins <= 0) return null;

        // Generate time markers based on head channel time range
        const stepMinutes = totalDurationMins > 360 ? 60 : totalDurationMins > 120 ? 30 : totalDurationMins > 60 ? 15 : 10;
        const timeMarkers: number[] = [];
        for (let i = headStartMins; i <= headEndMins; i += stepMinutes) {
          timeMarkers.push(i);
        }
        if (timeMarkers[timeMarkers.length - 1] !== headEndMins) {
          timeMarkers.push(headEndMins);
        }

        return (
          <div key={head.id} className="bg-muted/30 rounded-lg p-3">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Timeline: {head.name} ({head.startTime} → {head.endTime} = {formatDuration(totalDurationMins)})
            </div>

            <div className="relative">
              {/* Time markers */}
              <div className="relative h-4 text-[9px] text-muted-foreground mb-1">
                {timeMarkers.map((mins, idx) => (
                  <span
                    key={idx}
                    className="absolute -translate-x-1/2"
                    style={{ left: `${((mins - headStartMins) / totalDurationMins) * 100}%` }}
                  >
                    {minutesToTime(mins)}
                  </span>
                ))}
              </div>

              <div className="space-y-1.5">
                {/* Head channel bar */}
                <div className="flex items-center gap-2">
                  <div className="w-24 text-[10px] font-medium text-foreground truncate flex-shrink-0">
                    📌 {head.name}
                  </div>
                  <div className="flex-1 h-5 bg-primary/20 rounded relative overflow-hidden">
                    <div className="absolute top-0 left-0 h-full w-full bg-primary/40 rounded" />
                  </div>
                  <div className="w-14 text-[10px] text-muted-foreground text-right flex-shrink-0">
                    {formatDuration(totalDurationMins)}
                  </div>
                </div>

                {/* Sub channel bars */}
                {head.subChannels.map((sub) => {
                  // Calculate total active time for this sub
                  const totalActiveMs = sub.intervals.reduce((acc, int) => {
                    const start = timeToMinutes(int.startTime);
                    const end = timeToMinutes(int.endTime);
                    return acc + (end - start);
                  }, 0);

                  return (
                    <div key={sub.id} className="flex items-center gap-2">
                      <div className="w-24 text-[10px] text-muted-foreground truncate flex-shrink-0 pl-3">
                        └ {sub.name}
                      </div>
                      <div className="flex-1 h-4 bg-secondary/50 rounded relative overflow-hidden">
                        {/* Interval bars */}
                        {sub.intervals.map((interval) => {
                          const intStart = timeToMinutes(interval.startTime);
                          const intEnd = timeToMinutes(interval.endTime);
                          const left = ((intStart - headStartMins) / totalDurationMins) * 100;
                          const width = ((intEnd - intStart) / totalDurationMins) * 100;
                          return (
                            <div
                              key={interval.id}
                              className="absolute top-0 h-full bg-green-500/70 rounded-sm"
                              style={{ left: `${Math.max(0, left)}%`, width: `${Math.max(width, 0.5)}%` }}
                              title={`${interval.startTime} → ${interval.endTime}`}
                            />
                          );
                        })}

                        {/* Start/end markers */}
                        {sub.intervals.map((interval) => {
                          const intStart = timeToMinutes(interval.startTime);
                          const intEnd = timeToMinutes(interval.endTime);
                          return (
                            <div key={`markers-${interval.id}`}>
                              <div
                                className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full border border-background bg-green-500"
                                style={{ left: `${((intStart - headStartMins) / totalDurationMins) * 100}%` }}
                                title={`▶ Start @${interval.startTime}`}
                              />
                              <div
                                className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full border border-background bg-orange-500"
                                style={{ left: `${((intEnd - headStartMins) / totalDurationMins) * 100}%` }}
                                title={`⏸ Pause @${interval.endTime}`}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="w-14 text-[10px] text-muted-foreground text-right flex-shrink-0">
                        {formatDuration(totalActiveMs)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 mt-3 text-[9px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500/70 rounded-sm" />
                  <span>Active</span>
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
      })}
    </div>
  );
}

export function ImportTimelineOClock({ onClose }: ImportTimelineOClockProps) {
  const [headChannels, setHeadChannels] = useState<ImportHeadChannel[]>([]);
  const [showVisualization, setShowVisualization] = useState(false);

  // Add new head channel
  const addHeadChannel = () => {
    const newHead: ImportHeadChannel = {
      id: generateId(),
      name: `Head ${headChannels.length + 1}`,
      startTime: '07:00',
      endTime: '14:00',
      subChannels: [],
      expanded: true,
    };
    setHeadChannels([...headChannels, newHead]);
  };

  // Delete head channel
  const deleteHeadChannel = (headId: string) => {
    setHeadChannels(headChannels.filter(h => h.id !== headId));
  };

  // Update head channel
  const updateHeadChannel = (headId: string, updates: Partial<ImportHeadChannel>) => {
    setHeadChannels(headChannels.map(h =>
      h.id === headId ? { ...h, ...updates } : h
    ));
  };

  // Toggle head channel expand
  const toggleHeadExpand = (headId: string) => {
    setHeadChannels(headChannels.map(h =>
      h.id === headId ? { ...h, expanded: !h.expanded } : h
    ));
  };

  // Add sub channel to head
  const addSubChannel = (headId: string) => {
    setHeadChannels(headChannels.map(h => {
      if (h.id !== headId) return h;
      const newSub: ImportSubChannel = {
        id: generateId(),
        name: `Sub ${h.subChannels.length + 1}`,
        intervals: [],
        expanded: true,
      };
      return { ...h, subChannels: [...h.subChannels, newSub] };
    }));
  };

  // Delete sub channel
  const deleteSubChannel = (headId: string, subId: string) => {
    setHeadChannels(headChannels.map(h => {
      if (h.id !== headId) return h;
      return { ...h, subChannels: h.subChannels.filter(s => s.id !== subId) };
    }));
  };

  // Update sub channel
  const updateSubChannel = (headId: string, subId: string, updates: Partial<ImportSubChannel>) => {
    setHeadChannels(headChannels.map(h => {
      if (h.id !== headId) return h;
      return {
        ...h,
        subChannels: h.subChannels.map(s =>
          s.id === subId ? { ...s, ...updates } : s
        ),
      };
    }));
  };

  // Toggle sub channel expand
  const toggleSubExpand = (headId: string, subId: string) => {
    setHeadChannels(headChannels.map(h => {
      if (h.id !== headId) return h;
      return {
        ...h,
        subChannels: h.subChannels.map(s =>
          s.id === subId ? { ...s, expanded: !s.expanded } : s
        ),
      };
    }));
  };

  // Add interval to sub channel
  const addInterval = (headId: string, subId: string) => {
    setHeadChannels(headChannels.map(h => {
      if (h.id !== headId) return h;
      return {
        ...h,
        subChannels: h.subChannels.map(s => {
          if (s.id !== subId) return s;
          // Get last interval end time as new start, or head start time
          const lastEnd = s.intervals.length > 0
            ? s.intervals[s.intervals.length - 1].endTime
            : h.startTime;
          const lastEndMins = timeToMinutes(lastEnd);
          const headEndMins = timeToMinutes(h.endTime);
          const newEndMins = Math.min(lastEndMins + 30, headEndMins);
          
          const newInterval: TimelineInterval = {
            id: generateId(),
            startTime: lastEnd,
            endTime: minutesToTime(newEndMins),
          };
          return { ...s, intervals: [...s.intervals, newInterval] };
        }),
      };
    }));
  };

  // Delete interval
  const deleteInterval = (headId: string, subId: string, intervalId: string) => {
    setHeadChannels(headChannels.map(h => {
      if (h.id !== headId) return h;
      return {
        ...h,
        subChannels: h.subChannels.map(s => {
          if (s.id !== subId) return s;
          return { ...s, intervals: s.intervals.filter(i => i.id !== intervalId) };
        }),
      };
    }));
  };

  // Update interval
  const updateInterval = (headId: string, subId: string, intervalId: string, updates: Partial<TimelineInterval>) => {
    setHeadChannels(headChannels.map(h => {
      if (h.id !== headId) return h;
      return {
        ...h,
        subChannels: h.subChannels.map(s => {
          if (s.id !== subId) return s;
          return {
            ...s,
            intervals: s.intervals.map(i =>
              i.id === intervalId ? { ...i, ...updates } : i
            ),
          };
        }),
      };
    }));
  };

  const hasData = headChannels.length > 0;

  return (
    <div className="bg-secondary rounded-xl p-4 relative">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-muted/80 hover:bg-destructive hover:text-white flex items-center justify-center transition-all"
        aria-label="Close"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <h3 className="text-sm font-semibold text-foreground mb-3">Timeline Builder (O'Clock)</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Head Channel = range waktu (07:00 → 14:00) · Sub Channel = aktivitas dalam range jam
      </p>

      {/* Builder UI */}
      <div className="space-y-3">
        {/* Add Head Channel Button */}
        <button
          onClick={addHeadChannel}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Head Channel
        </button>

        {/* Head Channels List */}
        {headChannels.map((head) => (
          <div key={head.id} className="bg-muted/50 rounded-lg p-3 space-y-2">
            {/* Head Channel Header */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleHeadExpand(head.id)}
                className="text-muted-foreground hover:text-foreground"
              >
                {head.expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              <span className="text-xs text-primary font-medium">📌</span>

              <input
                type="text"
                value={head.name}
                onChange={(e) => updateHeadChannel(head.id, { name: e.target.value })}
                className="flex-1 bg-transparent text-sm font-medium text-foreground border-none focus:outline-none focus:ring-0"
                placeholder="Head Channel Name"
              />

              <div className="flex items-center gap-1">
                <input
                  type="time"
                  value={head.startTime}
                  onChange={(e) => updateHeadChannel(head.id, { startTime: e.target.value })}
                  className="bg-muted rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                <span className="text-xs text-muted-foreground">→</span>
                <input
                  type="time"
                  value={head.endTime}
                  onChange={(e) => updateHeadChannel(head.id, { endTime: e.target.value })}
                  className="bg-muted rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>

              <button
                onClick={() => deleteHeadChannel(head.id)}
                className="w-6 h-6 rounded-full hover:bg-destructive/20 hover:text-destructive flex items-center justify-center transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Head Channel Content */}
            {head.expanded && (
              <div className="pl-6 space-y-2">
                {/* Add Sub Channel Button */}
                <button
                  onClick={() => addSubChannel(head.id)}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add Sub Channel
                </button>

                {/* Sub Channels */}
                {head.subChannels.map((sub) => (
                  <div key={sub.id} className="bg-background/50 rounded-lg p-2 space-y-2">
                    {/* Sub Channel Header */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleSubExpand(head.id, sub.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {sub.expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>

                      <span className="text-[10px] text-muted-foreground">└</span>

                      <input
                        type="text"
                        value={sub.name}
                        onChange={(e) => updateSubChannel(head.id, sub.id, { name: e.target.value })}
                        className="flex-1 bg-transparent text-xs text-foreground border-none focus:outline-none focus:ring-0"
                        placeholder="Sub Channel Name"
                      />

                      <span className="text-[10px] text-muted-foreground">
                        {sub.intervals.length} interval
                      </span>

                      <button
                        onClick={() => deleteSubChannel(head.id, sub.id)}
                        className="w-5 h-5 rounded-full hover:bg-destructive/20 hover:text-destructive flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Sub Channel Intervals */}
                    {sub.expanded && (
                      <div className="pl-5 space-y-1">
                        {/* Add Interval Button */}
                        <button
                          onClick={() => addInterval(head.id, sub.id)}
                          className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          Add Timeline (Start → Pause)
                        </button>

                        {/* Intervals */}
                        {sub.intervals.map((interval, idx) => (
                          <div key={interval.id} className="flex items-center gap-2 text-[10px]">
                            <span className="text-muted-foreground w-4">{idx + 1}.</span>

                            <div className="flex items-center gap-1">
                              <span className="text-green-500">▶</span>
                              <input
                                type="time"
                                value={interval.startTime}
                                onChange={(e) => updateInterval(head.id, sub.id, interval.id, { startTime: e.target.value })}
                                className="bg-muted rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-primary/50"
                              />
                            </div>

                            <span className="text-muted-foreground">→</span>

                            <div className="flex items-center gap-1">
                              <span className="text-orange-500">⏸</span>
                              <input
                                type="time"
                                value={interval.endTime}
                                onChange={(e) => updateInterval(head.id, sub.id, interval.id, { endTime: e.target.value })}
                                className="bg-muted rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-primary/50"
                              />
                            </div>

                            <button
                              onClick={() => deleteInterval(head.id, sub.id, interval.id)}
                              className="w-4 h-4 rounded hover:bg-destructive/20 hover:text-destructive flex items-center justify-center transition-colors"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Visualization Toggle */}
      {hasData && (
        <div className="mt-4 pt-3 border-t border-border">
          <button
            onClick={() => setShowVisualization(!showVisualization)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-accent-foreground rounded-lg text-xs font-medium hover:bg-accent/80 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            {showVisualization ? 'Hide' : 'Show'} Visualization
          </button>
        </div>
      )}

      {/* Visualization */}
      {showVisualization && (
        <div className="mt-3">
          <TimelineVisualization headChannels={headChannels} />
        </div>
      )}
    </div>
  );
}
