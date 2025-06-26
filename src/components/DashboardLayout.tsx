import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { BackendStatus } from "@/components/BackendStatus";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Search,
  GitBranch,
  Shield,
  FileText,
  Settings,
  FolderOpen,
  AlertTriangle,
  Eye,
  MessageSquare,
  Clock,
  Users,
  TrendingUp,
  Globe,
  Building,
  LogOut,
  User,
  ChevronDown,
} from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

const getNavigation = (userRole?: string) => {
  const baseNavigation = [
    { name: "Overview", href: "/", icon: LayoutDashboard },
    { name: "Wallet Screening", href: "/wallet-screening", icon: Search },
    {
      name: "Transaction Tracing",
      href: "/transaction-tracing",
      icon: GitBranch,
    },
    { name: "Graph Visualization", href: "/graph-visualization", icon: Eye },
    {
      name: "Compliance Screening",
      href: "/compliance-screening",
      icon: Shield,
    },
    { name: "Risk History", href: "/risk-history", icon: TrendingUp },
    {
      name: "Continuous Monitoring",
      href: "/continuous-monitoring",
      icon: AlertTriangle,
    },
    { name: "Case Management", href: "/case-management", icon: FolderOpen },
    {
      name: "Enhanced Cases",
      href: "/enhanced-case-management",
      icon: MessageSquare,
    },
    { name: "Entity Profiles", href: "/entity-risk-profiles", icon: Users },
    { name: "Advanced Risk", href: "/advanced-risk-analysis", icon: Shield },
    { name: "Travel Rule", href: "/travel-rule", icon: Globe },
    { name: "Reports", href: "/reports", icon: FileText },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  // Add admin-only navigation items
  if (userRole === "admin") {
    baseNavigation.splice(-1, 0, {
      name: "User Management",
      href: "/user-management",
      icon: Users,
    });
  }

  return baseNavigation;
};

// User Menu Component
const UserMenu = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "analyst":
        return "bg-blue-100 text-blue-800";
      case "partner":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-auto p-2">
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-blue-100 text-blue-800 text-xs">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">{user.name}</span>
              <span
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full",
                  getRoleBadgeColor(user.role),
                )}
              >
                {user.role}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="space-y-1">
            <p className="font-medium">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User className="h-4 w-4 mr-2" />
          Profile Settings
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Shield className="h-4 w-4 mr-2" />
          API Keys
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-red-600">
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const { user } = useAuth();
  const navigation = getNavigation(user?.role);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-600 text-white rounded-lg">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    CryptoCompliance Pro
                  </h1>
                  <p className="text-sm text-gray-500">
                    Advanced Blockchain Risk & Compliance Platform
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <BackendStatus />
              <div className="text-sm text-gray-600">
                Last sync: {new Date().toLocaleTimeString()}
              </div>
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-white shadow-sm h-[calc(100vh-80px)] overflow-y-auto">
          <div className="p-4">
            <div className="space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive
                        ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "mr-3 h-4 w-4",
                        isActive ? "text-blue-700" : "text-gray-400",
                      )}
                    />
                    {item.name}
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* System Status */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                <span>Compliance Score</span>
                <span className="font-semibold text-green-600">94%</span>
              </div>
              <div className="bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full w-[94%]"></div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>Travel Rule: Active</span>
                  <span>FIU-IND: Connected</span>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
