import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Agents from "./pages/Agents";
import PhoneNumbers from "./pages/PhoneNumbers";
import CallLogs from "./pages/CallLogs";
import QueueSettings from "./pages/QueueSettings";

function Router() {
  return (
    <Switch>
      <Route path="/">
        <DashboardLayout>
          <Dashboard />
        </DashboardLayout>
      </Route>
      <Route path="/agents">
        <DashboardLayout>
          <Agents />
        </DashboardLayout>
      </Route>
      <Route path="/phone-numbers">
        <DashboardLayout>
          <PhoneNumbers />
        </DashboardLayout>
      </Route>
      <Route path="/call-logs">
        <DashboardLayout>
          <CallLogs />
        </DashboardLayout>
      </Route>
      <Route path="/queue-settings">
        <DashboardLayout>
          <QueueSettings />
        </DashboardLayout>
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
