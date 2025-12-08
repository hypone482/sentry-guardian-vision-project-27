import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Volume2, VolumeX, Camera, Eye, Bell, Save, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Settings {
  // Detection settings
  sensitivity: number;
  motionThreshold: number;
  detectionDelay: number;
  
  // Alert settings
  soundEnabled: boolean;
  soundVolume: number;
  alertSound: 'beep' | 'alarm' | 'chime';
  vibrationEnabled: boolean;
  
  // Camera settings
  defaultCameraMode: 'normal' | 'night' | 'thermal' | 'enhanced';
  autoNightVision: boolean;
  showRangeFinder: boolean;
  showMinimap: boolean;
  showCoordinates: boolean;
  zoomLevel: number;
}

const defaultSettings: Settings = {
  sensitivity: 50,
  motionThreshold: 30,
  detectionDelay: 100,
  soundEnabled: true,
  soundVolume: 70,
  alertSound: 'beep',
  vibrationEnabled: true,
  defaultCameraMode: 'normal',
  autoNightVision: false,
  showRangeFinder: true,
  showMinimap: true,
  showCoordinates: true,
  zoomLevel: 1,
};

const Settings = () => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sentry-settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }
  }, []);

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const saveSettings = () => {
    localStorage.setItem('sentry-settings', JSON.stringify(settings));
    setHasChanges(false);
    toast.success('Settings saved', {
      description: 'Your preferences have been updated',
    });
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    setHasChanges(true);
    toast.info('Settings reset', {
      description: 'All settings restored to defaults',
    });
  };

  const playTestSound = () => {
    if (settings.soundEnabled) {
      // Create oscillator for test beep
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = settings.alertSound === 'beep' ? 800 : settings.alertSound === 'alarm' ? 440 : 1200;
      oscillator.type = settings.alertSound === 'alarm' ? 'sawtooth' : 'sine';
      gainNode.gain.value = settings.soundVolume / 100 * 0.3;
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
      
      toast.success('Test sound played');
    } else {
      toast.error('Sound is disabled');
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-sentry-background">
      <div className="sentry-scanline" />
      
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="outline" size="icon" className="border-border/50 bg-card/50">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-2xl text-sentry-primary tracking-wider uppercase">
              System Settings
            </h1>
            <p className="text-muted-foreground text-sm">Configure detection, alerts, and camera preferences</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Detection Settings */}
          <div className="sentry-panel">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="h-5 w-5 text-sentry-primary" />
              <h2 className="font-display text-lg text-sentry-primary tracking-wider uppercase">
                Detection Settings
              </h2>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm">Motion Sensitivity</Label>
                  <span className="text-sentry-accent text-sm font-mono">{settings.sensitivity}%</span>
                </div>
                <Slider
                  value={[settings.sensitivity]}
                  onValueChange={([v]) => updateSetting('sensitivity', v)}
                  min={10}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">Higher values detect smaller movements</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm">Motion Threshold</Label>
                  <span className="text-sentry-accent text-sm font-mono">{settings.motionThreshold}</span>
                </div>
                <Slider
                  value={[settings.motionThreshold]}
                  onValueChange={([v]) => updateSetting('motionThreshold', v)}
                  min={10}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">Minimum pixel difference to trigger detection</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm">Detection Delay</Label>
                  <span className="text-sentry-accent text-sm font-mono">{settings.detectionDelay}ms</span>
                </div>
                <Slider
                  value={[settings.detectionDelay]}
                  onValueChange={([v]) => updateSetting('detectionDelay', v)}
                  min={50}
                  max={500}
                  step={50}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">Time between frame analysis cycles</p>
              </div>
            </div>
          </div>

          {/* Alert Settings */}
          <div className="sentry-panel">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="h-5 w-5 text-sentry-secondary" />
              <h2 className="font-display text-lg text-sentry-secondary tracking-wider uppercase">
                Alert Settings
              </h2>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Sound Alerts</Label>
                  <p className="text-xs text-muted-foreground">Play audio on detection</p>
                </div>
                <div className="flex items-center gap-2">
                  {settings.soundEnabled ? (
                    <Volume2 className="h-4 w-4 text-sentry-primary" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Switch
                    checked={settings.soundEnabled}
                    onCheckedChange={(v) => updateSetting('soundEnabled', v)}
                  />
                </div>
              </div>

              {settings.soundEnabled && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-sm">Volume</Label>
                      <span className="text-sentry-accent text-sm font-mono">{settings.soundVolume}%</span>
                    </div>
                    <Slider
                      value={[settings.soundVolume]}
                      onValueChange={([v]) => updateSetting('soundVolume', v)}
                      min={10}
                      max={100}
                      step={10}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Alert Sound</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['beep', 'alarm', 'chime'] as const).map((sound) => (
                        <Button
                          key={sound}
                          variant={settings.alertSound === sound ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateSetting('alertSound', sound)}
                          className={settings.alertSound === sound ? 'bg-sentry-primary text-primary-foreground' : 'border-border/50'}
                        >
                          {sound.charAt(0).toUpperCase() + sound.slice(1)}
                        </Button>
                      ))}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={playTestSound}
                      className="text-sentry-accent hover:text-sentry-accent/80"
                    >
                      <Volume2 className="h-3 w-3 mr-1" />
                      Test Sound
                    </Button>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Vibration</Label>
                  <p className="text-xs text-muted-foreground">Haptic feedback on mobile</p>
                </div>
                <Switch
                  checked={settings.vibrationEnabled}
                  onCheckedChange={(v) => updateSetting('vibrationEnabled', v)}
                />
              </div>
            </div>
          </div>

          {/* Camera Settings */}
          <div className="sentry-panel">
            <div className="flex items-center gap-2 mb-4">
              <Camera className="h-5 w-5 text-sentry-accent" />
              <h2 className="font-display text-lg text-sentry-accent tracking-wider uppercase">
                Camera Settings
              </h2>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm">Default Camera Mode</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(['normal', 'night', 'thermal', 'enhanced'] as const).map((mode) => (
                    <Button
                      key={mode}
                      variant={settings.defaultCameraMode === mode ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateSetting('defaultCameraMode', mode)}
                      className={settings.defaultCameraMode === mode ? 'bg-sentry-accent text-accent-foreground' : 'border-border/50'}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Auto Night Vision</Label>
                  <p className="text-xs text-muted-foreground">Switch to night mode in low light</p>
                </div>
                <Switch
                  checked={settings.autoNightVision}
                  onCheckedChange={(v) => updateSetting('autoNightVision', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Show Range Finder</Label>
                  <p className="text-xs text-muted-foreground">Display distance measurements</p>
                </div>
                <Switch
                  checked={settings.showRangeFinder}
                  onCheckedChange={(v) => updateSetting('showRangeFinder', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Show Minimap</Label>
                  <p className="text-xs text-muted-foreground">Display target position overview</p>
                </div>
                <Switch
                  checked={settings.showMinimap}
                  onCheckedChange={(v) => updateSetting('showMinimap', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Show Coordinates</Label>
                  <p className="text-xs text-muted-foreground">Display position coordinates</p>
                </div>
                <Switch
                  checked={settings.showCoordinates}
                  onCheckedChange={(v) => updateSetting('showCoordinates', v)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm">Default Zoom Level</Label>
                  <span className="text-sentry-accent text-sm font-mono">{settings.zoomLevel.toFixed(1)}x</span>
                </div>
                <Slider
                  value={[settings.zoomLevel]}
                  onValueChange={([v]) => updateSetting('zoomLevel', v)}
                  min={1}
                  max={4}
                  step={0.5}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            <Button
              variant="outline"
              onClick={resetSettings}
              className="border-border/50"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
            <Button
              onClick={saveSettings}
              disabled={!hasChanges}
              className="bg-sentry-primary text-primary-foreground hover:bg-sentry-primary/80"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </div>

        <footer className="mt-8 text-center text-xs text-muted-foreground py-4 border-t border-border/40">
          SENTRY GUARDIAN TURRET SYSTEM v1.0 | <span className="text-sentry-accent">SETTINGS MODULE</span>
        </footer>
      </div>
    </div>
  );
};

export default Settings;
