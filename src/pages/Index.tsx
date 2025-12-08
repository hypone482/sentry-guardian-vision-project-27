import React, { useState, useEffect } from 'react';
import SentryHeader from '@/components/SentryHeader';
import VideoFeed from '@/components/VideoFeed';
import ControlPanel from '@/components/ControlPanel';
import EventLog, { LogEvent } from '@/components/EventLog';
import StatusPanel from '@/components/StatusPanel';
import SystemData from '@/components/SystemData';
import RadarDisplay from '@/components/RadarDisplay';
import { toast } from 'sonner';

const Index = () => {
  const [systemActive, setSystemActive] = useState(false);
  const [sensitivity, setSensitivity] = useState(50);
  const [trackingMode, setTrackingMode] = useState<'passive' | 'active'>('passive');
  const [systemStatus, setSystemStatus] = useState<'active' | 'standby' | 'warning' | 'error'>('standby');
  const [logEvents, setLogEvents] = useState<LogEvent[]>([]);
  const [detectionData, setDetectionData] = useState<{ timestamp: Date; count: number }[]>([]);

  useEffect(() => {
    const startupLogs: LogEvent[] = [
      {
        id: '1',
        timestamp: new Date(),
        type: 'info',
        message: 'System initialized. Welcome to Sentry Guardian.'
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 10000),
        type: 'info',
        message: 'Camera systems online. Awaiting activation.'
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 20000),
        type: 'info',
        message: 'Running system diagnostics...'
      },
      {
        id: '4',
        timestamp: new Date(Date.now() - 30000),
        type: 'success',
        message: 'Diagnostics complete. All systems nominal.'
      }
    ];
    
    setLogEvents(startupLogs);
  }, []);
  
  useEffect(() => {
    if (!systemActive) {
      setSystemStatus('standby');
      return;
    }
    
    setSystemStatus('active');
    toast.success("Turret System Activated", {
      description: "Monitoring mode engaged",
    });
    
    const warningInterval = setInterval(() => {
      if (Math.random() < 0.1) { // 10% chance of warning
        setSystemStatus('warning');
        
        addLogEvent({
          type: 'warning',
          message: 'Minor system anomaly detected. Monitoring...'
        });
        
        toast.warning("System Warning", {
          description: "Minor system anomaly detected",
        });
        
        setTimeout(() => {
          if (systemActive) {
            setSystemStatus('active');
          }
        }, 5000);
      }
    }, 30000);
    
    return () => clearInterval(warningInterval);
  }, [systemActive]);
  
  const addLogEvent = (event: Omit<LogEvent, 'id' | 'timestamp'>) => {
    const newEvent: LogEvent = {
      ...event,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date()
    };
    
    setLogEvents(prev => [newEvent, ...prev]);
  };

  const handleSystemActiveChange = (active: boolean) => {
    setSystemActive(active);
    
    if (active) {
      addLogEvent({
        type: 'success',
        message: 'Turret system activated. Surveillance mode engaged.'
      });
      
      toast.success("Turret System Activated", {
        description: "Surveillance mode engaged",
      });
    } else {
      addLogEvent({
        type: 'info',
        message: 'Turret system deactivated. Entering standby mode.'
      });
      
      toast.info("Turret System Deactivated", {
        description: "Entering standby mode",
      });
    }
  };

  const handleSensitivityChange = (value: number) => {
    setSensitivity(value);
    
    addLogEvent({
      type: 'info',
      message: `Detection sensitivity adjusted to ${value}%`
    });
  };

  const handleTrackingModeChange = (mode: 'passive' | 'active') => {
    setTrackingMode(mode);
    
    if (mode === 'active') {
      addLogEvent({
        type: 'warning',
        message: 'Active tracking engaged. System will follow detected motion.'
      });
      
      toast.warning("Tracking Mode Changed", {
        description: "Active tracking engaged",
      });
    } else {
      addLogEvent({
        type: 'info',
        message: 'Switched to passive monitoring. Tracking disabled.'
      });
    }
  };

  const handleSystemReset = () => {
    addLogEvent({
      type: 'info',
      message: 'System reset initiated. Recalibrating sensors.'
    });
    
    toast.info("System Reset", {
      description: "Recalibrating sensors",
    });
    
    if (systemActive) {
      setSystemStatus('warning');
      setTimeout(() => {
        if (systemActive) {
          setSystemStatus('active');
          addLogEvent({
            type: 'success',
            message: 'System reset complete. All parameters normalized.'
          });
        }
      }, 3000);
    }
  };

  const handleMotionDetected = (targets: any[]) => {
    if (!systemActive) return;
    
    setDetectionData(prev => [
      ...prev, 
      { timestamp: new Date(), count: targets.length }
    ].slice(-20));
    
    if (targets.length > 0 && Math.random() < 0.3) {
      addLogEvent({
        type: targets.length > 2 ? 'warning' : 'info',
        message: `Motion detected: ${targets.length} object${targets.length > 1 ? 's' : ''} identified.`
      });
      
      if (targets.length > 2) {
        toast.warning("Multiple Objects Detected", {
          description: `${targets.length} objects identified`,
        });
      }
      
      if (targets.some(t => t.locked)) {
        addLogEvent({
          type: 'warning',
          message: 'Target locked. Turret tracking engaged.'
        });
        
        toast.warning("Target Locked", {
          description: "Turret tracking engaged",
        });
      }
    }
  };

  return (
    <div className="min-h-screen p-2 md:p-4 overflow-hidden relative bg-sentry-background">
      <div className="sentry-scanline" />
      
      <div className="max-w-7xl mx-auto flex flex-col h-[calc(100vh-2rem)]">
        <SentryHeader systemStatus={systemStatus} />
        
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 overflow-y-auto">
          <div className="md:col-span-8 md:row-span-2">
            <VideoFeed 
              feedId="MAIN-01" 
              sensitivity={sensitivity}
              active={systemActive}
              onMotionDetected={handleMotionDetected}
            />
          </div>
          
          <div className="md:col-span-4">
            <ControlPanel 
              sensitivity={sensitivity}
              onSensitivityChange={handleSensitivityChange}
              systemActive={systemActive}
              onSystemActiveChange={handleSystemActiveChange}
              trackingMode={trackingMode}
              onTrackingModeChange={handleTrackingModeChange}
              onReset={handleSystemReset}
            />
          </div>
          
          <div className="md:col-span-4 flex flex-col gap-4">
            <StatusPanel systemActive={systemActive} />
            <RadarDisplay active={systemActive} />
          </div>
          
          <div className="md:col-span-8">
            <SystemData detectionData={detectionData} />
          </div>
          
          <div className="md:col-span-8">
            <EventLog events={logEvents} />
          </div>
        </div>
        
        <footer className="mt-4 text-center text-xs text-muted-foreground py-2 border-t border-border/40">
          SENTRY GUARDIAN TURRET SYSTEM v1.0 | <span className="text-sentry-accent">AUTHORIZED ACCESS ONLY</span>
        </footer>
      </div>
    </div>
  );
};

export default Index;
