"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  UserPlus,
  Users,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Crown,
  User,
} from "lucide-react";
import API from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

interface AdminUser {
  user_id: string;
  email: string;
  role: string | null;
  created_at: string;
}

function getRoleMeta(role: string | null) {
  switch (role) {
    case "admin":
      return {
        label: "Admin",
        badge: "bg-orange-100 text-orange-700 border-orange-200",
        avatarBg: "bg-gradient-to-br from-orange-500 to-orange-600",
        icon: Crown,
      };
    case "sales_manager":
      return {
        label: "Sales Manager",
        badge: "bg-violet-50 text-violet-700 border-violet-200",
        avatarBg: "bg-gradient-to-br from-violet-500 to-violet-600",
        icon: Users,
      };
    case "marketing_manager":
      return {
        label: "Marketing Manager",
        badge: "bg-blue-50 text-blue-700 border-blue-200",
        avatarBg: "bg-gradient-to-br from-blue-500 to-blue-600",
        icon: User,
      };
    default:
      return {
        label: role ? role.replace(/_/g, " ") : "No role",
        badge: role
          ? "bg-slate-100 text-slate-600 border-slate-200"
          : "bg-red-50 text-red-500 border-red-200",
        avatarBg: "bg-gradient-to-br from-slate-400 to-slate-500",
        icon: User,
      };
  }
}

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("sales_rep");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState("");
  const [listError, setListError] = useState("");
  const [creating, setCreating] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAdminRole = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/"); return; }
        const res = await API.get("/auth/me");
        if (res.data?.role === "admin") {
          setIsAuthorized(true);
          fetchUsers();
        } else {
          router.push("/dashboard");
        }
      } catch {
        router.push("/");
      } finally {
        setLoading(false);
      }
    };
    checkAdminRole();
  }, [router]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await API.get("/admin/users");
      setUsers(res.data.users ?? []);
    } catch (err) {
      setListError(getErrorMessage(err, "Unable to load users."));
    } finally {
      setLoadingUsers(false);
    }
  };

  const createUser = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    setCreating(true);
    setError("");
    try {
      await API.post("/admin/create-user", { email, password, role });
      setMessage("User created successfully!");
      setEmail("");
      setPassword("");
      setRole("sales_rep");
      fetchUsers();
    } catch (err) {
      setError(getErrorMessage(err, "Error creating user. Please try again."));
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl">
        <div className="space-y-2 mb-8">
          <div className="h-7 bg-slate-200 rounded-lg w-36 animate-pulse" />
          <div className="h-4 bg-slate-100 rounded w-56 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-96 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="p-6 max-w-7xl">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-5">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-2">Access Denied</h3>
          <p className="text-sm text-slate-500">
            You need administrator privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Admin Panel</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage users and system access</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create user form */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4 pt-5 px-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Create New User
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Add a new team member to the system
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 py-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="user@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-lg focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Password
              </label>
              <Input
                type="password"
                placeholder="Set a secure password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-lg focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Role
              </label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="h-10 bg-slate-50 border-slate-200 rounded-lg">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales_rep">Sales Representative</SelectItem>
                  <SelectItem value="sales_manager">Sales Manager</SelectItem>
                  <SelectItem value="marketing_manager">Marketing Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-xs text-red-700">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}

            {message && (
              <div className="flex items-start gap-2.5 rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 text-xs text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-emerald-600" />
                {message}
              </div>
            )}

            <Button
              onClick={createUser}
              disabled={!email || !password || creating}
              className="w-full h-10 bg-orange-600 hover:bg-orange-700 font-semibold shadow-sm shadow-orange-100"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create User
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Users list */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4 pt-5 px-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Users className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    System Users
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {users.length} member{users.length !== 1 ? "s" : ""} total
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 py-4">
            {listError && (
              <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700">
                {listError}
              </div>
            )}

            {loadingUsers ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-100 animate-pulse"
                  >
                    <div className="w-9 h-9 bg-slate-200 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-slate-200 rounded w-40" />
                      <div className="h-2.5 bg-slate-100 rounded w-24" />
                    </div>
                    <div className="h-5 bg-slate-200 rounded-full w-20" />
                  </div>
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                  <Users className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600">No users found</p>
                <p className="text-xs text-slate-400 mt-1">
                  Create the first user using the form
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((user) => {
                  const meta = getRoleMeta(user.role);
                  const RoleIcon = meta.icon;
                  const createdDate = new Date(user.created_at).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric", year: "numeric" }
                  );
                  const initial = user.email.charAt(0).toUpperCase();

                  return (
                    <div
                      key={user.user_id}
                      className="flex items-center gap-3.5 p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all"
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${meta.avatarBg}`}
                      >
                        <span className="text-sm font-bold text-white">{initial}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {user.email}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Joined {createdDate}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {user.role === "admin" && (
                          <Shield className="w-3.5 h-3.5 text-orange-500" />
                        )}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${meta.badge}`}
                        >
                          <RoleIcon className="w-2.5 h-2.5" />
                          {meta.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
