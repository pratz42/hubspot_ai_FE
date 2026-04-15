"use client";

import { useState } from "react";
import API from "@/lib/api";

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("sales_rep");
  const [message, setMessage] = useState("");

  const createUser = async () => {
    try {
      const res = await API.post("/admin/create-user", {
        email,
        password,
        role,
      });

      setMessage("User created successfully!");
    } catch (err: any) {
      setMessage(err.response?.data?.detail || "Error creating user");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Admin Panel</h1>

      <div className="mt-4 flex flex-col gap-3 w-64">
        <input
          className="border p-2"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="border p-2"
          placeholder="Password"
          type="password"
          onChange={(e) => setPassword(e.target.value)}
        />

        <select
          className="border p-2"
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="sales_rep">Sales Rep</option>
          <option value="sales_manager">Sales Manager</option>
          <option value="marketing_manager">Marketing Manager</option>
        </select>

        <button
          className="bg-blue-500 text-white p-2"
          onClick={createUser}
        >
          Create User
        </button>

        {message && <p>{message}</p>}
      </div>
    </div>
  );
}