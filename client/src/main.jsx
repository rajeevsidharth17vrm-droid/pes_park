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
      // Cache is valid for 24 hours in localStorage.
      // On page load: show localStorage data instantly (no spinner).
      // On refresh: fetches fresh data → updates localStorage.
      gcTime: 1000 * 60 * 60 * 24,       // keep in localStorage for 24 hours
      staleTime: 1000 * 60 * 60 * 24,    // treat as fresh for 24 hours
      retry: 0,                           // no retries — fail fast if server sleeping
      retryOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false,              // serve from localStorage on navigation
      // If server doesn't respond in 15s, show error instead of infinite spinner
      networkMode: "offlineFirst",        // use cache first, fetch in background
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