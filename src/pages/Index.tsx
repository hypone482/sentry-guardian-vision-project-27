
import React, { useState, useEffect } from 'react';
import SentryHeader from '@/components/SentryHeader';
import VideoFeed from '@/components/VideoFeed';
import ControlPanel from '@/components/ControlPanel';
import EventLog, { LogEvent } from '@/components/EventLog';
import StatusPanel from '@/components/StatusPanel';
import SystemData from '@/components/SystemData';
import { toast } from '@/components/ui/sonner';

const Index = () => {
  const [systemActive, setSystemActive] = useState(false);
  const [sensitivity, setSensitivity] = useState(50);
  const [trackingMode, setTrackingMode] = useState<'passive' | 'active'>('passive');
  const [systemStatus, setSystemStatus] = useState<'active' | 'standby' | 'warning' | 'error'>('standby');
  const [logEvents, setLogEvents] = useState<LogEvent[]>([]);
  const [detectionData, setDetectionData] = useState<{ timestamp: Date; count: number }[]>([]);

  // Initialize system with startup logs
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
  
  // Monitor system status
  useEffect(() => {
    if (!systemActive) {
      setSystemStatus('standby');
      return;
    }
    
    setSystemStatus('active');
    
    // Randomly simulate warnings
    const warningInterval = setInterval(() => {
      if (Math.random() < 0.1) { // 10% chance of warning
        setSystemStatus('warning');
        
        // Log the warning
        addLogEvent({
          type: 'warning',
          message: 'Minor system anomaly detected. Monitoring...'
        });
        
        // Show toast notification
        toast.warning("System Warning", {
          description: "Minor system anomaly detected",
        });
        
        // Return to active after delay
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
        message: 'System activated. Surveillance mode engaged.'
      });
      
      toast.success("System Activated", {
        description: "Surveillance mode engaged",
      });
    } else {
      addLogEvent({
        type: 'info',
        message: 'System deactivated. Entering standby mode.'
      });
      
      toast.info("System Deactivated", {
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
    // Don't change system active state, just log and notify
    addLogEvent({
      type: 'info',
      message: 'System reset initiated. Recalibrating sensors.'
    });
    
    toast.info("System Reset", {
      description: "Recalibrating sensors",
    });
    
    // Simulate system reset
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
    
    // Add to detection data
    setDetectionData(prev => [
      ...prev, 
      { timestamp: new Date(), count: targets.length }
    ].slice(-20)); // Keep last 20 detections
    
    // Log significant motion
    if (targets.length > 0 && Math.random() < 0.3) { // Only log some detections to avoid spam
      addLogEvent({
        type: targets.length > 2 ? 'warning' : 'info',
        message: `Motion detected: ${targets.length} object${targets.length > 1 ? 's' : ''} identified.`
      });
      
      if (targets.length > 2) {
        toast.warning("Multiple Objects Detected", {
          description: `${targets.length} objects identified`,
        });
      }
    }
  };

  return (
    <div className="min-h-screen p-2 md:p-4 overflow-hidden relative bg-sentry-background">
      {/* Scanline effect */}
      <div className="sentry-scanline" />
      
      {/* Content Container */}
      <div className="max-w-7xl mx-auto flex flex-col h-[calc(100vh-2rem)]">
        <SentryHeader systemStatus={systemStatus} />
        
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 overflow-y-auto">
          {/* Camera Feed */}
          <div className="md:col-span-8 md:row-span-2">
            <VideoFeed 
              feedId="MAIN-01" 
              sensitivity={sensitivity}
              active={systemActive}
              onMotionDetected={handleMotionDetected}
            />
          </div>
          
          {/* Control Panel */}
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
          
          {/* Status Panel */}
          <div className="md:col-span-4">
            <StatusPanel systemActive={systemActive} />
          </div>
          
          {/* System Data */}
          <div className="md:col-span-6">
            <SystemData detectionData={detectionData} />
          </div>
          
          {/* Event Log */}
          <div className="md:col-span-6">
            <EventLog events={logEvents} />
          </div>
        </div>
        
        {/* Footer */}
        <footer className="mt-4 text-center text-xs text-muted-foreground py-2 border-t border-border/40">
          SENTRY GUARDIAN VISION SYSTEM v1.0 | <span className="text-sentry-accent">AUTHORIZED ACCESS ONLY</span>
        </footer>
      </div>
    </div>
  );
};

export default Index;
