import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Folder, FileText, Settings, Clock, MapPin, CheckCircle, Maximize2, Minimize2, Download, Upload, X, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import OfflineIndicator from '@/components/OfflineIndicator';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
  useSortable,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface MissionLog {
  id: string;
  title: string;
  description: string;
  timestamp: number;
  status: 'pending' | 'active' | 'completed';
  priority: 'low' | 'medium' | 'high';
}

interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  timestamp: number;
}

type PaneType = 'missions' | 'waypoints' | 'notes';
type SplitDir = 'horizontal' | 'vertical';

interface Pane {
  id: string;
  type: PaneType;
  minimized: boolean;
}

const PANE_LABELS: Record<PaneType, string> = {
  missions: 'Mission Logs',
  waypoints: 'Waypoints',
  notes: 'Field Notes',
};

const Workspace: React.FC = () => {
  const [missionLogs, setMissionLogs] = useOfflineStorage<MissionLog[]>({
    key: 'missionLogs',
    defaultValue: [],
  });

  const [waypoints, setWaypoints] = useOfflineStorage<Waypoint[]>({
    key: 'waypoints',
    defaultValue: [],
  });

  const [notes, setNotes] = useOfflineStorage<string>({
    key: 'workspaceNotes',
    defaultValue: '',
  });

  const [panes, setPanes] = useOfflineStorage<Pane[]>({
    key: 'workspacePanes_v2',
    defaultValue: [
      { id: 'p1', type: 'missions', minimized: false },
      { id: 'p2', type: 'waypoints', minimized: false },
    ],
  });

  const [splitDir, setSplitDir] = useOfflineStorage<SplitDir>({
    key: 'workspaceSplitDir',
    defaultValue: 'horizontal',
  });

  const [maximizedId, setMaximizedId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ------------ pane management ------------
  const addPane = (type: PaneType = 'notes') => {
    if (panes.length >= 6) {
      toast.warning('Pane limit reached', { description: 'Maximum of 6 panes' });
      return;
    }
    setPanes([
      ...panes,
      { id: `p_${Date.now().toString(36)}`, type, minimized: false },
    ]);
  };

  const duplicatePane = (id: string) => {
    if (panes.length >= 6) {
      toast.warning('Pane limit reached', { description: 'Maximum of 6 panes' });
      return;
    }
    const src = panes.find((p) => p.id === id);
    if (!src) return;
    const idx = panes.findIndex((p) => p.id === id);
    const copy: Pane = { ...src, id: `p_${Date.now().toString(36)}`, minimized: false };
    const next = [...panes];
    next.splice(idx + 1, 0, copy);
    setPanes(next);
  };

  const removePane = (id: string) => {
    setPanes(panes.filter((p) => p.id !== id));
    if (maximizedId === id) setMaximizedId(null);
  };

  const toggleMinimize = (id: string) => {
    setPanes(panes.map((p) => (p.id === id ? { ...p, minimized: !p.minimized } : p)));
    if (maximizedId === id) setMaximizedId(null);
  };

  const setPaneType = (id: string, type: PaneType) => {
    setPanes(panes.map((p) => (p.id === id ? { ...p, type } : p)));
  };

  const movePane = (id: string, dir: -1 | 1) => {
    const idx = panes.findIndex((p) => p.id === id);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= panes.length) return;
    setPanes(arrayMove(panes, idx, next));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = panes.findIndex((p) => p.id === active.id);
      const newIndex = panes.findIndex((p) => p.id === over.id);
      if (oldIndex >= 0 && newIndex >= 0) setPanes(arrayMove(panes, oldIndex, newIndex));
    }
  };

  // ------------ data import / export ------------
  const exportData = (type: 'missions' | 'waypoints' | 'notes' | 'all') => {
    let data: any;
    let filename: string;

    if (type === 'missions') {
      data = missionLogs;
      filename = `missions_${new Date().toISOString().split('T')[0]}.json`;
    } else if (type === 'waypoints') {
      data = waypoints;
      filename = `waypoints_${new Date().toISOString().split('T')[0]}.json`;
    } else if (type === 'notes') {
      data = notes;
      filename = `field_notes_${new Date().toISOString().split('T')[0]}.txt`;
    } else {
      data = { missionLogs, waypoints, notes, exportedAt: new Date().toISOString() };
      filename = `workspace_export_${new Date().toISOString().split('T')[0]}.json`;
    }

    const blob =
      type === 'notes'
        ? new Blob([data], { type: 'text/plain' })
        : new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Export Complete', { description: `${filename} downloaded` });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        if (data.missionLogs && data.waypoints && data.notes !== undefined) {
          setMissionLogs(data.missionLogs);
          setWaypoints(data.waypoints);
          setNotes(data.notes);
          toast.success('Import Complete', { description: 'All workspace data imported' });
        } else if (Array.isArray(data) && data.length && data[0].status !== undefined) {
          setMissionLogs((prev) => [...data, ...prev]);
          toast.success('Import Complete', { description: `${data.length} mission logs` });
        } else if (Array.isArray(data) && data.length && data[0].lat !== undefined) {
          setWaypoints((prev) => [...prev, ...data]);
          toast.success('Import Complete', { description: `${data.length} waypoints` });
        } else {
          toast.error('Import Failed', { description: 'Unrecognized file format' });
        }
      } catch {
        toast.error('Import Failed', { description: 'Invalid JSON file' });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ------------ data mutations ------------
  const addMissionLog = () => {
    const newLog: MissionLog = {
      id: Math.random().toString(36).substring(2, 9),
      title: `Mission ${missionLogs.length + 1}`,
      description: 'New mission entry - click to edit',
      timestamp: Date.now(),
      status: 'pending',
      priority: 'medium',
    };
    setMissionLogs([newLog, ...missionLogs]);
  };

  const addWaypoint = () => {
    const newWaypoint: Waypoint = {
      id: Math.random().toString(36).substring(2, 9),
      name: `Waypoint ${waypoints.length + 1}`,
      lat: 9.0 + Math.random() * 0.1,
      lng: 38.75 + Math.random() * 0.1,
      timestamp: Date.now(),
    };
    setWaypoints([...waypoints, newWaypoint]);
  };

  const updateLogStatus = (id: string, status: MissionLog['status']) => {
    setMissionLogs(missionLogs.map((log) => (log.id === id ? { ...log, status } : log)));
  };

  const deleteLog = (id: string) =>
    setMissionLogs(missionLogs.filter((log) => log.id !== id));
  const deleteWaypoint = (id: string) =>
    setWaypoints(waypoints.filter((wp) => wp.id !== id));

  // ------------ pane content ------------
  const renderPanelContent = (panel: PaneType) => {
    switch (panel) {
      case 'missions':
        return (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-sentry-primary flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Mission Logs
              </h2>
              <div className="flex gap-1">
                <button
                  onClick={() => exportData('missions')}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-sentry-accent/50 hover:bg-sentry-accent/20 text-sentry-accent"
                  title="Export Missions"
                >
                  <Download className="h-3 w-3" />
                </button>
                <button
                  onClick={addMissionLog}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-sentry-primary/50 hover:bg-sentry-primary/20 text-sentry-accent"
                >
                  <Plus className="h-3 w-3" /> Add
                </button>
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-2 pr-2">
                {missionLogs.length === 0 ? (
                  <p className="text-sentry-text/50 text-sm italic">No mission logs yet</p>
                ) : (
                  missionLogs.map((log) => (
                    <div
                      key={log.id}
                      className={cn(
                        'p-3 rounded border transition-colors',
                        log.status === 'completed' && 'border-green-500/30 bg-green-500/5',
                        log.status === 'active' && 'border-sentry-primary/30 bg-sentry-primary/5',
                        log.status === 'pending' && 'border-yellow-500/30 bg-yellow-500/5',
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sentry-text">{log.title}</span>
                            <span
                              className={cn(
                                'text-[10px] px-1.5 py-0.5 rounded uppercase',
                                log.priority === 'high' && 'bg-red-500/20 text-red-400',
                                log.priority === 'medium' && 'bg-yellow-500/20 text-yellow-400',
                                log.priority === 'low' && 'bg-green-500/20 text-green-400',
                              )}
                            >
                              {log.priority}
                            </span>
                          </div>
                          <p className="text-xs text-sentry-text/60 mt-1">{log.description}</p>
                          <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <select
                            value={log.status}
                            onChange={(e) =>
                              updateLogStatus(log.id, e.target.value as MissionLog['status'])
                            }
                            className="text-[10px] bg-transparent border border-border/50 rounded px-1 py-0.5 text-sentry-text"
                          >
                            <option value="pending">Pending</option>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                          </select>
                          <button
                            onClick={() => deleteLog(log.id)}
                            className="p-1 hover:bg-red-500/20 rounded text-red-400"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        );

      case 'waypoints':
        return (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-sentry-primary flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Waypoints
              </h2>
              <div className="flex gap-1">
                <button
                  onClick={() => exportData('waypoints')}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-sentry-accent/50 hover:bg-sentry-accent/20 text-sentry-accent"
                  title="Export Waypoints"
                >
                  <Download className="h-3 w-3" />
                </button>
                <button
                  onClick={addWaypoint}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-sentry-primary/50 hover:bg-sentry-primary/20 text-sentry-accent"
                >
                  <Plus className="h-3 w-3" /> Add
                </button>
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-2 pr-2">
                {waypoints.length === 0 ? (
                  <p className="text-sentry-text/50 text-sm italic">No waypoints saved</p>
                ) : (
                  waypoints.map((wp, index) => (
                    <div
                      key={wp.id}
                      className="p-3 rounded border border-sentry-accent/30 bg-sentry-accent/5"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono bg-sentry-primary/20 text-sentry-primary px-1.5 rounded">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <span className="font-medium text-sentry-text">{wp.name}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground font-mono">
                            <span>LAT: {wp.lat.toFixed(6)}</span>
                            <span>LNG: {wp.lng.toFixed(6)}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteWaypoint(wp.id)}
                          className="p-1 hover:bg-red-500/20 rounded text-red-400"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        );

      case 'notes':
        return (
          <div className="h-full flex flex-col">
            <h2 className="text-base font-semibold text-sentry-primary flex items-center gap-2 mb-3">
              <Folder className="h-4 w-4" />
              Field Notes
            </h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter field notes here... (auto-saved offline)"
              className="flex-1 w-full bg-background/50 border border-border/50 rounded p-3 text-sm text-sentry-text placeholder:text-muted-foreground resize-none focus:outline-none focus:border-sentry-primary/50"
            />
            <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Auto-saved locally for offline access
            </div>
          </div>
        );
    }
  };

  // ------------ pane wrapper (header + sortable) ------------
  // Defined inside Workspace but memoized via render-stable closures so dnd-kit
  // and react-resizable-panels keep their internal state across re-renders.
  const renderPaneHeader = (pane: Pane, index: number, total: number, dragHandleProps?: any) => (
    <div className="flex items-center justify-between gap-2 px-2 py-1 border-b border-border/40 bg-card/40">
      <div className="flex items-center gap-1 min-w-0">
        <button
          {...dragHandleProps}
          className="p-1 cursor-move text-muted-foreground hover:text-sentry-primary"
          title="Drag to reorder"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <select
          value={pane.type}
          onChange={(e) => setPaneType(pane.id, e.target.value as PaneType)}
          className="text-[11px] bg-transparent border border-border/50 rounded px-1 py-0.5 text-sentry-primary font-display uppercase tracking-wider"
        >
          {(Object.keys(PANE_LABELS) as PaneType[]).map((k) => (
            <option key={k} value={k}>
              {PANE_LABELS[k]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => movePane(pane.id, -1)}
          disabled={index === 0}
          className="p-1 rounded hover:bg-sentry-primary/20 text-muted-foreground hover:text-sentry-primary disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move"
        >
          <ChevronLeft className="h-3 w-3" />
        </button>
        <button
          onClick={() => movePane(pane.id, 1)}
          disabled={index === total - 1}
          className="p-1 rounded hover:bg-sentry-primary/20 text-muted-foreground hover:text-sentry-primary disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move"
        >
          <ChevronRight className="h-3 w-3" />
        </button>
        <button
          onClick={() => duplicatePane(pane.id)}
          className="p-1 rounded hover:bg-sentry-primary/20 text-muted-foreground hover:text-sentry-primary"
          title="Duplicate / split"
        >
          <Plus className="h-3 w-3" />
        </button>
        <button
          onClick={() => toggleMinimize(pane.id)}
          className="p-1 rounded hover:bg-sentry-primary/20 text-muted-foreground hover:text-sentry-primary"
          title="Minimize"
        >
          <Minimize2 className="h-3 w-3" />
        </button>
        <button
          onClick={() => setMaximizedId(maximizedId === pane.id ? null : pane.id)}
          className="p-1 rounded hover:bg-sentry-accent/20 text-muted-foreground hover:text-sentry-accent"
          title="Maximize"
        >
          <Maximize2 className="h-3 w-3" />
        </button>
        <button
          onClick={() => removePane(pane.id)}
          className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400"
          title="Close"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );

  const SortablePane: React.FC<{ pane: Pane; index: number; total: number }> = ({
    pane,
    index,
    total,
  }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
      useSortable({ id: pane.id });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'sentry-panel h-full rounded-lg flex flex-col overflow-hidden',
          isDragging && 'opacity-60 ring-2 ring-sentry-primary/50',
        )}
      >
        {renderPaneHeader(pane, index, total, { ...attributes, ...listeners })}
        <div className="flex-1 p-3 overflow-hidden">{renderPanelContent(pane.type)}</div>
      </div>
    );
  };

  // ------------ render ------------
  const visiblePanes = panes.filter((p) => !p.minimized);
  const minimizedPanes = panes.filter((p) => p.minimized);
  const maximizedPane = maximizedId ? panes.find((p) => p.id === maximizedId) : null;

  return (
    <div className="min-h-screen h-screen bg-sentry-background p-4 flex flex-col">
      <OfflineIndicator />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-sentry-accent hover:text-sentry-primary transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </div>
        <h1
          style={{ fontFamily: 'Algerian, "Times New Roman", serif' }}
          className="text-2xl text-sentry-primary"
        >
          WORKSPACE
        </h1>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-sentry-primary/50 hover:bg-sentry-primary/20 text-sentry-primary"
          >
            <Upload className="h-4 w-4" />
            Import
          </button>
          <button
            onClick={() => exportData('all')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-sentry-accent/50 hover:bg-sentry-accent/20 text-sentry-accent"
          >
            <Download className="h-4 w-4" />
            Export All
          </button>
          <Link
            to="/settings"
            className="text-sentry-accent hover:text-sentry-primary transition-colors p-1.5"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* Pane control bar */}
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-muted-foreground font-mono">PANES:</span>
          <span className="text-[10px] text-sentry-primary font-mono">
            {visiblePanes.length} active{minimizedPanes.length > 0 && ` · ${minimizedPanes.length} min`}
          </span>
          <button
            onClick={() => addPane('notes')}
            className="flex items-center gap-1 px-2 py-1 text-[11px] rounded border border-sentry-primary/50 hover:bg-sentry-primary/20 text-sentry-primary"
          >
            <Plus className="h-3 w-3" /> Add Pane
          </button>
          <div className="flex items-center gap-0.5 ml-1 border border-border/40 rounded overflow-hidden">
            <button
              onClick={() => setSplitDir('horizontal')}
              className={cn(
                'px-2 py-1 text-[10px] font-mono transition-colors',
                splitDir === 'horizontal'
                  ? 'bg-sentry-primary/30 text-sentry-primary'
                  : 'text-muted-foreground hover:bg-muted/30',
              )}
              title="Split horizontally (side by side)"
            >
              ⇋ H-SPLIT
            </button>
            <button
              onClick={() => setSplitDir('vertical')}
              className={cn(
                'px-2 py-1 text-[10px] font-mono transition-colors',
                splitDir === 'vertical'
                  ? 'bg-sentry-primary/30 text-sentry-primary'
                  : 'text-muted-foreground hover:bg-muted/30',
              )}
              title="Split vertically (stacked)"
            >
              ⇵ V-SPLIT
            </button>
          </div>
        </div>

        {/* Minimized pane chips */}
        {minimizedPanes.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] text-muted-foreground font-mono">RESTORE:</span>
            {minimizedPanes.map((p) => (
              <button
                key={p.id}
                onClick={() => toggleMinimize(p.id)}
                className="flex items-center gap-1 px-2 py-0.5 text-[10px] rounded bg-muted/30 border border-border/40 text-muted-foreground hover:bg-sentry-primary/20 hover:text-sentry-primary font-mono"
              >
                <Maximize2 className="h-2.5 w-2.5" />
                {PANE_LABELS[p.type]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Workspace area */}
      <div className="flex-1 overflow-hidden">
        {maximizedPane ? (
          <div className="sentry-panel h-full rounded-lg flex flex-col overflow-hidden">
            {renderPaneHeader(maximizedPane, 0, 1)}
            <div className="flex-1 p-3 overflow-hidden">
              {renderPanelContent(maximizedPane.type)}
            </div>
          </div>
        ) : visiblePanes.length === 0 ? (
          <div className="sentry-panel h-full rounded-lg flex items-center justify-center text-sm text-muted-foreground">
            No active panes — click <span className="text-sentry-primary mx-1">Add Pane</span> or restore a minimized one.
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={visiblePanes.map((p) => p.id)} strategy={horizontalListSortingStrategy}>
              {/* key tied to layout shape forces ResizablePanelGroup to remount cleanly
                  when panes are added/removed/min/max — prevents stuck handles. */}
              <ResizablePanelGroup
                key={`${splitDir}-${visiblePanes.map((p) => p.id).join('|')}`}
                direction={splitDir}
                className="gap-1"
              >
                {visiblePanes.map((pane, idx) => (
                  <React.Fragment key={pane.id}>
                    {idx > 0 && <ResizableHandle withHandle />}
                    <ResizablePanel
                      defaultSize={100 / visiblePanes.length}
                      minSize={15}
                    >
                      <SortablePane pane={pane} index={idx} total={visiblePanes.length} />
                    </ResizablePanel>
                  </React.Fragment>
                ))}
              </ResizablePanelGroup>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <footer className="mt-3 text-center text-xs text-muted-foreground py-2 border-t border-border/40">
        B-THUNDER-01 WORKSPACE | YOD ALEF ENGINEERING COMPANY | All data saved locally for offline access
      </footer>
    </div>
  );
};

export default Workspace;
