type Cell = string | number | undefined | null;

/** Download a 2-D array of values as a CSV file. */
export function exportCSV(
  headers: string[],
  rows: Cell[][],
  filename: string,
) {
  const esc = (v: Cell) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    headers.map(esc).join(","),
    ...rows.map((r) => r.map(esc).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
