import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, Monitor, CheckCircle, Radar, WifiOff } from "lucide-react";
import logo from "@/assets/logo.png";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Logo */}
        <div className="flex justify-center">
          <img 
            src={logo} 
            alt="YOD ALEF Engineering Logo" 
            className="w-24 h-28 object-contain"
            style={{ filter: 'brightness(1.3) contrast(1.15)' }}
          />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 
            style={{ fontFamily: 'Algerian, "Times New Roman", serif' }}
            className="text-3xl font-bold text-primary tracking-tight"
          >
            B-THUNDER-01
          </h1>
          <p className="text-muted-foreground text-sm">
            YOD ALEF Engineering Company
          </p>
          <p className="text-muted-foreground text-xs">
            Advanced surveillance and monitoring system
          </p>
        </div>
        
        {/* Offline Badge */}
        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-lg">
          <WifiOff className="w-4 h-4 text-primary" />
          <span className="text-sm text-primary font-medium">Works Offline</span>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-4 py-6">
          <div className="p-4 rounded-lg bg-card border border-border">
            <Monitor className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Real-time Video</p>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border">
            <Radar className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Radar Tracking</p>
          </div>
        </div>

        {/* Install Status */}
        {isInstalled ? (
          <div className="p-6 rounded-lg bg-primary/10 border border-primary/30">
            <CheckCircle className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Already Installed!
            </h2>
            <p className="text-muted-foreground text-sm">
              B-THUNDER-01 is ready to use on your device.
            </p>
            <Button
              className="mt-4"
              onClick={() => (window.location.href = "/")}
            >
              Open App
            </Button>
          </div>
        ) : isIOS ? (
          <div className="p-6 rounded-lg bg-card border border-border">
            <Smartphone className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Install on iOS
            </h2>
            <ol className="text-left text-sm text-muted-foreground space-y-2 mt-4">
              <li className="flex items-start gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">
                  1
                </span>
                <span>Tap the Share button in Safari</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">
                  2
                </span>
                <span>Scroll down and tap "Add to Home Screen"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">
                  3
                </span>
                <span>Tap "Add" to confirm</span>
              </li>
            </ol>
          </div>
        ) : deferredPrompt ? (
          <Button
            size="lg"
            className="w-full gap-2"
            onClick={handleInstall}
          >
            <Download className="w-5 h-5" />
            Install App
          </Button>
        ) : (
          <div className="p-6 rounded-lg bg-card border border-border">
            <p className="text-muted-foreground text-sm">
              Open this page in Chrome, Edge, or Safari to install the app.
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => (window.location.href = "/")}
            >
              Continue to App
            </Button>
          </div>
        )}

        {/* System Requirements */}
        <p className="text-xs text-muted-foreground">
          Full offline support • All features work without internet • Requires camera permission
        </p>
      </div>
    </div>
  );
};

export default Install;
