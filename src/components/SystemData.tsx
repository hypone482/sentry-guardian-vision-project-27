
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { BarChart, BarChart2, PieChartIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SystemDataProps {
  detectionData: {
    timestamp: Date;
    count: number;
  }[];
}

const SystemData: React.FC<SystemDataProps> = ({ detectionData }) => {
  // Prepare data for pie chart
  const pieData = [
    { name: 'Moving', value: 65 },
    { name: 'Stationary', value: 25 },
    { name: 'Unknown', value: 10 },
  ];
  
  const COLORS = ['#00FF00', '#FFBB28', '#0099FF'];

  return (
    <div className="sentry-panel flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <BarChart className="h-4 w-4 text-sentry-accent" />
        <h2 className="sentry-title text-sm">DETECTION ANALYTICS</h2>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-sentry-border rounded p-2 bg-black/20">
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-1.5">
              <BarChart2 className="h-3 w-3 text-sentry-accent" />
              <span>DETECTION OVER TIME</span>
            </div>
          </div>
          <div className="h-36 flex items-end justify-between gap-1 pr-3">
            {Array.from({ length: 12 }).map((_, index) => {
              const height = Math.random() * 80 + 10;
              return (
                <div 
                  key={index} 
                  className="w-full bg-sentry-primary/70 rounded-t"
                  style={{ height: `${height}%` }}
                ></div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
            <span>1h ago</span>
            <span>30m ago</span>
            <span>now</span>
          </div>
        </div>

        <div className="border border-sentry-border rounded p-2 bg-black/20">
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-1.5">
              <PieChartIcon className="h-3 w-3 text-sentry-accent" />
              <span>DETECTION TYPES</span>
            </div>
          </div>
          <div className="h-36 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={50}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 text-xs mt-1">
            {pieData.map((entry, index) => (
              <div key={index} className="flex items-center gap-1">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: COLORS[index] }}
                ></div>
                <span>{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 border border-sentry-border rounded p-2 bg-black/20">
        <div className="flex items-center justify-between text-xs mb-1">
          <span>CURRENT STATUS</span>
          <span className="text-sentry-primary">OPERATIONAL</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex flex-col">
            <span className="text-muted-foreground">OBJECTS TRACKED</span>
            <span className="font-mono text-sentry-accent">34</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">ACTIVE ZONES</span>
            <span className="font-mono text-sentry-accent">3/4</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">ALERTS</span>
            <span className="font-mono text-yellow-500">2</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemData;
