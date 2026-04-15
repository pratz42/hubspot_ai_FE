"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, UserPlus, Users, AlertCircle, Loader2 } from "lucide-react";
import API from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

interface AdminUser {
  user_id: string;
  email: string;
  role: string | null;
  created_at: string;
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

        if (!token) {
          router.push("/");
          return;
        }

        // Fetch current user to verify admin role
        const res = await API.get("/auth/me");

        if (res.data?.role === "admin") {
          setIsAuthorized(true);
          fetchUsers();
        } else {
          // User is authenticated but not admin
          router.push("/dashboard");
        }
      } catch (err) {
        // Error fetching user or unauthorized
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
    } catch (error) {
      setListError(getErrorMessage(error, "Unable to load users."));
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
    } catch (error) {
      setError(getErrorMessage(error, "Error creating user. Please try again."));
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-gray-200 rounded-lg"></div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Access Denied
            </h3>
            <p className="text-gray-600 text-center">
              You need administrator privileges to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-600 mt-2">Manage users and system settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Create User Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserPlus className="w-5 h-5 mr-2 text-orange-600" />
              Create New User
            </CardTitle>
            <CardDescription>
              Add new team members to the CRM system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="user@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales_rep">Sales Representative</SelectItem>
                  <SelectItem value="sales_manager">Sales Manager</SelectItem>
                  <SelectItem value="marketing_manager">Marketing Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={createUser}
              className="w-full bg-orange-600 hover:bg-orange-700"
              disabled={!email || !password || creating}
            >
              {creating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</>
              ) : (
                <><UserPlus className="w-4 h-4 mr-2" />Create User</>
              )}
            </Button>

            {error && (
              <div className="p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
                {error}
              </div>
            )}

            {message && (
              <div className="p-3 rounded-lg text-sm bg-green-50 text-green-800 border border-green-200">
                {message}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2 text-orange-600" />
              System Users
            </CardTitle>
            <CardDescription>
              Overview of all users in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {listError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {listError}
              </div>
            )}
            <div className="space-y-4">
              {loadingUsers ? (
                <div className="space-y-3 animate-pulse">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 border border-gray-100 rounded-lg">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 bg-gray-200 rounded w-40" />
                        <div className="h-3 bg-gray-100 rounded w-24" />
                      </div>
                      <div className="h-5 bg-gray-200 rounded-full w-16" />
                    </div>
                  ))}
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No users found</p>
                </div>
              ) : (
                users.map((user) => {
                  const roleLabel = user.role
                    ? user.role.replace(/_/g, " ")
                    : "no role";
                  const isAdmin = user.role === "admin";
                  const createdDate = new Date(user.created_at).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                  });
                  return (
                    <div key={user.user_id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.email}</p>
                          <p className="text-xs text-gray-500 capitalize">{roleLabel}</p>
                          <p className="text-xs text-gray-400">Joined {createdDate}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {isAdmin && <Shield className="w-4 h-4 text-orange-600" />}
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${
                          isAdmin
                            ? "bg-orange-100 text-orange-800"
                            : user.role
                            ? "bg-gray-100 text-gray-800"
                            : "bg-red-50 text-red-500"
                        }`}>
                          {roleLabel}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}