import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { 
  Minimize2, 
  Maximize2, 
  GripVertical, 
  X,
  Maximize,
  Minus
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DraggablePanelProps {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
  defaultMinimized?: boolean;
  onRemove?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const DraggablePanel: React.FC<DraggablePanelProps> = ({
  id,
  title,
  children,
  className,
  defaultMinimized = false,
  onRemove,
  isFullscreen = false,
  onToggleFullscreen
}) => {
  const [isMinimized, setIsMinimized] = useState(defaultMinimized);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-sentry-background p-4">
        <div className="sentry-panel h-full flex flex-col">
          <div className="flex items-center justify-between px-2 py-1 border-b border-border/40 mb-2">
            <span className="text-xs font-display text-primary uppercase tracking-wider">
              {title}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 hover:bg-primary/20"
                onClick={onToggleFullscreen}
              >
                <Minimize2 className="h-3 w-3 text-primary" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "sentry-panel transition-all duration-200",
        isDragging && "opacity-50 z-50 shadow-lg shadow-primary/20",
        isMinimized && "h-10",
        className
      )}
    >
      {/* Panel Header */}
      <div 
        className="flex items-center justify-between px-2 py-1 border-b border-border/40 mb-2 cursor-move"
        {...attributes}
        {...listeners}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-display text-primary uppercase tracking-wider">
            {title}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-primary/20"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
          >
            {isMinimized ? (
              <Maximize2 className="h-3 w-3 text-primary" />
            ) : (
              <Minus className="h-3 w-3 text-primary" />
            )}
          </Button>
          
          {onToggleFullscreen && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 hover:bg-accent/20"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFullscreen();
              }}
            >
              <Maximize className="h-3 w-3 text-accent" />
            </Button>
          )}
          
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 hover:bg-destructive/20"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <X className="h-3 w-3 text-destructive" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Panel Content */}
      <div className={cn(
        "transition-all duration-200 overflow-hidden",
        isMinimized ? "h-0 opacity-0" : "h-auto opacity-100"
      )}>
        {children}
      </div>
    </div>
  );
};

export default DraggablePanel;
