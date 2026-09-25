import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { loaders } from "@/routes";

const Dashboard = lazy(loaders["/"]);
const Billing = lazy(loaders["/billing"]);
const Inventory = lazy(loaders["/inventory"]);
const Customers = lazy(loaders["/customers"]);
const Sales = lazy(loaders["/sales"]);
const Reports = lazy(loaders["/reports"]);
const Credits = lazy(loaders["/credits"]);
const NotFound = lazy(() => import("@/pages/NotFound"));

function PageFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-56" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      <Skeleton className="h-72" />
    </div>
  );
}

export default function App() {
  return (
    <AppLayout>
      <ErrorBoundary>
        <Suspense fallback={<PageFallback />}>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/billing" component={Billing} />
            <Route path="/inventory" component={Inventory} />
            <Route path="/customers" component={Customers} />
            <Route path="/sales" component={Sales} />
            <Route path="/reports" component={Reports} />
            <Route path="/credits" component={Credits} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </ErrorBoundary>
    </AppLayout>
  );
}
