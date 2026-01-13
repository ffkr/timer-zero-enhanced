import { useState } from 'react';
import { useStopwatch } from '@/hooks/useStopwatch';
import { HeadChannelCard } from '@/components/HeadChannelCard';
import { ActionBar } from '@/components/ActionBar';
import { NotesDisplay } from '@/components/NotesDisplay';
import { ImportTimeline } from '@/components/ImportTimeline';
import { ClipboardPaste } from 'lucide-react';

export default function Index() {
  const [showImport, setShowImport] = useState(false);

  const {
    headChannels,
    notes,
    addHeadChannel,
    addSubChannel,
    updateHeadChannelName,
    updateSubChannelName,
    toggleHeadChannel,
    toggleSubChannel,
    resetHeadChannel,
    resetSubChannel,
    deleteHeadChannel,
    deleteSubChannel,
    resetAllTimers,
    closeAllChannels,
    saveSnapshot,
    deleteNote,
    deleteAll,
    getDisplayTime,
    getButtonLabel,
  } = useStopwatch();

  const hasChannels = headChannels.length > 0;
  const hasData = hasChannels || notes.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <header className="mb-6 text-center">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
            Multi-Channel Stopwatch
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Head Channel = timer utama · Sub Channel = tracking relative time
          </p>
        </header>

        <main className="flex flex-col gap-4">
          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              className="py-2.5 px-4 bg-secondary text-secondary-foreground border border-dashed border-border rounded-xl text-sm font-medium hover:bg-accent hover:border-muted-foreground transition-all active:scale-[0.98]"
              onClick={addHeadChannel}
            >
              + Add Head Channel
            </button>

            <button
              className={`flex items-center gap-1.5 py-2.5 px-4 rounded-xl text-sm font-medium transition-all active:scale-[0.98] ${
                showImport
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground border border-dashed border-border hover:bg-accent hover:border-muted-foreground'
              }`}
              onClick={() => setShowImport(!showImport)}
            >
              <ClipboardPaste className="w-4 h-4" />
              Import Timeline
            </button>
          </div>

          {/* Import Timeline Panel */}
          {showImport && (
            <ImportTimeline onClose={() => setShowImport(false)} />
          )}

          <div className="flex flex-col gap-3">
            {headChannels.map((headChannel) => (
              <HeadChannelCard
                key={headChannel.id}
                headChannel={headChannel}
                displayTime={getDisplayTime(headChannel)}
                buttonLabel={getButtonLabel(headChannel)}
                onToggle={() => toggleHeadChannel(headChannel.id)}
                onNameChange={(name) => updateHeadChannelName(headChannel.id, name)}
                onDelete={() => deleteHeadChannel(headChannel.id)}
                onReset={() => resetHeadChannel(headChannel.id)}
                onAddSubChannel={() => addSubChannel(headChannel.id)}
                onToggleSubChannel={(subId) => toggleSubChannel(headChannel.id, subId)}
                onResetSubChannel={(subId) => resetSubChannel(headChannel.id, subId)}
                onDeleteSubChannel={(subId) => deleteSubChannel(headChannel.id, subId)}
                onUpdateSubChannelName={(subId, name) => updateSubChannelName(headChannel.id, subId, name)}
                getDisplayTime={getDisplayTime}
              />
            ))}
          </div>

          {hasChannels && (
            <ActionBar
              onSave={saveSnapshot}
              onDelete={deleteAll}
              onCloseAll={closeAllChannels}
              onResetAllTimers={resetAllTimers}
              hasChannels={hasChannels}
              hasData={hasData}
            />
          )}

          <NotesDisplay notes={notes} onDeleteNote={deleteNote} />
        </main>
      </div>
    </div>
  );
}
