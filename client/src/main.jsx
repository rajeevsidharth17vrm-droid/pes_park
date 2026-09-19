import React from "react"
import ReactDOM from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { persistQueryClient } from "@tanstack/react-query-persist-client"
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister"
import App from "./App"
import "./index.css"
import { useAuthStore } from "./store/authStore"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Strategy: show cached data instantly from localStorage, then
      // immediately background-refetch so the UI is never stuck on stale data.
      gcTime: 1000 * 60 * 60 * 24, // keep in localStorage for 24 hours (instant loads)
      staleTime: 0,                 // always consider data stale → always background-refetch on mount
      refetchOnMount: true,         // refetch whenever a component mounts (if data is stale)
      refetchOnWindowFocus: false,  // don't refetch on tab switch (too noisy)
      retry: 0,                     // no retries — fail fast, don't hammer the DB
    },
  },
})

// Persist all query cache to localStorage
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "pes-park-cache",
  throttleTime: 1000,
})

persistQueryClient({
  queryClient,
  persister,
  maxAge: 1000 * 60 * 60 * 24,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => query.state.status === "success",
  },
})

useAuthStore.getState().init()

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
)