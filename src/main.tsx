import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { LazyMotion, domAnimation } from "motion/react";
import { Toaster } from "sonner";
import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces";
import "./index.css";
import App from "./App";
import { queryClient, persister } from "./lib/queryClient";
import { supabaseConfigError } from "./lib/supabase";
import { SetupScreen } from "./components/SetupScreen";

const root = createRoot(document.getElementById("root")!);

if (supabaseConfigError) {
  root.render(<SetupScreen message={supabaseConfigError} />);
} else {
  root.render(
    <StrictMode>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000, buster: "v1" }}>
        <LazyMotion features={domAnimation} strict>
          <App />
          <Toaster position="top-center" richColors closeButton />
        </LazyMotion>
      </PersistQueryClientProvider>
    </StrictMode>,
  );
}

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("/sw.js").catch(() => {}); });
}
