import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { realApiService } from "@/services/realApiService";
import { shouldUseMockApi } from "@/lib/apiConfig";
import { mockApiService } from "@/services/mockApiService";

interface OperationResult {
  success: boolean;
  data?: any;
  error?: string;
}

export const useDashboardOperations = () => {
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const useMockApi = shouldUseMockApi();

  const setOperationLoading = (operation: string, loading: boolean) => {
    setIsLoading((prev) => ({ ...prev, [operation]: loading }));
  };

  const getApiService = () => {
    return useMockApi ? mockApiService : realApiService;
  };

  // Screen new wallet
  const screenNewWallet = async (
    address?: string,
  ): Promise<OperationResult> => {
    const operation = "screenWallet";
    setOperationLoading(operation, true);

    try {
      // If no address provided, prompt user
      const walletAddress =
        address || prompt("Enter wallet address to screen:");
      if (!walletAddress) {
        return { success: false, error: "Wallet address is required" };
      }

      const apiService = getApiService();
      let result;

      if (useMockApi) {
        result = await apiService.screenWallet(walletAddress);
      } else {
        result = await realApiService.screenWallet(walletAddress);
      }

      if (result.success) {
        const walletData = result.data;
        toast({
          title: "Wallet Screening Complete",
          description: `Risk Score: ${walletData?.riskScore || "N/A"} | Status: ${walletData?.isBlacklisted ? "High Risk" : "Clean"}`,
        });
        return { success: true, data: walletData };
      } else {
        toast({
          title: "Screening Failed",
          description: result.error || "Failed to screen wallet",
          variant: "destructive",
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    } finally {
      setOperationLoading(operation, false);
    }
  };

  // Generate STR Report
  const generateSTRReport = async (): Promise<OperationResult> => {
    const operation = "generateSTR";
    setOperationLoading(operation, true);

    try {
      const apiService = getApiService();
      let result;

      if (useMockApi) {
        result = await apiService.generateReport("STR");
      } else {
        result = await realApiService.prepareReport("STR");
      }

      if (result.success) {
        toast({
          title: "STR Report Generated",
          description:
            "Suspicious Transaction Report has been prepared for review",
        });
        return { success: true, data: result.data };
      } else {
        toast({
          title: "Report Generation Failed",
          description: result.error || "Failed to generate STR report",
          variant: "destructive",
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    } finally {
      setOperationLoading(operation, false);
    }
  };

  // Run sanction check
  const runSanctionCheck = async (
    address?: string,
  ): Promise<OperationResult> => {
    const operation = "sanctionCheck";
    setOperationLoading(operation, true);

    try {
      const walletAddress =
        address || prompt("Enter wallet address for sanction screening:");
      if (!walletAddress) {
        return { success: false, error: "Wallet address is required" };
      }

      const apiService = getApiService();
      let result;

      if (useMockApi) {
        result = await apiService.screenSanctions(walletAddress);
      } else {
        result = await realApiService.runSanctionCheck(walletAddress);
      }

      if (result.success) {
        const sanctions = result.data || [];
        if (sanctions.length > 0) {
          toast({
            title: "⚠️ Sanctions Match Found",
            description: `${sanctions.length} sanction(s) found for this address`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "✅ Clean Screening",
            description: "No sanctions matches found",
          });
        }
        return { success: true, data: sanctions };
      } else {
        toast({
          title: "Sanction Check Failed",
          description: result.error || "Failed to perform sanction screening",
          variant: "destructive",
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    } finally {
      setOperationLoading(operation, false);
    }
  };

  // Trace transaction
  const traceTransaction = async (hash?: string): Promise<OperationResult> => {
    const operation = "traceTransaction";
    setOperationLoading(operation, true);

    try {
      const transactionHash =
        hash || prompt("Enter transaction hash or wallet address to trace:");
      if (!transactionHash) {
        return {
          success: false,
          error: "Transaction hash or wallet address is required",
        };
      }

      const apiService = getApiService();
      let result;

      if (useMockApi) {
        result = await apiService.traceTransaction(transactionHash);
      } else {
        result = await realApiService.traceTransaction(transactionHash);
      }

      if (result.success) {
        toast({
          title: "Transaction Trace Started",
          description:
            "Transaction tracing initiated. Results will be available shortly.",
        });
        return { success: true, data: result.data };
      } else {
        toast({
          title: "Trace Failed",
          description: result.error || "Failed to start transaction trace",
          variant: "destructive",
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    } finally {
      setOperationLoading(operation, false);
    }
  };

  // Investigate alert
  const investigateAlert = async (
    alertId: string,
  ): Promise<OperationResult> => {
    const operation = `investigate_${alertId}`;
    setOperationLoading(operation, true);

    try {
      const apiService = getApiService();
      let result;

      if (useMockApi) {
        result = await apiService.investigateAlert(alertId);
      } else {
        result = await realApiService.investigateAlert(alertId);
      }

      if (result.success) {
        toast({
          title: "Investigation Started",
          description: `Alert ${alertId} is now under investigation`,
        });
        return { success: true, data: result.data };
      } else {
        toast({
          title: "Investigation Failed",
          description: result.error || "Failed to start investigation",
          variant: "destructive",
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    } finally {
      setOperationLoading(operation, false);
    }
  };

  return {
    screenNewWallet,
    generateSTRReport,
    runSanctionCheck,
    traceTransaction,
    investigateAlert,
    isLoading,
  };
};
