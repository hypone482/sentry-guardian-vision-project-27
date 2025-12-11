import React, { useState, useCallback, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';
import DraggablePanel from './DraggablePanel';
import VideoFeed from '@/components/VideoFeed';
import ControlPanel from '@/components/ControlPanel';
import StatusPanel from '@/components/StatusPanel';
import RadarDisplay from '@/components/RadarDisplay';
import Radar3DDisplay from '@/components/Radar3DDisplay';
import GPSMap from '@/components/GPSMap';
import Globe3D from '@/components/Globe3D';
import JoystickControl from '@/components/JoystickControl';
import SystemData from '@/components/SystemData';
import EventLog, { LogEvent } from '@/components/EventLog';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
interface PanelConfig {
  id: string;
  title: string;
  visible: boolean;
  column: 'left' | 'right';
}
interface LayoutContainerProps {
  systemActive: boolean;
  sensitivity: number;
  trackingMode: 'passive' | 'active';
  logEvents: LogEvent[];
  detectionData: {
    timestamp: Date;
    count: number;
  }[];
  onSensitivityChange: (value: number) => void;
  onSystemActiveChange: (active: boolean) => void;
  onTrackingModeChange: (mode: 'passive' | 'active') => void;
  onReset: () => void;
  onMotionDetected: (targets: any[]) => void;
}
const DEFAULT_PANELS: PanelConfig[] = [{
  id: 'video',
  title: 'Video Feed',
  visible: true,
  column: 'left'
}, {
  id: 'radar3d',
  title: '3D Radar',
  visible: true,
  column: 'left'
}, {
  id: 'globe3d',
  title: '3D Globe',
  visible: true,
  column: 'right'
}, {
  id: 'control',
  title: 'Control',
  visible: true,
  column: 'right'
}, {
  id: 'status',
  title: 'Status',
  visible: true,
  column: 'right'
}, {
  id: 'radar',
  title: 'Radar',
  visible: true,
  column: 'right'
}, {
  id: 'gpsmap',
  title: 'GPS Map',
  visible: true,
  column: 'right'
}, {
  id: 'joystick',
  title: 'Joystick',
  visible: true,
  column: 'right'
}, {
  id: 'data',
  title: 'Data',
  visible: true,
  column: 'left'
}, {
  id: 'events',
  title: 'Events',
  visible: true,
  column: 'left'
}];
const LayoutContainer: React.FC<LayoutContainerProps> = ({
  systemActive,
  sensitivity,
  trackingMode,
  logEvents,
  detectionData,
  onSensitivityChange,
  onSystemActiveChange,
  onTrackingModeChange,
  onReset,
  onMotionDetected
}) => {
  const [panels, setPanels] = useState<PanelConfig[]>(() => {
    const saved = localStorage.getItem('sentry-panel-layout');
    return saved ? JSON.parse(saved) : DEFAULT_PANELS;
  });
  const [fullscreenPanel, setFullscreenPanel] = useState<string | null>(null);
  const [leftPanelSize, setLeftPanelSize] = useState(60);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const handleLocationUpdate = useCallback((lat: number, lng: number) => {
    setUserLocation({
      lat,
      lng
    });
  }, []);
  useEffect(() => {
    localStorage.setItem('sentry-panel-layout', JSON.stringify(panels));
  }, [panels]);
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8
    }
  }), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const {
      active,
      over
    } = event;
    if (over && active.id !== over.id) {
      setPanels(items => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);
  const togglePanelVisibility = useCallback((id: string) => {
    setPanels(items => items.map(item => item.id === id ? {
      ...item,
      visible: !item.visible
    } : item));
  }, []);
  const resetLayout = useCallback(() => {
    setPanels(DEFAULT_PANELS);
    setFullscreenPanel(null);
    localStorage.removeItem('sentry-panel-layout');
  }, []);
  const leftPanels = panels.filter(p => p.column === 'left' && p.visible);
  const rightPanels = panels.filter(p => p.column === 'right' && p.visible);
  const renderPanelContent = (panel: PanelConfig) => {
    switch (panel.id) {
      case 'video':
        return <VideoFeed feedId="MAIN-01" sensitivity={sensitivity} active={systemActive} onMotionDetected={onMotionDetected} />;
      case 'control':
        return <ControlPanel sensitivity={sensitivity} onSensitivityChange={onSensitivityChange} systemActive={systemActive} onSystemActiveChange={onSystemActiveChange} trackingMode={trackingMode} onTrackingModeChange={onTrackingModeChange} onReset={onReset} />;
      case 'status':
        return <StatusPanel systemActive={systemActive} />;
      case 'radar':
        return <RadarDisplay active={systemActive} />;
      case 'radar3d':
        return <Radar3DDisplay active={systemActive} />;
      case 'gpsmap':
        return <GPSMap active={systemActive} onLocationUpdate={handleLocationUpdate} />;
      case 'globe3d':
        return <Globe3D active={systemActive} userLocation={userLocation} />;
      case 'joystick':
        return <JoystickControl active={systemActive} />;
      case 'data':
        return <SystemData detectionData={detectionData} />;
      case 'events':
        return <EventLog events={logEvents} />;
      default:
        return null;
    }
  };
  if (fullscreenPanel) {
    const panel = panels.find(p => p.id === fullscreenPanel);
    if (panel) {
      return <DraggablePanel id={panel.id} title={panel.title} isFullscreen onToggleFullscreen={() => setFullscreenPanel(null)}>
          {renderPanelContent(panel)}
        </DraggablePanel>;
    }
  }
  return <div className="flex flex-col h-full gap-1">
      {/* Panel Toggle Bar */}
      <div className="flex-wrap gap-1 px-2 py-1.5 bg-card/30 rounded border border-border/30 flex items-start justify-center">
        <span className="text-[10px] text-muted-foreground font-mono mr-2">PANELS:</span>
        {panels.map(panel => <button key={panel.id} onClick={() => togglePanelVisibility(panel.id)} className={cn("text-[10px] px-1.5 py-0.5 rounded transition-colors font-mono", panel.visible ? "bg-primary/20 text-primary border border-primary/40" : "bg-muted/20 text-muted-foreground border border-border/40")}>
            {panel.title}
          </button>)}
        <button onClick={resetLayout} className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent border border-accent/40 font-mono hover:bg-accent/30">
          RESET
        </button>
      </div>

      {/* Main Content */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Left Column */}
          <ResizablePanel defaultSize={leftPanelSize} minSize={30} maxSize={75} onResize={setLeftPanelSize}>
            <SortableContext items={leftPanels.map(p => p.id)} strategy={rectSortingStrategy}>
              <div className="h-full flex flex-col gap-1 pr-1 overflow-y-auto">
                {leftPanels.map(panel => <DraggablePanel key={panel.id} id={panel.id} title={panel.title} onRemove={() => togglePanelVisibility(panel.id)} onToggleFullscreen={() => setFullscreenPanel(panel.id)} className="min-h-[180px]">
                    {renderPanelContent(panel)}
                  </DraggablePanel>)}
              </div>
            </SortableContext>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Column */}
          <ResizablePanel defaultSize={100 - leftPanelSize} minSize={25} maxSize={70}>
            <SortableContext items={rightPanels.map(p => p.id)} strategy={rectSortingStrategy}>
              <div className="h-full grid grid-cols-2 gap-1 pl-1 overflow-y-auto auto-rows-min">
                {rightPanels.map(panel => <DraggablePanel key={panel.id} id={panel.id} title={panel.title} onRemove={() => togglePanelVisibility(panel.id)} onToggleFullscreen={() => setFullscreenPanel(panel.id)} className="min-h-[150px]">
                    {renderPanelContent(panel)}
                  </DraggablePanel>)}
              </div>
            </SortableContext>
          </ResizablePanel>
        </ResizablePanelGroup>
      </DndContext>
    </div>;
};
export default LayoutContainer;