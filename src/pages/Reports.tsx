import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell, AreaChart, Area } from "recharts";
import { useDailySales, useMonthlySales, useTopProducts } from "@/api/analytics";
import { PageHeader } from "@/components/layout/AppLayout";
import { Skeleton } from "@/components/ui/Skeleton";
import { displayName, formatCurrency } from "@/lib/utils";
import type { ReactNode } from "react";

const COLORS = ["#D9456C", "#5F8B6A", "#E2B04A", "#8B5CF6", "#F472B6"];
const tip = { borderRadius: 12, border: "1px solid #EADFD8", boxShadow: "0 8px 24px -12px rgba(42,30,43,.25)" };
const axis = { fontSize: 12, fill: "#7A6B7C" };
const money = (v: number) => `₹${v >= 1000 ? `${Math.round(v / 100) / 10}k` : v}`;

function Panel({ title, children, loading, empty, accent = "border-t-primary" }: { title: string; children: ReactNode; loading: boolean; empty: boolean; accent?: string }) {
  return (
    <div className={`card p-6 border-t-4 ${accent}`}>
      <h3 className="text-xl mb-4">{title}</h3>
      <div className="h-64 sm:h-80">{loading ? <Skeleton className="h-full" /> : empty ? <div className="h-full flex items-center justify-center text-muted">No data yet.</div> : children}</div>
    </div>
  );
}

export default function Reports() {
  const { data: daily, isPending: dp } = useDailySales();
  const { data: monthly, isPending: mp } = useMonthlySales();
  const { data: top, isPending: tp } = useTopProducts();
  const topRows = (top ?? []).map((t) => ({ ...t, label: displayName(t) }));

  return (
    <div className="space-y-8">
      <PageHeader title="Reports" subtitle="How the shop is performing." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Monthly revenue (12 months)" loading={mp && !monthly} empty={!monthly?.length}>
          <ResponsiveContainer><BarChart data={monthly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EADFD8" /><XAxis dataKey="month" tickFormatter={(v: string) => v.slice(2)} axisLine={false} tickLine={false} tick={axis} /><YAxis axisLine={false} tickLine={false} tick={axis} tickFormatter={money} width={52} />
            <Tooltip cursor={{ fill: "#FBE4EA", opacity: 0.5 }} contentStyle={tip} formatter={(v: number) => [formatCurrency(v), "Revenue"]} />
            <Bar dataKey="revenue" radius={[6, 6, 0, 0]} isAnimationActive={false}>{(monthly ?? []).map((_, i) => <Cell key={i} fill={i === (monthly?.length ?? 0) - 1 ? "#D9456C" : "#5F8B6A"} />)}</Bar>
          </BarChart></ResponsiveContainer>
        </Panel>

        <Panel title="Top products (by quantity)" loading={tp && !top} empty={!top?.length} accent="border-t-accent">
          <ResponsiveContainer><BarChart data={topRows} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EADFD8" /><XAxis type="number" axisLine={false} tickLine={false} tick={axis} /><YAxis type="category" dataKey="label" axisLine={false} tickLine={false} tick={{ ...axis, fill: "#2A1E2B", fontWeight: 500 }} width={110} />
            <Tooltip cursor={{ fill: "#FBE4EA", opacity: 0.5 }} contentStyle={tip} formatter={(v: number, _n, p) => [`${v} sold · ${formatCurrency((p.payload as { revenue: number }).revenue)}`, "Quantity"]} />
            <Bar dataKey="quantity_sold" radius={[0, 6, 6, 0]} barSize={22} isAnimationActive={false}>{topRows.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
          </BarChart></ResponsiveContainer>
        </Panel>

        <div className="lg:col-span-2">
          <Panel title="Daily units sold (30 days)" loading={dp && !daily} empty={!daily?.length} accent="border-t-secondary">
            <ResponsiveContainer><LineChart data={daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EADFD8" /><XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} axisLine={false} tickLine={false} tick={axis} /><YAxis axisLine={false} tickLine={false} tick={axis} width={40} />
              <Tooltip contentStyle={tip} formatter={(v: number) => [v, "Units"]} /><Line type="monotone" dataKey="quantity_sold" stroke="#5F8B6A" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} isAnimationActive={false} />
            </LineChart></ResponsiveContainer>
          </Panel>
        </div>
      </div>

      <div><h2 className="text-2xl">Profit</h2><p className="text-muted text-sm">Revenue minus the purchase cost of everything sold (bouquets use their recipe cost).</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Daily net profit (30 days)" loading={dp && !daily} empty={!daily?.length} accent="border-t-secondary">
          <ResponsiveContainer><AreaChart data={daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs><linearGradient id="profit" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#5F8B6A" stopOpacity={0.4} /><stop offset="95%" stopColor="#5F8B6A" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EADFD8" /><XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} axisLine={false} tickLine={false} tick={axis} /><YAxis axisLine={false} tickLine={false} tick={axis} tickFormatter={money} width={52} />
            <Tooltip contentStyle={tip} formatter={(v: number) => [formatCurrency(v), "Profit"]} /><Area type="monotone" dataKey="profit" stroke="#5F8B6A" strokeWidth={3} fill="url(#profit)" isAnimationActive={false} />
          </AreaChart></ResponsiveContainer>
        </Panel>
        <Panel title="Monthly net profit (12 months)" loading={mp && !monthly} empty={!monthly?.length} accent="border-t-secondary">
          <ResponsiveContainer><BarChart data={monthly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EADFD8" /><XAxis dataKey="month" tickFormatter={(v: string) => v.slice(2)} axisLine={false} tickLine={false} tick={axis} /><YAxis axisLine={false} tickLine={false} tick={axis} tickFormatter={money} width={52} />
            <Tooltip cursor={{ fill: "#E6EFE8", opacity: 0.6 }} contentStyle={tip} formatter={(v: number) => [formatCurrency(v), "Profit"]} />
            <Bar dataKey="profit" radius={[6, 6, 0, 0]} isAnimationActive={false}>{(monthly ?? []).map((_, i) => <Cell key={i} fill={i === (monthly?.length ?? 0) - 1 ? "#5F8B6A" : "#9BC0A5"} />)}</Bar>
          </BarChart></ResponsiveContainer>
        </Panel>
      </div>
    </div>
  );
}
