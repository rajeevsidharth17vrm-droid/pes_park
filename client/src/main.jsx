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
      // On refresh: staleTime has passed → fetches fresh data → updates localStorage.
      gcTime: 1000 * 60 * 60 * 24,       // keep in localStorage for 24 hours
      staleTime: 1000 * 60 * 60 * 24,    // treat as fresh for 24 hours (refresh overrides)
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,              // don't refetch on navigation between pages
    },
  },
})

// Persist all query cache to localStorage
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "pes-park-cache",
  throttleTime: 1000,                     // write to localStorage at most once per second
})

persistQueryClient({
  queryClient,
  persister,
  maxAge: 1000 * 60 * 60 * 24,           // discard cache older than 24 hours
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      // Persist everything that succeeded
      return query.state.status === "success"
    },
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