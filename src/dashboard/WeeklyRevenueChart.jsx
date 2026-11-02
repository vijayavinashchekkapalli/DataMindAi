import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const formatCurrency = (value) => `₹${(Number(value) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function WeeklyRevenueTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="weekly-tooltip">
      <strong>{item.weekLabel}</strong>
      <span>Revenue: {formatCurrency(item.revenue)}</span>
      <span>Transactions: {Number(item.transactions).toLocaleString("en-IN")}</span>
      <span>Quantity sold: {Number(item.quantitySold).toLocaleString("en-IN")}</span>
    </div>
  );
}

export default function WeeklyRevenueChart({ data }) {
  return (
    <div className="weekly-revenue-chart">
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 12, right: 12, bottom: 8, left: 18 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2ece4" />
          <XAxis dataKey="weekLabel" tick={{ fill: "#496455", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={formatCurrency} tick={{ fill: "#496455", fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
          <Tooltip content={<WeeklyRevenueTooltip />} />
          <Bar dataKey="revenue" name="Revenue" fill="#3A7D44" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
