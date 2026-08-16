import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import type { ContentManagerState } from '../ContentManager';

interface PublishBarProps {
  state: ContentManagerState;
  onPublish: () => void;
  onDiscard: () => void;
  className?: string;
}

export default function PublishBar({
  state,
  onPublish,
  onDiscard,
  className = '',
}: PublishBarProps) {
  const pendingCount = Object.values(state.pendingChanges)
    .reduce((sum, changes) => sum + Object.keys(changes).length, 0);

  const statusConfig = {
    idle: {
      icon: null,
      text: pendingCount > 0 ? `${pendingCount} unsaved change${pendingCount > 1 ? 's' : ''}` : 'All changes saved',
      color: 'text-white/60',
    },
    saving: {
      icon: <Loader2 size={16} className="animate-spin text-teal-400" />,
      text: 'Saving...',
      color: 'text-teal-400',
    },
    saved: {
      icon: <CheckCircle size={16} className="text-teal-400" />,
      text: 'All changes published',
      color: 'text-teal-400',
    },
    error: {
      icon: <XCircle size={16} className="text-red-400" />,
      text: state.lastError || 'Failed to save',
      color: 'text-red-400',
    },
  };

  const config = statusConfig[state.publishStatus];
  const canPublish = pendingCount > 0 && state.publishStatus !== 'saving';
  const canDiscard = pendingCount > 0 && state.publishStatus !== 'saving';

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 p-4 ${className}`}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border backdrop-blur-xl"
             style={{ background: 'rgba(20, 20, 30, 0.95)', borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="flex items-center gap-3">
            {config.icon}
            <span className={`text-sm font-medium ${config.color}`}>{config.text}</span>
          </div>

          <div className="flex items-center gap-3">
            {state.lastError && (
              <button
                onClick={onDiscard}
                disabled={!canDiscard}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Discard
              </button>
            )}
            <button
              onClick={onPublish}
              disabled={!canPublish}
              className="px-6 py-2 rounded-lg text-sm font-medium bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors flex items-center gap-2"
            >
              {state.publishStatus === 'saving' ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                'Publish Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
