"use client";

import { useState } from "react";
import API from "@/lib/api";

export default function CampaignPage() {
  const [goal, setGoal] = useState("");
  const [result, setResult] = useState<any>(null);

  const generate = async () => {
    const res = await API.post("/campaigns/plan", { goal });
    setResult(res.data);
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Campaign Planner</h1>

      <input
        className="border p-2 mt-4"
        placeholder="Enter goal"
        onChange={(e) => setGoal(e.target.value)}
      />

      <button className="bg-green-500 text-white px-4 py-2 mt-2" onClick={generate}>
        Generate
      </button>

      {result && (
        <div className="mt-4">
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}