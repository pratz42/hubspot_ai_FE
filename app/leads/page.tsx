"use client";

import { useEffect, useState } from "react";
import API from "@/lib/api";

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    API.get("/leads").then((res) => setLeads(res.data));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Leads</h1>

      <table className="border w-full">
        <thead>
          <tr>
            <th>Name</th>
            <th>Company</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead: any) => (
            <tr key={lead.id} className="border">
              <td>{lead.name}</td>
              <td>{lead.company}</td>
              <td>{lead.ai_score || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}