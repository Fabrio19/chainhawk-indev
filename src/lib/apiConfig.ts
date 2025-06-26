// Environment-aware API configuration

// Check if we're running in a cloud environment
const isCloudEnvironment = () => {
  return (
    window.location.hostname.includes(".fly.dev") ||
    window.location.hostname.includes(".vercel.app") ||
    window.location.hostname.includes(".netlify.app") ||
    window.location.hostname.includes(".github.io") ||
    window.location.hostname.includes(".railway.app") ||
    window.location.hostname.includes(".herokuapp.com") ||
    window.location.hostname.includes(".render.com") ||
    window.location.hostname.includes(".cloudflare.app") ||
    window.location.hostname.includes(".supabase.co") ||
    window.location.hostname.includes(".aws") ||
    window.location.hostname.includes(".azure") ||
    window.location.hostname.includes(".gcp") ||
    window.location.hostname.includes(".cloud") ||
    // Only consider it cloud if it's not localhost and not a local IP
    (window.location.hostname !== "localhost" && 
     !window.location.hostname.startsWith("127.") &&
     !window.location.hostname.startsWith("192.168.") &&
     !window.location.hostname.startsWith("10.") &&
     !window.location.hostname.startsWith("172."))
  );
};

// Check if local backend is available (for development)
const isLocalBackendAvailable = async (): Promise<boolean> => {
  if (isCloudEnvironment()) return false;

  try {
    const response = await fetch("http://localhost:3001/health", {
      method: "GET",
      signal: AbortSignal.timeout(2000), // 2 second timeout
    });
    return response.ok;
  } catch {
    return false;
  }
};

// Get the appropriate API base URL
export const getApiBaseUrl = (): string => {
  if (isCloudEnvironment()) {
    // In cloud environment, we'll use mock APIs
    return "/api/mock";
  }

  // Local development - use localhost backend
  return "http://localhost:3001/api";
};

// Check if we should use mock API
export const shouldUseMockApi = (): boolean => {
  return isCloudEnvironment();
};

// Environment info
export const getEnvironmentInfo = () => {
  return {
    isCloud: isCloudEnvironment(),
    hostname: window.location.hostname,
    origin: window.location.origin,
    shouldUseMock: shouldUseMockApi(),
    apiBaseUrl: getApiBaseUrl(),
  };
};

export default {
  getApiBaseUrl,
  shouldUseMockApi,
  getEnvironmentInfo,
  isLocalBackendAvailable,
};
