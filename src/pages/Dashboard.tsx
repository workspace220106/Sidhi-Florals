import { Link } from "wouter";
import { m } from "motion/react";
import { Banknote, Flower2, TrendingUp, Gift, AlertTriangle, Star, Sparkles } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useDashboard, useDailySales } from "@/api/analytics";
import { PageHeader } from "@/components/layout/AppLayout";
import { PetalField } from "@/components/PetalField";
import { CountUp } from "@/components/CountUp";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatCurrency, formatNumber, displayName } from "@/lib/utils";
import { shortageText } from "@/lib/bouquet";

const cards = [
  { key: "today_revenue", title: "Today's Revenue", icon: Banknote, tone: "from-secondary to-emerald-400", money: true },
  { key: "today_stems", title: "Stems Sold Today", icon: Flower2, tone: "from-primary to-pink-400", money: false },
  { key: "monthly_revenue", title: "Monthly Revenue", icon: TrendingUp, tone: "from-violet-500 to-fuchsia-400", money: true },
  { key: "monthly_bouquets", title: "Bouquets This Month", icon: Gift, tone: "from-accent to-orange-400", money: false },
] as const;

export default function Dashboard() {
  const { data, isPending } = useDashboard();
  const { data: daily, isPending: dailyPending } = useDailySales();

  return (
    <div className="space-y-8 relative">
      <PetalField />
      <PageHeader title="Dashboard" subtitle="Good day! Here's how Sidhi Florals is blooming." />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((c, i) => (
          <m.div key={c.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.3 }}
            className="card card-hover p-5 flex items-center gap-4 relative overflow-hidden">
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full bg-linear-to-br ${c.tone} opacity-10`} />
            <div className={`w-12 h-12 rounded-2xl bg-linear-to-br ${c.tone} text-white flex items-center justify-center shadow-card shrink-0`}><c.icon className="w-6 h-6" /></div>
            <div className="min-w-0">
              <p className="text-sm text-muted">{c.title}</p>
              {isPending && !data ? <Skeleton className="h-7 w-28 mt-1" /> : (
                <h3 className="text-2xl mt-0.5 truncate">
                  <CountUp value={data?.[c.key] ?? 0} format={c.money ? formatCurrency : formatNumber} />
                </h3>
              )}
            </div>
          </m.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <h2 className="text-xl mb-4">Revenue — last 30 days</h2>
          <div className="h-64 sm:h-80">
            {dailyPending && !daily ? <Skeleton className="h-full" /> : daily && daily.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D9456C" stopOpacity={0.35} /><stop offset="95%" stopColor="#D9456C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EADFD8" />
                  <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#7A6B7C" }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#7A6B7C" }} tickFormatter={(v: number) => `₹${v >= 1000 ? `${v / 1000}k` : v}`} width={52} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #EADFD8", boxShadow: "0 8px 24px -12px rgba(42,30,43,.25)" }} formatter={(v: number) => [formatCurrency(v), "Revenue"]} />
                  <Area type="monotone" dataKey="revenue" stroke="#D9456C" strokeWidth={3} fill="url(#rev)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-muted">No sales yet — your first bill will show up here.</div>}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6 bg-linear-to-br from-accent-soft to-surface border-accent/30 relative overflow-hidden">
            <Sparkles className="absolute -right-3 -top-3 w-20 h-20 text-accent/20" />
            <div className="flex items-center gap-2 mb-3"><Star className="w-5 h-5 text-accent fill-accent" /><h3 className="text-lg">Bloom of the Month</h3></div>
            {isPending && !data ? <Skeleton className="h-16" /> : data?.star_product ? (
              <div>
                <p className="text-xl font-semibold">{displayName(data.star_product)}</p>
                <p className="text-sm text-muted">{formatNumber(data.star_product.quantity_sold)} sold · {formatCurrency(data.star_product.revenue)}</p>
              </div>
            ) : <p className="text-muted text-sm">No sales this month yet.</p>}
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-danger" /> Low stock</h3>
              <Link href="/inventory" className="text-sm font-medium text-primary hover:underline">Inventory</Link>
            </div>
            {isPending && !data ? <Skeleton className="h-24" /> : data && data.low_stock.length > 0 ? (
              <ul className="space-y-2">
                {data.low_stock.map((p) => (
                  <li key={p.id} className="flex justify-between items-center p-2.5 rounded-xl bg-danger-soft/60">
                    <span className="font-medium">{displayName(p)}</span>
                    <span className="stock-badge bg-danger text-white">{p.stock} {p.unit}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-secondary bg-secondary-soft p-3 rounded-xl">All flowers well stocked.</p>}
          </div>

          {data && data.unavailable_bouquets.length > 0 && (
            <div className="card p-6">
              <h3 className="text-lg flex items-center gap-2 mb-3"><Gift className="w-5 h-5 text-primary" /> Bouquets short on flowers</h3>
              <ul className="space-y-2 text-sm">
                {data.unavailable_bouquets.map((b) => (
                  <li key={b.id} className="p-2.5 rounded-xl bg-primary-soft/60">
                    <p className="font-medium">{b.name}</p>
                    <p className="text-muted text-xs">{shortageText(b.shortages) || "No recipe defined"}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
