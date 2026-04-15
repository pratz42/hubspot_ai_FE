export default function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Dashboard</h1>

      <div className="mt-4 space-x-4">
        <a href="/leads" className="text-blue-500">Leads</a>
        <a href="/campaign" className="text-blue-500">Campaign Planner</a>
        <a href="/admin" className="text-blue-500">Admin Panel</a>
      </div>
    </div>
  );
}