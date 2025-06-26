import { useEffect, useState } from "react";
import { apiService } from "@/services/apiService";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Loader2, Cloud } from "lucide-react";
import { getEnvironmentInfo } from "@/lib/apiConfig";

export function BackendStatus() {
  const [status, setStatus] = useState<
    "checking" | "online" | "offline" | "demo"
  >("checking");
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const envInfo = getEnvironmentInfo();

  const checkBackendStatus = async () => {
    try {
      const response = await apiService.healthCheck();
      if (envInfo.shouldUseMock) {
        setStatus("demo");
      } else {
        setStatus(response.success ? "online" : "offline");
      }
      setLastCheck(new Date());
    } catch (error) {
      setStatus(envInfo.shouldUseMock ? "demo" : "offline");
      setLastCheck(new Date());
    }
  };

  useEffect(() => {
    checkBackendStatus();

    // Check status every 30 seconds
    const interval = setInterval(checkBackendStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = () => {
    switch (status) {
      case "checking":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Checking...
          </Badge>
        );
      case "demo":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700">
            <Cloud className="h-3 w-3 mr-1" />
            Demo Mode
          </Badge>
        );
      case "online":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            Backend Online
          </Badge>
        );
      case "offline":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Backend Offline
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {getStatusBadge()}
      {lastCheck && (
        <span className="text-xs text-gray-500">
          {lastCheck.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
