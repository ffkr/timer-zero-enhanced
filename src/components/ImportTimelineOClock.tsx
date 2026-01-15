import { useState, useRef } from 'react';
import { X, Plus, Trash2, Eye, ChevronDown, ChevronRight, Download, Scissors } from 'lucide-react';
import html2canvas from 'html2canvas';

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
  isCutoff?: boolean; // Cutoff timer flag - non-operational time
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

// Calculate duration between two times in minutes
function getDurationMinutes(startTime: string, endTime: string): number {
  return Math.max(0, timeToMinutes(endTime) - timeToMinutes(startTime));
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

        // Calculate total cutoff time from cutoff sub-channels
        const cutoffSubs = head.subChannels.filter(s => s.isCutoff);
        const totalCutoffMins = cutoffSubs.reduce((acc, sub) => {
          return acc + sub.intervals.reduce((intAcc, int) => {
            return intAcc + getDurationMinutes(int.startTime, int.endTime);
          }, 0);
        }, 0);
        
        // Net operational duration
        const netOperationalMins = totalDurationMins - totalCutoffMins;

        // Generate time markers from 0m with 30m intervals
        const timeMarkers: { mins: number; label: string }[] = [];
        let accumulatedMins = 0;
        for (let i = 0; i <= totalDurationMins; i += 30) {
          timeMarkers.push({ mins: i, label: `${i}m` });
          accumulatedMins = i;
        }
        // Add final marker if not already at end
        if (accumulatedMins < totalDurationMins) {
          timeMarkers.push({ mins: totalDurationMins, label: `${totalDurationMins}m` });
        }

        return (
          <div key={head.id} className="bg-muted/30 rounded-lg p-3">
            <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <span>Timeline: {head.name} ({formatDuration(netOperationalMins)})</span>
              {totalCutoffMins > 0 && (
                <span className="text-rose-400 text-[10px]">
                  (Cutoff: -{formatDuration(totalCutoffMins)})
                </span>
              )}
            </div>

            <div className="relative">
              {/* Time markers - starting from 0m with 30m intervals */}
              <div className="relative h-4 text-[9px] text-muted-foreground mb-1">
                {timeMarkers.map((marker, idx) => (
                  <span
                    key={idx}
                    className="absolute -translate-x-1/2"
                    style={{ left: `${(marker.mins / totalDurationMins) * 100}%` }}
                  >
                    {marker.label}
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
                    
                    {/* Overlay cutoff sections on head bar */}
                    {cutoffSubs.map(sub => 
                      sub.intervals.map(interval => {
                        const intStart = timeToMinutes(interval.startTime);
                        const intEnd = timeToMinutes(interval.endTime);
                        const left = ((intStart - headStartMins) / totalDurationMins) * 100;
                        const width = ((intEnd - intStart) / totalDurationMins) * 100;
                        return (
                          <div
                            key={interval.id}
                            className="absolute top-0 h-full bg-rose-500/40 rounded-sm"
                            style={{ 
                              left: `${Math.max(0, left)}%`, 
                              width: `${Math.max(width, 0.5)}%`,
                              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)'
                            }}
                            title={`Cutoff: ${interval.startTime} → ${interval.endTime}`}
                          />
                        );
                      })
                    )}
                  </div>
                  <div className="w-14 text-[10px] text-muted-foreground text-right flex-shrink-0">
                    {formatDuration(netOperationalMins)}
                  </div>
                </div>

                {/* Sub channel bars (excluding cutoff) */}
                {head.subChannels.filter(s => !s.isCutoff).map((sub) => {
                  const totalActiveMins = sub.intervals.reduce((acc, int) => {
                    return acc + getDurationMinutes(int.startTime, int.endTime);
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
                        {formatDuration(totalActiveMins)}
                      </div>
                    </div>
                  );
                })}

                {/* Cutoff sub channels */}
                {cutoffSubs.map((sub) => {
                  const totalCutMins = sub.intervals.reduce((acc, int) => {
                    return acc + getDurationMinutes(int.startTime, int.endTime);
                  }, 0);

                  return (
                    <div key={sub.id} className="flex items-center gap-2">
                      <div className="w-24 text-[10px] text-rose-400 truncate flex-shrink-0 pl-3 flex items-center gap-1">
                        <Scissors className="w-2.5 h-2.5" />
                        {sub.name}
                      </div>
                      <div className="flex-1 h-4 bg-rose-500/20 rounded relative overflow-hidden">
                        {/* Cutoff interval bars */}
                        {sub.intervals.map((interval) => {
                          const intStart = timeToMinutes(interval.startTime);
                          const intEnd = timeToMinutes(interval.endTime);
                          const left = ((intStart - headStartMins) / totalDurationMins) * 100;
                          const width = ((intEnd - intStart) / totalDurationMins) * 100;
                          return (
                            <div
                              key={interval.id}
                              className="absolute top-0 h-full bg-rose-500/70 rounded-sm"
                              style={{ 
                                left: `${Math.max(0, left)}%`, 
                                width: `${Math.max(width, 0.5)}%`,
                                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.2) 2px, rgba(255,255,255,0.2) 4px)'
                              }}
                              title={`Cutoff: ${interval.startTime} → ${interval.endTime}`}
                            />
                          );
                        })}
                      </div>
                      <div className="w-14 text-[10px] text-rose-400 text-right flex-shrink-0">
                        -{formatDuration(totalCutMins)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 mt-3 text-[9px] text-muted-foreground flex-wrap">
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
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-rose-500/70 rounded-sm" style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 1px, rgba(255,255,255,0.3) 1px, rgba(255,255,255,0.3) 2px)'
                  }} />
                  <span>Cutoff</span>
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
  const [isExporting, setIsExporting] = useState(false);
  const visualizationRef = useRef<HTMLDivElement>(null);

  // Export visualization as PNG (FHD 1920x1080)
  const exportToPng = async () => {
    if (!visualizationRef.current) return;
    
    setIsExporting(true);
    try {
      const canvas = await html2canvas(visualizationRef.current, {
        scale: 2, // Higher resolution
        backgroundColor: '#1a1a2e',
        width: 1920,
        height: 1080,
        windowWidth: 1920,
        windowHeight: 1080,
      });
      
      const link = document.createElement('a');
      link.download = `timeline-oclock-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

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
        name: `Sub ${h.subChannels.filter(s => !s.isCutoff).length + 1}`,
        intervals: [],
        expanded: true,
        isCutoff: false,
      };
      return { ...h, subChannels: [...h.subChannels, newSub] };
    }));
  };

  // Add cutoff timer to head (special sub channel for non-operational time)
  const addCutoffTimer = (headId: string) => {
    setHeadChannels(headChannels.map(h => {
      if (h.id !== headId) return h;
      const cutoffCount = h.subChannels.filter(s => s.isCutoff).length;
      const newCutoff: ImportSubChannel = {
        id: generateId(),
        name: `Cutoff ${cutoffCount + 1}`,
        intervals: [],
        expanded: true,
        isCutoff: true,
      };
      return { ...h, subChannels: [...h.subChannels, newCutoff] };
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

  // Calculate head summary with cutoff consideration
  const getHeadSummary = (head: ImportHeadChannel) => {
    const totalMins = getDurationMinutes(head.startTime, head.endTime);
    const cutoffMins = head.subChannels
      .filter(s => s.isCutoff)
      .reduce((acc, s) => acc + s.intervals.reduce((intAcc, int) => intAcc + getDurationMinutes(int.startTime, int.endTime), 0), 0);
    return { totalMins, cutoffMins, netMins: totalMins - cutoffMins };
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
        Head Channel = range waktu (07:00 → 14:00) · Sub Channel = aktivitas · Cutoff = waktu non-operasional
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
        {headChannels.map((head) => {
          const summary = getHeadSummary(head);
          
          return (
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

                {/* Duration with cutoff info */}
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <span className="font-medium text-foreground">{formatDuration(summary.netMins)}</span>
                  {summary.cutoffMins > 0 && (
                    <span className="text-rose-400">(-{formatDuration(summary.cutoffMins)})</span>
                  )}
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
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => addSubChannel(head.id)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Add Sub Channel
                    </button>

                    {/* Apple-like Cutoff Timer Button */}
                    <button
                      onClick={() => addCutoffTimer(head.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all
                        bg-gradient-to-r from-rose-500 to-pink-500 text-white
                        shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40
                        hover:scale-105 active:scale-95
                        border border-rose-400/30"
                    >
                      <Scissors className="w-3 h-3" />
                      Add Cutoff Timer
                    </button>
                  </div>

                  {/* Sub Channels (Regular) */}
                  {head.subChannels.filter(s => !s.isCutoff).map((sub) => (
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

                              <span className="text-muted-foreground">
                                ({formatDuration(getDurationMinutes(interval.startTime, interval.endTime))} aktif)
                              </span>

                              <button
                                onClick={() => deleteInterval(head.id, sub.id, interval.id)}
                                className="w-4 h-4 rounded-full hover:bg-destructive/20 hover:text-destructive flex items-center justify-center transition-colors ml-auto"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ))}

                          {sub.intervals.length === 0 && (
                            <div className="text-[10px] text-muted-foreground italic pl-4">
                              Belum ada timeline. Klik "Add Timeline" untuk menambahkan.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Cutoff Timer Sub Channels */}
                  {head.subChannels.filter(s => s.isCutoff).map((sub) => (
                    <div key={sub.id} className="rounded-lg p-2 space-y-2 border-2 border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-pink-500/10">
                      {/* Cutoff Header */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleSubExpand(head.id, sub.id)}
                          className="text-rose-400 hover:text-rose-300"
                        >
                          {sub.expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>

                        <Scissors className="w-3 h-3 text-rose-400" />

                        <input
                          type="text"
                          value={sub.name}
                          onChange={(e) => updateSubChannel(head.id, sub.id, { name: e.target.value })}
                          className="flex-1 bg-transparent text-xs text-rose-300 font-medium border-none focus:outline-none focus:ring-0"
                          placeholder="Cutoff Name"
                        />

                        <span className="text-[10px] text-rose-400 font-medium px-2 py-0.5 rounded-full bg-rose-500/20">
                          Non-Operational
                        </span>

                        <button
                          onClick={() => deleteSubChannel(head.id, sub.id)}
                          className="w-5 h-5 rounded-full hover:bg-rose-500/30 text-rose-400 hover:text-rose-300 flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Cutoff Intervals */}
                      {sub.expanded && (
                        <div className="pl-5 space-y-1">
                          {/* Add Cutoff Interval Button */}
                          <button
                            onClick={() => addInterval(head.id, sub.id)}
                            className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded transition-colors"
                          >
                            <Plus className="w-2.5 h-2.5" />
                            Add Cutoff Time
                          </button>

                          {/* Cutoff Intervals */}
                          {sub.intervals.map((interval, idx) => (
                            <div key={interval.id} className="flex items-center gap-2 text-[10px]">
                              <span className="text-rose-400 w-4">{idx + 1}.</span>

                              <div className="flex items-center gap-1">
                                <span className="text-rose-400">✂</span>
                                <input
                                  type="time"
                                  value={interval.startTime}
                                  onChange={(e) => updateInterval(head.id, sub.id, interval.id, { startTime: e.target.value })}
                                  className="bg-rose-500/20 border border-rose-500/30 rounded px-1.5 py-0.5 text-[10px] text-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-500/50"
                                />
                              </div>

                              <span className="text-rose-400">→</span>

                              <div className="flex items-center gap-1">
                                <span className="text-rose-400">✂</span>
                                <input
                                  type="time"
                                  value={interval.endTime}
                                  onChange={(e) => updateInterval(head.id, sub.id, interval.id, { endTime: e.target.value })}
                                  className="bg-rose-500/20 border border-rose-500/30 rounded px-1.5 py-0.5 text-[10px] text-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-500/50"
                                />
                              </div>

                              <span className="text-rose-400 font-medium">
                                (-{formatDuration(getDurationMinutes(interval.startTime, interval.endTime))})
                              </span>

                              <button
                                onClick={() => deleteInterval(head.id, sub.id, interval.id)}
                                className="w-4 h-4 rounded-full hover:bg-rose-500/30 text-rose-400 hover:text-rose-300 flex items-center justify-center transition-colors ml-auto"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ))}

                          {sub.intervals.length === 0 && (
                            <div className="text-[10px] text-rose-400/70 italic pl-4">
                              Tambahkan waktu cutoff untuk mengurangi durasi dari Head.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {head.subChannels.length === 0 && (
                    <div className="text-xs text-muted-foreground italic pl-2">
                      Belum ada sub channel atau cutoff timer
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Empty state */}
        {!hasData && (
          <div className="text-center text-muted-foreground py-4 text-sm">
            Klik "Add Head Channel" untuk mulai membuat timeline
          </div>
        )}
      </div>

      {/* Visualize Button */}
      {hasData && (
        <div className="mt-4 pt-3 border-t border-border flex items-center gap-2">
          <button
            onClick={() => setShowVisualization(!showVisualization)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-accent-foreground rounded-lg text-xs font-medium hover:bg-accent/80 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            {showVisualization ? 'Sembunyikan' : 'Tampilkan'} Visualisasi
          </button>
          
          {showVisualization && (
            <button
              onClick={exportToPng}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {isExporting ? 'Exporting...' : 'Export PNG (FHD)'}
            </button>
          )}
        </div>
      )}

      {/* Visualization */}
      {showVisualization && hasData && (
        <div className="mt-4 pt-4 border-t border-border">
          <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            Timeline Visualization
          </h4>
          <div ref={visualizationRef} className="p-4 bg-background rounded-lg">
            <TimelineVisualization headChannels={headChannels} />
          </div>
        </div>
      )}
    </div>
  );
}
