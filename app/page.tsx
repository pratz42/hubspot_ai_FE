"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    localStorage.setItem("token", data.session.access_token);
    router.push("/dashboard");
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-2xl font-bold">AI Sales Copilot</h1>

      <input
        className="border p-2"
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="border p-2"
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />

      <button className="bg-blue-500 text-white px-4 py-2" onClick={handleLogin}>
        Login
      </button>
    </div>
  );
}