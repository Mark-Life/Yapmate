"use client";

import { cn } from "@yapmate/components/lib/utils";
import { useState } from "react";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export type DataTableColumn = {
  key: string;
  label: string;
  format?: "text" | "number" | "date" | "currency" | null;
};

export type DataTableProps = {
  data: Record<string, unknown>[];
  columns: DataTableColumn[];
  pageSize?: number | null;
};

const formatValue = (
  value: unknown,
  format?: "text" | "number" | "date" | "currency" | null
) => {
  if (value === null || value === undefined) return "-";

  switch (format) {
    case "number":
      return typeof value === "number" ? value.toLocaleString() : String(value);
    case "currency":
      return typeof value === "number"
        ? `$${value.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
        : String(value);
    case "date":
      return typeof value === "string" || typeof value === "number"
        ? new Date(value).toLocaleDateString()
        : String(value);
    default:
      return String(value);
  }
};

export function DataTable({ data, columns, pageSize }: DataTableProps) {
  const [page, setPage] = useState(0);
  const effectivePageSize = pageSize ?? 10;
  const totalPages = Math.ceil(data.length / effectivePageSize);
  const paginatedData = data.slice(
    page * effectivePageSize,
    (page + 1) * effectivePageSize
  );

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-2 text-left font-medium text-muted-foreground"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, i) => (
              <tr key={i} className="border-t hover:bg-muted/30">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-2">
                    {formatValue(row[col.key], col.format)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-2">
          <span className="text-muted-foreground text-xs">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="rounded px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export type MetricProps = {
  label: string;
  value: string;
  change?: string | null;
  changeType?: "positive" | "negative" | "neutral" | null;
};

export function Metric({ label, value, change, changeType }: MetricProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-semibold text-2xl">{value}</span>
      {change && (
        <span
          className={cn(
            "text-xs",
            changeType === "positive" && "text-green-600",
            changeType === "negative" && "text-red-600",
            changeType === "neutral" && "text-muted-foreground"
          )}
        >
          {change}
        </span>
      )}
    </div>
  );
}

const CHART_COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7300",
  "#0088fe",
  "#00c49f",
];

export type ChartProps = {
  type: "bar" | "line" | "pie" | "area";
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  title?: string | null;
};

export function Chart({ type, data, xKey, yKey, title }: ChartProps) {
  const chartData = data.map((d) => ({
    x: d[xKey],
    y: typeof d[yKey] === "number" ? d[yKey] : 0,
    name: String(d[xKey]),
  }));

  return (
    <div className="flex flex-col gap-2">
      {title && <h4 className="font-medium text-sm">{title}</h4>}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {type === "bar" ? (
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="y" fill={CHART_COLORS[0]} />
            </BarChart>
          ) : type === "line" ? (
            <LineChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="y"
                stroke={CHART_COLORS[0]}
                strokeWidth={2}
              />
            </LineChart>
          ) : type === "area" ? (
            <AreaChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="y"
                fill={CHART_COLORS[0]}
                fillOpacity={0.3}
                stroke={CHART_COLORS[0]}
              />
            </AreaChart>
          ) : (
            <PieChart>
              <Pie
                data={chartData}
                dataKey="y"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
