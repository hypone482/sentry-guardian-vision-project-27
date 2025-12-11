import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Folder, FileText, Settings } from 'lucide-react';
import OfflineIndicator from '@/components/OfflineIndicator';

const Workspace: React.FC = () => {
  return (
    <div className="min-h-screen bg-sentry-background p-6">
      <OfflineIndicator />
      
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link 
              to="/" 
              className="flex items-center gap-2 text-sentry-accent hover:text-sentry-primary transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
          <h1 
            style={{ fontFamily: 'Algerian, "Times New Roman", serif' }}
            className="text-3xl text-sentry-primary"
          >
            WORKSPACE
          </h1>
          <Link 
            to="/settings" 
            className="text-sentry-accent hover:text-sentry-primary transition-colors"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>

        {/* Workspace Content Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="sentry-panel p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-sentry-primary mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Quick Actions
            </h2>
            <div className="space-y-3">
              <button className="w-full p-3 text-left rounded border border-sentry-primary/30 hover:bg-sentry-primary/10 transition-colors text-sentry-text">
                New Mission Log
              </button>
              <button className="w-full p-3 text-left rounded border border-sentry-primary/30 hover:bg-sentry-primary/10 transition-colors text-sentry-text">
                Create Report
              </button>
              <button className="w-full p-3 text-left rounded border border-sentry-primary/30 hover:bg-sentry-primary/10 transition-colors text-sentry-text">
                Add Waypoint
              </button>
            </div>
          </div>

          {/* Recent Files */}
          <div className="sentry-panel p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-sentry-primary mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Files
            </h2>
            <div className="space-y-2 text-sentry-text/70 text-sm">
              <p className="italic">No recent files</p>
            </div>
          </div>

          {/* Projects */}
          <div className="sentry-panel p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-sentry-primary mb-4 flex items-center gap-2">
              <Folder className="h-5 w-5" />
              Projects
            </h2>
            <div className="space-y-2 text-sentry-text/70 text-sm">
              <p className="italic">No projects yet</p>
            </div>
          </div>
        </div>

        {/* Main Workspace Area */}
        <div className="mt-8 sentry-panel p-8 rounded-lg min-h-[400px] flex items-center justify-center">
          <div className="text-center text-sentry-text/50">
            <Folder className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Workspace Ready</p>
            <p className="text-sm mt-2">Use this area for additional work and operations</p>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-xs text-muted-foreground py-4 border-t border-border/40">
          B-THUNDER-01 WORKSPACE | YOD ALEF ENGINEERING COMPANY
        </footer>
      </div>
    </div>
  );
};

export default Workspace;
