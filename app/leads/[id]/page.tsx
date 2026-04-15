"use client";

import { useEffect, useState } from "react";
import API from "@/lib/api";

export default function LeadDetail({ params }: any) {
  const [lead, setLead] = useState<any>(null);

  useEffect(() => {
    API.get(`/leads/${params.id}`).then((res) => setLead(res.data));
  }, []);

  if (!lead) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">{lead.name}</h1>

      <p>Company: {lead.company}</p>

      <div className="mt-4">
        <h2 className="font-bold">AI Score</h2>
        <p>{lead.ai_score}</p>

        <h2 className="font-bold mt-2">Reason</h2>
        <p>{lead.ai_reason}</p>

        <h2 className="font-bold mt-2">Next Action</h2>
        <p>{lead.next_action}</p>
      </div>
    </div>
  );
}