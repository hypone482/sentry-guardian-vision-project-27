import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Folder, FileText, Settings, Clock, MapPin, CheckCircle, Split, Maximize2, Download } from 'lucide-react';
import OfflineIndicator from '@/components/OfflineIndicator';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

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

const Workspace: React.FC = () => {
  const [missionLogs, setMissionLogs] = useOfflineStorage<MissionLog[]>({
    key: 'missionLogs',
    defaultValue: []
  });
  
  const [waypoints, setWaypoints] = useOfflineStorage<Waypoint[]>({
    key: 'waypoints',
    defaultValue: []
  });

  const [splitMode, setSplitMode] = useState<'horizontal' | 'vertical' | 'single'>('horizontal');
  const [leftPanel, setLeftPanel] = useState<'missions' | 'waypoints' | 'notes'>('missions');
  const [rightPanel, setRightPanel] = useState<'waypoints' | 'notes' | 'missions'>('waypoints');
  const [notes, setNotes] = useOfflineStorage<string>({
    key: 'workspaceNotes',
    defaultValue: ''
  });

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

    const blob = type === 'notes' 
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

  const addMissionLog = () => {
    const newLog: MissionLog = {
      id: Math.random().toString(36).substring(2, 9),
      title: `Mission ${missionLogs.length + 1}`,
      description: 'New mission entry - click to edit',
      timestamp: Date.now(),
      status: 'pending',
      priority: 'medium'
    };
    setMissionLogs([newLog, ...missionLogs]);
  };

  const addWaypoint = () => {
    const newWaypoint: Waypoint = {
      id: Math.random().toString(36).substring(2, 9),
      name: `Waypoint ${waypoints.length + 1}`,
      lat: 9.0 + Math.random() * 0.1,
      lng: 38.75 + Math.random() * 0.1,
      timestamp: Date.now()
    };
    setWaypoints([...waypoints, newWaypoint]);
  };

  const updateLogStatus = (id: string, status: MissionLog['status']) => {
    setMissionLogs(missionLogs.map(log => 
      log.id === id ? { ...log, status } : log
    ));
  };

  const deleteLog = (id: string) => {
    setMissionLogs(missionLogs.filter(log => log.id !== id));
  };

  const deleteWaypoint = (id: string) => {
    setWaypoints(waypoints.filter(wp => wp.id !== id));
  };

  const renderPanelContent = (panel: 'missions' | 'waypoints' | 'notes') => {
    switch (panel) {
      case 'missions':
        return (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-sentry-primary flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Mission Logs
              </h2>
              <div className="flex gap-1">
                <button
                  onClick={() => exportData('missions')}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-sentry-accent/50 hover:bg-sentry-accent/20 text-sentry-accent transition-colors"
                  title="Export Missions"
                >
                  <Download className="h-3 w-3" />
                </button>
                <button
                  onClick={addMissionLog}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-sentry-primary/50 hover:bg-sentry-primary/20 text-sentry-accent transition-colors"
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
                  missionLogs.map(log => (
                    <div
                      key={log.id}
                      className={cn(
                        "p-3 rounded border transition-colors",
                        log.status === 'completed' && "border-green-500/30 bg-green-500/5",
                        log.status === 'active' && "border-sentry-primary/30 bg-sentry-primary/5",
                        log.status === 'pending' && "border-yellow-500/30 bg-yellow-500/5"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sentry-text">{log.title}</span>
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded uppercase",
                              log.priority === 'high' && "bg-red-500/20 text-red-400",
                              log.priority === 'medium' && "bg-yellow-500/20 text-yellow-400",
                              log.priority === 'low' && "bg-green-500/20 text-green-400"
                            )}>
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
                            onChange={(e) => updateLogStatus(log.id, e.target.value as MissionLog['status'])}
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-sentry-primary flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Waypoints
              </h2>
              <div className="flex gap-1">
                <button
                  onClick={() => exportData('waypoints')}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-sentry-accent/50 hover:bg-sentry-accent/20 text-sentry-accent transition-colors"
                  title="Export Waypoints"
                >
                  <Download className="h-3 w-3" />
                </button>
                <button
                  onClick={addWaypoint}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-sentry-primary/50 hover:bg-sentry-primary/20 text-sentry-accent transition-colors"
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
            <h2 className="text-lg font-semibold text-sentry-primary flex items-center gap-2 mb-4">
              <Folder className="h-5 w-5" />
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

  return (
    <div className="min-h-screen h-screen bg-sentry-background p-4 flex flex-col">
      <OfflineIndicator />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
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
          {/* Export All Button */}
          <button
            onClick={() => exportData('all')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-sentry-accent/50 hover:bg-sentry-accent/20 text-sentry-accent transition-colors"
          >
            <Download className="h-4 w-4" />
            Export All
          </button>
          
          {/* Split Mode Toggle */}
          <div className="flex items-center gap-1 border border-border/50 rounded p-0.5">
            <button
              onClick={() => setSplitMode('single')}
              className={cn(
                "p-1.5 rounded transition-colors",
                splitMode === 'single' ? "bg-sentry-primary/20 text-sentry-primary" : "text-muted-foreground hover:text-sentry-accent"
              )}
              title="Single View"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setSplitMode('horizontal')}
              className={cn(
                "p-1.5 rounded transition-colors",
                splitMode === 'horizontal' ? "bg-sentry-primary/20 text-sentry-primary" : "text-muted-foreground hover:text-sentry-accent"
              )}
              title="Horizontal Split"
            >
              <Split className="h-4 w-4" />
            </button>
            <button
              onClick={() => setSplitMode('vertical')}
              className={cn(
                "p-1.5 rounded transition-colors rotate-90",
                splitMode === 'vertical' ? "bg-sentry-primary/20 text-sentry-primary" : "text-muted-foreground hover:text-sentry-accent"
              )}
              title="Vertical Split"
            >
              <Split className="h-4 w-4" />
            </button>
          </div>
          <Link 
            to="/settings" 
            className="text-sentry-accent hover:text-sentry-primary transition-colors p-1.5"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* Panel Selectors */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">LEFT:</span>
          <select
            value={leftPanel}
            onChange={(e) => setLeftPanel(e.target.value as any)}
            className="text-xs bg-background border border-border/50 rounded px-2 py-1 text-sentry-text"
          >
            <option value="missions">Missions</option>
            <option value="waypoints">Waypoints</option>
            <option value="notes">Notes</option>
          </select>
        </div>
        {splitMode !== 'single' && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">RIGHT:</span>
            <select
              value={rightPanel}
              onChange={(e) => setRightPanel(e.target.value as any)}
              className="text-xs bg-background border border-border/50 rounded px-2 py-1 text-sentry-text"
            >
              <option value="missions">Missions</option>
              <option value="waypoints">Waypoints</option>
              <option value="notes">Notes</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Workspace Area - Split Screen */}
      <div className="flex-1 overflow-hidden">
        {splitMode === 'single' ? (
          <div className="sentry-panel p-4 h-full rounded-lg">
            {renderPanelContent(leftPanel)}
          </div>
        ) : (
          <ResizablePanelGroup direction={splitMode === 'horizontal' ? 'horizontal' : 'vertical'}>
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="sentry-panel p-4 h-full rounded-lg mr-1">
                {renderPanelContent(leftPanel)}
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="sentry-panel p-4 h-full rounded-lg ml-1">
                {renderPanelContent(rightPanel)}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-4 text-center text-xs text-muted-foreground py-2 border-t border-border/40">
        B-THUNDER-01 WORKSPACE | YOD ALEF ENGINEERING COMPANY | All data saved locally for offline access
      </footer>
    </div>
  );
};

export default Workspace;
