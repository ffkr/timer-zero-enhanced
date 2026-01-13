import { useState, useEffect } from 'react';
import { X, RotateCcw, Play, Pause } from 'lucide-react';
import { SubChannel } from '@/types';
import { formatTimeShort } from '@/hooks/useStopwatch';

interface SubChannelCardProps {
  subChannel: SubChannel;
  displayTime: string;
  onToggle: () => void;
  onNameChange: (name: string) => void;
  onDelete: () => void;
  onReset: () => void;
}

export function SubChannelCard({
  subChannel,
  displayTime,
  onToggle,
  onNameChange,
  onDelete,
  onReset,
}: SubChannelCardProps) {
  const [localName, setLocalName] = useState(subChannel.name);

  useEffect(() => {
    setLocalName(subChannel.name);
  }, [subChannel.name]);

  const handleBlur = () => {
    onNameChange(localName);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  // Get last mark for display
  const lastMark = subChannel.marks[subChannel.marks.length - 1];

  return (
    <div className="bg-muted/50 border border-border/50 rounded-lg p-2 relative group flex-shrink-0 w-[120px]">
      {/* Delete button */}
      <button
        onClick={onDelete}
        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-muted hover:bg-destructive hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10"
        aria-label="Delete sub channel"
      >
        <X className="w-2.5 h-2.5" />
      </button>

      <input
        type="text"
        className="w-full text-[10px] font-medium text-muted-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none py-0.5 transition-colors truncate"
        value={localName}
        onChange={(e) => setLocalName(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="Sub name"
      />

      <div className="text-sm font-semibold tabular-nums tracking-tight text-foreground text-center py-1 font-mono">
        {displayTime}
      </div>

      {/* Last mark indicator */}
      {lastMark && (
        <div className="text-[9px] text-muted-foreground text-center mb-1 flex items-center justify-center gap-0.5">
          {lastMark.action === 'start' ? (
            <Play className="w-2 h-2" />
          ) : (
            <Pause className="w-2 h-2" />
          )}
          <span>@{formatTimeShort(lastMark.headTimeMs)}</span>
        </div>
      )}

      <div className="flex gap-1">
        <button
          className={`flex-1 py-1 px-1.5 rounded text-[10px] font-medium transition-all active:scale-[0.98] ${
            subChannel.running
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-primary text-primary-foreground hover:opacity-90'
          }`}
          onClick={onToggle}
        >
          {subChannel.running ? <Pause className="w-3 h-3 mx-auto" /> : <Play className="w-3 h-3 mx-auto" />}
        </button>
        <button
          onClick={onReset}
          className="py-1 px-1.5 rounded text-[10px] font-medium bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground transition-all active:scale-[0.98]"
          aria-label="Reset timer"
          title="Reset"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
