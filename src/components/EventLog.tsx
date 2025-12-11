
import React from 'react';
import { List, AlertCircle, CheckCircle, XCircle, Info } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface LogEvent {
  id: string;
  timestamp: Date;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

interface EventLogProps {
  events: LogEvent[];
}

const EventLog: React.FC<EventLogProps> = ({ events }) => {
  const getEventIcon = (type: LogEvent['type']) => {
    switch (type) {
      case 'info':
        return <Info className="h-3 w-3 text-blue-400" />;
      case 'warning':
        return <AlertCircle className="h-3 w-3 text-yellow-400" />;
      case 'error':
        return <XCircle className="h-3 w-3 text-sentry-secondary" />;
      case 'success':
        return <CheckCircle className="h-3 w-3 text-sentry-primary" />;
    }
  };

  return (
    <div className="sentry-panel flex flex-col h-full">
      <div className="flex items-center gap-2 mb-2">
        <List className="h-4 w-4 text-sentry-accent" />
        <h2 className="sentry-title text-sm">SYSTEM LOG</h2>
        <div className="ml-auto text-xs text-muted-foreground">
          {events.length} events
        </div>
      </div>

      <ScrollArea className="flex-1 terminal-text pr-4">
        {events.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            No system events recorded
          </div>
        ) : (
          <div className="space-y-1">
            {events.map((event) => (
              <div 
                key={event.id}
                className={cn(
                  "p-1 text-xs border-l-2",
                  event.type === 'info' && "border-blue-500/50 bg-blue-500/5",
                  event.type === 'warning' && "border-yellow-500/50 bg-yellow-500/5",
                  event.type === 'error' && "border-red-500/50 bg-red-500/5",
                  event.type === 'success' && "border-green-500/50 bg-green-500/5"
                )}
              >
                <div className="flex items-start gap-2">
                  {getEventIcon(event.type)}
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">
                        {event.type.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="mt-0.5 leading-tight">{event.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default EventLog;
