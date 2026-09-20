import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell, AreaChart, Area } from "recharts";
import { m } from "motion/react";
import { useDailySales, useMonthlySales, useTopProducts } from "@/api/analytics";
import { PageHeader } from "@/components/layout/AppLayout";
import { Skeleton } from "@/components/ui/Skeleton";
import { displayName, formatCurrency } from "@/lib/utils";
import type { ReactNode } from "react";

const tip = { 
  borderRadius: 16, 
  border: "1px solid #F8C8D7", 
  backgroundColor: "#FFFFFF",
  boxShadow: "0 12px 30px -10px rgba(217, 59, 104, 0.25)",
  color: "#17151A"
};
const axis = { fontSize: 12, fill: "#6E6475" };
const money = (v: number) => `₹${v >= 1000 ? `${Math.round(v / 100) / 10}k` : v}`;

function Panel({ title, children, loading, empty, accent = "border-t-primary", delay = 0 }: { title: string; children: ReactNode; loading: boolean; empty: boolean; accent?: string; delay?: number }) {
  return (
    <m.div 
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      whileHover={{ y: -4 }}
      className={`card p-6 border-t-4 ${accent} hover:border-primary-border transition-all duration-300`}>
      <h3 className="text-xl font-bold text-foreground mb-4">{title}</h3>
      <div className="h-64 sm:h-80">{loading ? <Skeleton className="h-full rounded-xl" /> : empty ? <div className="h-full flex items-center justify-center text-muted">No data available yet.</div> : children}</div>
    </m.div>
  );
}

export default function Reports() {
  const { data: daily, isPending: dp } = useDailySales();
  const { data: monthly, isPending: mp } = useMonthlySales();
  const { data: top, isPending: tp } = useTopProducts();
  const topRows = (top ?? []).map((t) => ({ ...t, label: displayName(t) }));

  return (
    <div className="space-y-8">
      <PageHeader title="Studio Analytics & Reports" subtitle="Performance metrics, margins, and top flower volume." />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Monthly Revenue (12 Months)" loading={mp && !monthly} empty={!monthly?.length} accent="border-t-primary" delay={0.05}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAE4DE" />
              <XAxis dataKey="month" tickFormatter={(v: string) => v.slice(2)} axisLine={false} tickLine={false} tick={axis} />
              <YAxis axisLine={false} tickLine={false} tick={axis} tickFormatter={money} width={52} />
              <Tooltip cursor={{ fill: "#FDF0F4", opacity: 0.8 }} contentStyle={tip} formatter={(v: number) => [formatCurrency(v), "Revenue"]} />
              <Bar dataKey="revenue" radius={[8, 8, 0, 0]} isAnimationActive={true}>
                {(monthly ?? []).map((_, i) => (
                  <Cell key={i} fill={i === (monthly?.length ?? 0) - 1 ? "#D93B68" : "#28242E"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Top Products (By Quantity Sold)" loading={tp && !top} empty={!top?.length} accent="border-t-secondary" delay={0.1}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topRows} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EAE4DE" />
              <XAxis type="number" axisLine={false} tickLine={false} tick={axis} />
              <YAxis type="category" dataKey="label" axisLine={false} tickLine={false} tick={{ ...axis, fill: "#17151A", fontWeight: 600 }} width={110} />
              <Tooltip cursor={{ fill: "#FDF0F4", opacity: 0.8 }} contentStyle={tip} formatter={(v: number, _n, p) => [`${v} sold · ${formatCurrency((p.payload as { revenue: number }).revenue)}`, "Quantity"]} />
              <Bar dataKey="quantity_sold" radius={[0, 8, 8, 0]} barSize={22} isAnimationActive={true}>
                {topRows.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? "#D93B68" : i % 2 === 0 ? "#28242E" : "#6E6475"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <div className="lg:col-span-2">
          <Panel title="Daily Units Sold (Last 30 Days)" loading={dp && !daily} empty={!daily?.length} accent="border-t-primary" delay={0.15}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAE4DE" />
                <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} axisLine={false} tickLine={false} tick={axis} />
                <YAxis axisLine={false} tickLine={false} tick={axis} width={40} />
                <Tooltip contentStyle={tip} formatter={(v: number) => [v, "Units"]} />
                <Line type="monotone" dataKey="quantity_sold" stroke="#D93B68" strokeWidth={3.5} dot={{ r: 3, fill: "#D93B68" }} activeDot={{ r: 7, stroke: "#FFF", strokeWidth: 2 }} isAnimationActive={true} />
              </LineChart>
            </ResponsiveContainer>
          </Panel>
        </div>
      </div>

      <div className="pt-2">
        <h2 className="text-2xl font-bold font-display text-foreground">Net Studio Profit</h2>
        <p className="text-muted text-sm mt-1">Revenue calculated minus raw inventory purchase cost (including custom recipes).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Daily Net Profit (30 Days)" loading={dp && !daily} empty={!daily?.length} accent="border-t-primary" delay={0.2}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="profit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D93B68" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#D93B68" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAE4DE" />
              <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} axisLine={false} tickLine={false} tick={axis} />
              <YAxis axisLine={false} tickLine={false} tick={axis} tickFormatter={money} width={52} />
              <Tooltip contentStyle={tip} formatter={(v: number) => [formatCurrency(v), "Net Profit"]} />
              <Area type="monotone" dataKey="profit" stroke="#D93B68" strokeWidth={3.5} fill="url(#profit)" isAnimationActive={true} />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Monthly Net Profit (12 Months)" loading={mp && !monthly} empty={!monthly?.length} accent="border-t-secondary" delay={0.25}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAE4DE" />
              <XAxis dataKey="month" tickFormatter={(v: string) => v.slice(2)} axisLine={false} tickLine={false} tick={axis} />
              <YAxis axisLine={false} tickLine={false} tick={axis} tickFormatter={money} width={52} />
              <Tooltip cursor={{ fill: "#FDF0F4", opacity: 0.8 }} contentStyle={tip} formatter={(v: number) => [formatCurrency(v), "Profit"]} />
              <Bar dataKey="profit" radius={[8, 8, 0, 0]} isAnimationActive={true}>
                {(monthly ?? []).map((_, i) => (
                  <Cell key={i} fill={i === (monthly?.length ?? 0) - 1 ? "#D93B68" : "#28242E"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </div>
  );
}

