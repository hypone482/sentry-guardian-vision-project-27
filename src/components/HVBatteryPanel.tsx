import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Battery, BatteryCharging, Zap, Thermometer, Shield, Activity, AlertTriangle, Power, Gauge, Cpu, Radio, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type PowerMode = 'endurance' | 'performance' | 'silent' | 'emergency';

interface CellData {
  id: number;
  voltage: number;
  temp: number;
  health: number;
}

interface SystemHealth {
  bms: number;
  inverter: number;
  dcdc: number;
  hvac: number;
  imd: number;
  contactor: number;
}

const HVBatteryPanel: React.FC<{ active?: boolean }> = ({ active = true }) => {
  const [soc, setSoc] = useState(78);
  const [soh, setSoh] = useState(96);
  const [packVoltage, setPackVoltage] = useState(672.4);
  const [current, setCurrent] = useState(-12.5);
  const [packTemp, setPackTemp] = useState(32);
  const [powerMode, setPowerMode] = useState<PowerMode>('endurance');
  const [charging, setCharging] = useState(false);
  const [chargeRate, setChargeRate] = useState(0);
  const [remainingRange, setRemainingRange] = useState(226);
  const [powerOutput, setPowerOutput] = useState(0);
  const [cells, setCells] = useState<CellData[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    bms: 98, inverter: 95, dcdc: 97, hvac: 92, imd: 100, contactor: 99
  });
  const [logs, setLogs] = useState<string[]>([]);
  const [view, setView] = useState<'main' | 'thermal' | 'cells' | 'power'>('main');

  // Initialize cells
  useEffect(() => {
    const initialCells: CellData[] = Array.from({ length: 96 }, (_, i) => ({
      id: i + 1,
      voltage: 3.6 + Math.random() * 0.4,
      temp: 28 + Math.random() * 12,
      health: 90 + Math.random() * 10,
    }));
    setCells(initialCells);
  }, []);

  // Simulate live data
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setSoc(prev => {
        const delta = charging ? 0.05 : -0.02;
        return Math.max(0, Math.min(100, prev + delta));
      });
      setPackVoltage(prev => prev + (Math.random() - 0.5) * 2);
      setCurrent(prev => charging ? Math.abs(prev) + (Math.random() - 0.5) : -(Math.random() * 30 + 5));
      setPackTemp(prev => Math.max(20, Math.min(55, prev + (Math.random() - 0.5) * 0.5)));
      setPowerOutput(Math.random() * 150 + 50);
      setChargeRate(charging ? Math.random() * 8 + 3 : 0);
      setRemainingRange(prev => Math.max(0, prev + (charging ? 0.3 : -0.05)));

      setCells(prev => prev.map(c => ({
        ...c,
        voltage: Math.max(3.0, Math.min(4.2, c.voltage + (Math.random() - 0.5) * 0.02)),
        temp: Math.max(20, Math.min(55, c.temp + (Math.random() - 0.5) * 0.3)),
      })));

      setSystemHealth(prev => ({
        bms: Math.max(80, Math.min(100, prev.bms + (Math.random() - 0.5) * 0.5)),
        inverter: Math.max(80, Math.min(100, prev.inverter + (Math.random() - 0.5) * 0.5)),
        dcdc: Math.max(80, Math.min(100, prev.dcdc + (Math.random() - 0.5) * 0.3)),
        hvac: Math.max(80, Math.min(100, prev.hvac + (Math.random() - 0.5) * 0.4)),
        imd: Math.max(90, Math.min(100, prev.imd + (Math.random() - 0.5) * 0.2)),
        contactor: Math.max(90, Math.min(100, prev.contactor + (Math.random() - 0.5) * 0.2)),
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, [active, charging]);

  // Add logs
  useEffect(() => {
    if (!active) return;
    const logInterval = setInterval(() => {
      const messages = [
        `BMS: Cell balancing active, ΔV=${(Math.random() * 0.05).toFixed(3)}V`,
        `IMD: Isolation resistance ${(Math.random() * 500 + 500).toFixed(0)}kΩ - OK`,
        `HVIL: Loop integrity verified`,
        `DC-DC: 48V rail stable at ${(47.5 + Math.random()).toFixed(1)}V`,
        `Thermal: Coolant flow ${(8 + Math.random() * 4).toFixed(1)} L/min`,
        `Contactor: Precharge complete, main closed`,
        `Inverter: IGBT temp ${(45 + Math.random() * 15).toFixed(0)}°C`,
      ];
      setLogs(prev => [
        `[${new Date().toLocaleTimeString()}] ${messages[Math.floor(Math.random() * messages.length)]}`,
        ...prev.slice(0, 15)
      ]);
    }, 3000);
    return () => clearInterval(logInterval);
  }, [active]);

  const modeConfig = {
    endurance: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', label: 'ENDURANCE', icon: Gauge, maxPower: 60 },
    performance: { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/50', label: 'PERFORMANCE', icon: Zap, maxPower: 100 },
    silent: { color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/50', label: 'SILENT OPS', icon: Volume2, maxPower: 30 },
    emergency: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', label: 'EMERGENCY', icon: AlertTriangle, maxPower: 100 },
  };

  const mode = modeConfig[powerMode];
  const socColor = soc > 60 ? 'text-emerald-400' : soc > 30 ? 'text-yellow-400' : 'text-red-400';
  const socBarColor = soc > 60 ? 'bg-emerald-500' : soc > 30 ? 'bg-yellow-500' : 'bg-red-500';
  const tempColor = packTemp > 45 ? 'text-red-400' : packTemp > 35 ? 'text-yellow-400' : 'text-emerald-400';

  const avgCellVoltage = useMemo(() => {
    if (!cells.length) return 0;
    return cells.reduce((s, c) => s + c.voltage, 0) / cells.length;
  }, [cells]);

  const maxCellTemp = useMemo(() => {
    if (!cells.length) return 0;
    return Math.max(...cells.map(c => c.temp));
  }, [cells]);

  const getCellColor = (temp: number) => {
    if (temp > 45) return 'bg-red-500';
    if (temp > 38) return 'bg-orange-500';
    if (temp > 32) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  const getHealthColor = (val: number) => {
    if (val >= 95) return 'text-emerald-400';
    if (val >= 85) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="h-full flex flex-col gap-1 p-1 text-[9px] font-mono overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <BatteryCharging className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-display text-primary tracking-wider">HV BATTERY SYSTEM</span>
          <span className="text-muted-foreground">400-800V</span>
        </div>
        <div className="flex items-center gap-1">
          {(['main', 'thermal', 'cells', 'power'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={cn("px-1.5 py-0.5 rounded border text-[8px] uppercase transition-colors",
                view === v ? 'bg-primary/20 text-primary border-primary/50' : 'border-border/50 text-muted-foreground hover:text-foreground'
              )}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === 'main' && (
        <>
          {/* Battery Visual + SOC */}
          <div className="flex items-center gap-3 p-2 rounded border border-border/50 bg-card/50">
            {/* Battery icon visual */}
            <div className="relative w-16 h-28 border-2 border-muted-foreground/50 rounded-lg overflow-hidden flex flex-col justify-end">
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-6 h-2 bg-muted-foreground/50 rounded-t" />
              <div className={cn("w-full transition-all duration-1000", socBarColor)}
                style={{ height: `${soc}%` }}>
                <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10" />
              </div>
              {charging && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-yellow-300 animate-pulse drop-shadow-lg" />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-1.5">
              <div className="flex items-baseline gap-1">
                <span className={cn("text-3xl font-bold tabular-nums", socColor)}>{soc.toFixed(1)}</span>
                <span className={cn("text-lg", socColor)}>%</span>
              </div>
              <div className="text-muted-foreground">
                {charging ? 'CHARGING' : 'DISCHARGING'} • SOH: <span className="text-foreground">{soh.toFixed(1)}%</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[8px]">
                <div>VOLTAGE: <span className="text-foreground">{packVoltage.toFixed(1)}V</span></div>
                <div>CURRENT: <span className={cn(current > 0 ? 'text-emerald-400' : 'text-orange-400')}>{Math.abs(current).toFixed(1)}A</span></div>
                <div>RANGE: <span className="text-foreground">{remainingRange.toFixed(0)} KM</span></div>
                <div>POWER: <span className="text-foreground">{powerOutput.toFixed(1)} kW</span></div>
                {charging && <div>CHARGE RATE: <span className="text-emerald-400">{chargeRate.toFixed(2)} kW</span></div>}
                {charging && <div>FINISH: <span className="text-foreground">{new Date(Date.now() + ((100 - soc) / chargeRate) * 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>}
              </div>
              <button onClick={() => setCharging(!charging)}
                className={cn("px-2 py-0.5 rounded border text-[8px] transition-colors mt-1",
                  charging ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' : 'border-border/50 text-muted-foreground hover:text-foreground'
                )}>
                {charging ? '⚡ CHARGING' : '○ START CHARGE'}
              </button>
            </div>
          </div>

          {/* Power Mode Selector */}
          <div className="p-1.5 rounded border border-border/50 bg-card/30">
            <div className="text-[8px] text-muted-foreground mb-1">POWER MODE</div>
            <div className="grid grid-cols-4 gap-1">
              {(Object.keys(modeConfig) as PowerMode[]).map(m => {
                const cfg = modeConfig[m];
                const Icon = cfg.icon;
                return (
                  <button key={m} onClick={() => setPowerMode(m)}
                    className={cn("flex flex-col items-center gap-0.5 p-1 rounded border text-[7px] transition-all",
                      powerMode === m ? `${cfg.bg} ${cfg.color} ${cfg.border}` : 'border-border/30 text-muted-foreground hover:text-foreground'
                    )}>
                    <Icon className="h-3 w-3" />
                    <span>{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-3 gap-1">
            <div className="p-1.5 rounded border border-border/50 bg-card/30 text-center">
              <Thermometer className={cn("h-3 w-3 mx-auto mb-0.5", tempColor)} />
              <div className={cn("text-sm font-bold", tempColor)}>{packTemp.toFixed(1)}°C</div>
              <div className="text-[7px] text-muted-foreground">PACK TEMP</div>
            </div>
            <div className="p-1.5 rounded border border-border/50 bg-card/30 text-center">
              <Activity className="h-3 w-3 mx-auto mb-0.5 text-accent" />
              <div className="text-sm font-bold text-foreground">{avgCellVoltage.toFixed(3)}V</div>
              <div className="text-[7px] text-muted-foreground">AVG CELL</div>
            </div>
            <div className="p-1.5 rounded border border-border/50 bg-card/30 text-center">
              <Shield className="h-3 w-3 mx-auto mb-0.5 text-primary" />
              <div className="text-sm font-bold text-foreground">{soh.toFixed(0)}%</div>
              <div className="text-[7px] text-muted-foreground">HEALTH</div>
            </div>
          </div>

          {/* System Health */}
          <div className="p-1.5 rounded border border-border/50 bg-card/30">
            <div className="text-[8px] text-muted-foreground mb-1">HV SYSTEM HEALTH</div>
            <div className="grid grid-cols-3 gap-x-3 gap-y-0.5 text-[8px]">
              {Object.entries(systemHealth).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-muted-foreground uppercase">{k}:</span>
                  <span className={getHealthColor(v)}>{v.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {view === 'thermal' && (
        <div className="p-1.5 rounded border border-border/50 bg-card/30 flex-1">
          <div className="text-[8px] text-muted-foreground mb-1.5">THERMAL MAP • {cells.length} CELLS • MAX {maxCellTemp.toFixed(1)}°C</div>
          <div className="grid grid-cols-12 gap-[2px]">
            {cells.map(c => (
              <div key={c.id} className={cn("h-3 rounded-[1px] transition-colors", getCellColor(c.temp))}
                style={{ opacity: 0.4 + (c.temp - 20) / 50 }}
                title={`Cell ${c.id}: ${c.temp.toFixed(1)}°C / ${c.voltage.toFixed(3)}V`} />
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[7px]">
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500 rounded-sm" /> &lt;32°C</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-yellow-500 rounded-sm" /> 32-38°C</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-orange-500 rounded-sm" /> 38-45°C</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-sm" /> &gt;45°C</div>
          </div>
        </div>
      )}

      {view === 'cells' && (
        <div className="p-1.5 rounded border border-border/50 bg-card/30 flex-1 overflow-y-auto">
          <div className="text-[8px] text-muted-foreground mb-1">CELL VOLTAGE MONITOR</div>
          <div className="flex items-end gap-[1px] h-24">
            {cells.map(c => {
              const pct = ((c.voltage - 3.0) / 1.2) * 100;
              const barColor = c.voltage > 4.0 ? 'bg-emerald-400' : c.voltage > 3.5 ? 'bg-emerald-500' : c.voltage > 3.2 ? 'bg-yellow-500' : 'bg-red-500';
              return (
                <div key={c.id} className={cn("flex-1 rounded-t-[1px] transition-all", barColor)}
                  style={{ height: `${pct}%` }}
                  title={`Cell ${c.id}: ${c.voltage.toFixed(3)}V`} />
              );
            })}
          </div>
          <div className="flex justify-between mt-1 text-[7px] text-muted-foreground">
            <span>Cell 1</span>
            <span>ΔV: {((Math.max(...cells.map(c => c.voltage)) - Math.min(...cells.map(c => c.voltage))) * 1000).toFixed(0)}mV</span>
            <span>Cell {cells.length}</span>
          </div>
        </div>
      )}

      {view === 'power' && (
        <div className="space-y-1 flex-1">
          {/* Power Flow Diagram */}
          <div className="p-1.5 rounded border border-border/50 bg-card/30">
            <div className="text-[8px] text-muted-foreground mb-1">POWER FLOW ARCHITECTURE</div>
            <div className="flex items-center justify-between text-[7px] gap-1">
              <div className="text-center p-1 rounded border border-emerald-500/30 bg-emerald-500/5 flex-1">
                <Power className="h-3 w-3 mx-auto text-emerald-400" />
                <div className="text-emerald-400 mt-0.5">CHARGE PORT</div>
                <div className="text-[7px]">OBC</div>
              </div>
              <span className="text-emerald-400">→</span>
              <div className="text-center p-1 rounded border border-primary/30 bg-primary/5 flex-1">
                <Battery className="h-3 w-3 mx-auto text-primary" />
                <div className="text-primary mt-0.5">HV BATTERY</div>
                <div className="text-[7px]">{packVoltage.toFixed(0)}V</div>
              </div>
              <span className="text-primary">→</span>
              <div className="text-center p-1 rounded border border-accent/30 bg-accent/5 flex-1">
                <Cpu className="h-3 w-3 mx-auto text-accent" />
                <div className="text-accent mt-0.5">HV DIST</div>
                <div className="text-[7px]">IMD/HVIL</div>
              </div>
              <span className="text-accent">→</span>
              <div className="text-center p-1 rounded border border-orange-500/30 bg-orange-500/5 flex-1">
                <Zap className="h-3 w-3 mx-auto text-orange-400" />
                <div className="text-orange-400 mt-0.5">INVERTER</div>
                <div className="text-[7px]">MOTOR</div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 mt-1.5 text-[7px]">
              <div className="text-center p-1 rounded border border-yellow-500/30 bg-yellow-500/5">
                <div className="text-yellow-400">DC-DC</div>
                <div>12/24/48V</div>
              </div>
              <div className="text-center p-1 rounded border border-blue-500/30 bg-blue-500/5">
                <div className="text-blue-400">HVAC</div>
                <div>PUMPS</div>
              </div>
              <div className="text-center p-1 rounded border border-purple-500/30 bg-purple-500/5">
                <Radio className="h-2.5 w-2.5 mx-auto text-purple-400" />
                <div className="text-purple-400">EDC</div>
                <div>CAN-FD</div>
              </div>
            </div>
          </div>

          {/* Data Log */}
          <div className="p-1.5 rounded border border-border/50 bg-card/30 flex-1 overflow-hidden">
            <div className="text-[8px] text-muted-foreground mb-1">SYSTEM LOG</div>
            <div className="space-y-0.5 text-[7px] max-h-28 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="text-muted-foreground font-mono">{log}</div>
              ))}
              {logs.length === 0 && <div className="text-muted-foreground italic">Waiting for data...</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HVBatteryPanel;
