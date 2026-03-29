import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import EventDetail from "./pages/EventDetail";
import LogsPage from "./pages/Logs";
import UsersPage from "./pages/Users";
import NotFound from "./pages/NotFound";
import { useSupabaseAuth } from "./hooks/useSupabaseAuth";

const queryClient = new QueryClient();

function AppRoutes() {
  const { isAuthenticated, isLoading, role } = useSupabaseAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/events/:id" element={<EventDetailWrapper />} />
      <Route path="/logs" element={<LogsWrapper />} />
      {role === 'admin' && <Route path="/users" element={<UsersWrapper />} />}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// Wrappers to add the shell layout for sub-pages
function EventDetailWrapper() {
  return <PageShell><EventDetail /></PageShell>;
}
function LogsWrapper() {
  return <PageShell><LogsPage /></PageShell>;
}
function UsersWrapper() {
  return <PageShell><UsersPage /></PageShell>;
}

function PageShell({ children }: { children: React.ReactNode }) {
  const { logout, email, role } = useSupabaseAuth();
  const navigate = (await import('react-router-dom')).useNavigate();

  return null; // Will fix this approach
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
