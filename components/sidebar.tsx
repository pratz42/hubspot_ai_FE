"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Users,
  Target,
  Settings,
  Home,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import API from "@/lib/api";
import { useSidebar } from "./sidebar-context";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Leads", href: "/leads", icon: Users },
  { name: "Campaigns", href: "/campaign", icon: Target },
  { name: "Admin", href: "/admin", icon: Settings, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, setCollapsed } = useSidebar();
  const [user, setUser] = useState<{ email: string; name?: string; role?: string } | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setUser(null);
        setIsLoadingUser(false);
        return;
      }
      try {
        const res = await API.get("/auth/me");
        setUser({
          email: res.data?.email ?? "",
          name: res.data?.name ?? "",
          role: res.data?.role ?? "",
        });
      } catch {
        setUser(null);
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchCurrentUser();
  // Re-run on every route change so that login → dashboard
  // (client-side navigation) picks up the newly stored token.
  }, [pathname]);

  const isLoginRoute = pathname === "/";
  if (isLoginRoute || isLoadingUser || !user) return null;

  const displayName = user?.name || user?.email || "Sales User";
  const displayEmail = user?.email || "sales@company.com";

  return (
    <div
      className={cn(
        "fixed inset-y-0 left-0 z-50 bg-white shadow-lg border-r border-gray-200 transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Toggle button on right edge */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-16 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-orange-50 hover:border-orange-300 transition-colors z-10"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3 text-gray-500" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-gray-500" />
        )}
      </button>

      {/* Logo */}
      <div
        className={cn(
          "flex items-center h-16 border-b border-gray-200 flex-shrink-0 overflow-hidden",
          collapsed ? "justify-center px-0" : "px-4 gap-2"
        )}
      >
        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <span className="text-xl font-bold text-gray-900 truncate">Hubspot AI</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-5 space-y-1 overflow-y-auto">
        {navigation.filter((item) => !item.adminOnly || user?.role === "admin").map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              title={collapsed ? item.name : undefined}
              className={cn(
                "flex items-center py-2 text-sm font-medium rounded-lg transition-colors",
                collapsed ? "justify-center px-2" : "px-3 gap-3",
                isActive
                  ? "bg-orange-50 text-orange-700 border-r-2 border-orange-500"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && item.name}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-gray-200 p-2 flex-shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-1 py-2 mb-1">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
              <p className="text-xs text-gray-500 truncate">{displayEmail}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          title={collapsed ? "Sign Out" : undefined}
          className={cn(
            "flex items-center w-full py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors",
            collapsed ? "justify-center px-2" : "px-3 gap-3"
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && "Sign Out"}
        </button>
      </div>
    </div>
  );
}
