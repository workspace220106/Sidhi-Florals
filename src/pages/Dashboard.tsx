import { Link } from "wouter";
import { m } from "motion/react";
import { Banknote, Flower2, TrendingUp, Gift, AlertTriangle, Star, Sparkles, ArrowUpRight } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useDashboard, useDailySales } from "@/api/analytics";
import { PageHeader } from "@/components/layout/AppLayout";
import { PetalField } from "@/components/PetalField";
import { CountUp } from "@/components/CountUp";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatCurrency, formatNumber, displayName } from "@/lib/utils";
import { shortageText } from "@/lib/bouquet";

const cards = [
  { key: "today_revenue", title: "Today's Revenue", icon: Banknote, money: true, isPrimary: true },
  { key: "today_stems", title: "Stems Sold Today", icon: Flower2, money: false, isPrimary: false },
  { key: "monthly_revenue", title: "Monthly Revenue", icon: TrendingUp, money: true, isPrimary: true },
  { key: "monthly_bouquets", title: "Bouquets This Month", icon: Gift, money: false, isPrimary: false },
] as const;

export default function Dashboard() {
  const { data, isPending } = useDashboard();
  const { data: daily, isPending: dailyPending } = useDailySales();

  return (
    <div className="space-y-8 relative">
      <PetalField />
      <PageHeader title="Dashboard" subtitle="Studio overview, today's blooms, and live revenue stream." />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((c, i) => (
          <m.div key={c.key} 
            initial={{ opacity: 0, y: 18, scale: 0.96 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            transition={{ delay: i * 0.08, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -6, scale: 1.02 }}
            className="card card-hover p-6 flex items-center gap-4 relative overflow-hidden group cursor-pointer border-border hover:border-primary-border/80">
            <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors duration-500 blur-xl" />
            
            <m.div 
              whileHover={{ rotate: 10, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                c.isPrimary 
                  ? "bg-primary text-white shadow-rose group-hover:shadow-rose-glow" 
                  : "bg-secondary text-white shadow-slate group-hover:bg-foreground"
              }`}>
              <c.icon className="w-7 h-7" />
            </m.div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-muted group-hover:text-foreground transition-colors">{c.title}</p>
              {isPending && !data ? <Skeleton className="h-8 w-28 mt-1.5" /> : (
                <h3 className="text-2xl sm:text-3xl font-bold font-display mt-0.5 truncate text-foreground">
                  <CountUp value={data?.[c.key] ?? 0} format={c.money ? formatCurrency : formatNumber} />
                </h3>
              )}
            </div>
          </m.div>
        ))}
      </div>

      {/* Main Charts & Side Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <m.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="lg:col-span-2 card p-6 sm:p-7 hover:border-primary-border/60">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl text-foreground font-bold font-display">Revenue Overview</h2>
              <p className="text-xs text-muted mt-0.5">30-day continuous sales trajectory</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary-soft text-primary border border-primary-border/60 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Live
            </span>
          </div>

          <div className="h-64 sm:h-80">
            {dailyPending && !daily ? <Skeleton className="h-full" /> : daily && daily.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D93B68" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#D93B68" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAE4DE" />
                  <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6E6475" }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6E6475" }} tickFormatter={(v: number) => `₹${v >= 1000 ? `${v / 1000}k` : v}`} width={52} />
                  <Tooltip 
                    contentStyle={{ borderRadius: 16, border: "1px solid #F8C8D7", backgroundColor: "#FFFFFF", boxShadow: "0 12px 30px -10px rgba(217, 59, 104, 0.25)" }} 
                    formatter={(v: number) => [formatCurrency(v), "Revenue"]} 
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#D93B68" strokeWidth={3.5} fill="url(#rev)" isAnimationActive={true} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-muted">No sales yet — your first bill will show up here.</div>}
          </div>
        </m.div>

        {/* Right column highlights */}
        <div className="space-y-6">
          <m.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="card p-6 bg-linear-to-br from-primary-soft/80 to-surface border-primary-border/60 relative overflow-hidden group hover:border-primary/50 transition-all duration-300">
            <Sparkles className="absolute -right-3 -top-3 w-24 h-24 text-primary/10 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-700" />
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-5 h-5 text-primary fill-primary animate-pulse-subtle" />
              <h3 className="text-lg font-bold text-foreground">Bloom of the Month</h3>
            </div>
            {isPending && !data ? <Skeleton className="h-16" /> : data?.star_product ? (
              <div className="relative z-10">
                <p className="text-2xl font-bold font-display text-primary">{displayName(data.star_product)}</p>
                <p className="text-sm text-muted font-medium mt-1">{formatNumber(data.star_product.quantity_sold)} sold · <span className="font-bold text-foreground">{formatCurrency(data.star_product.revenue)}</span></p>
              </div>
            ) : <p className="text-muted text-sm">No sales recorded yet this month.</p>}
          </m.div>

          {/* Low Stock Alert */}
          <m.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.45, duration: 0.4 }}
            className="card p-6 hover:border-primary-border/70 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                <AlertTriangle className="w-5 h-5 text-primary" /> Low Stock Warning
              </h3>
              <Link href="/inventory" className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-0.5 group">
                Inventory <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            </div>
            {isPending && !data ? <Skeleton className="h-24" /> : data && data.low_stock.length > 0 ? (
              <ul className="space-y-2.5">
                {data.low_stock.map((p) => (
                  <li key={p.id} className="flex justify-between items-center p-3 rounded-xl bg-primary-soft/50 border border-primary-border/40 hover:bg-primary-soft transition-colors">
                    <span className="font-semibold text-sm text-foreground">{displayName(p)}</span>
                    <span className="stock-badge bg-primary text-white shadow-xs">{p.stock} {p.unit}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted font-semibold bg-secondary-soft p-3 rounded-xl border border-border">
                ✓ All flowers and stems are well stocked.
              </p>
            )}
          </m.div>

          {/* Bouquets Short on Flowers */}
          {data && data.unavailable_bouquets.length > 0 && (
            <m.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.4 }}
              className="card p-6 border-l-4 border-l-primary hover:border-primary-border transition-all">
              <h3 className="text-base font-bold flex items-center gap-2 mb-3 text-foreground">
                <Gift className="w-5 h-5 text-primary" /> Bouquets Short on Flowers
              </h3>
              <ul className="space-y-2 text-sm">
                {data.unavailable_bouquets.map((b) => (
                  <li key={b.id} className="p-3 rounded-xl bg-primary-soft/50 border border-primary-border/30">
                    <p className="font-semibold text-foreground">{b.name}</p>
                    <p className="text-muted text-xs mt-0.5">{shortageText(b.shortages) || "No recipe defined"}</p>
                  </li>
                ))}
              </ul>
            </m.div>
          )}
        </div>
      </div>
    </div>
  );
}

