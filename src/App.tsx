import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProRoute from '@/components/ProRoute';
import SecurityAssessmentPage from '@/pages/security-assessment/App';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Chat from "./pages/Chat";
import Documents from "./pages/Documents";
import BusinessTools from "./pages/BusinessTools";
import Analytics from "./pages/Analytics";
import Theme from "./pages/Theme";
import Subscription from "./pages/Subscription";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import GetStarted from "./pages/GetStarted";
import HelpfulDocuments from './pages/HelpfulDocuments';
import BrowserPDFExtractorPage from './pages/BrowserPDFExtractorPage';
import SatelliteAssessmentPage from './pages/SatelliteAssessment';
import UpgradePage from './pages/Upgrade';
import SubscriptionEnforcer from './components/SubscriptionEnforcer';
import PaymentFailedModal from './components/PaymentFailedModal';
import { useSubscription } from './hooks/useSubscription';
import PrivateRoute from './components/PrivateRoute';

const queryClient = new QueryClient();

const AppContent = () => {
  const { subscription } = useSubscription();
  const showPaymentFailedModal = subscription?.payment_status === 'past_due';

  return (
    <>
      <PaymentFailedModal open={showPaymentFailedModal} />
      <BrowserRouter>
        <SubscriptionEnforcer>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/upgrade" element={<UpgradePage />} />

            <Route element={<PrivateRoute />}>
              <Route path="/chat" element={<Chat />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/pdf-extractor" element={<BrowserPDFExtractorPage />} />
              <Route path="/business-tools" element={<BusinessTools />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/theme" element={<Theme />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/get-started" element={<GetStarted />} />
              <Route path="/helpful-documents" element={<HelpfulDocuments />} />
              <Route path="/satellite-assessment" element={<SatelliteAssessmentPage />} />
              <Route path="/security-assessment" element={<ProRoute />}>
                <Route index element={<SecurityAssessmentPage />} />
              </Route>
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SubscriptionEnforcer>
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <NextThemesProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ThemeProvider>
            <Toaster />
            <Sonner />
            <AppContent />
          </ThemeProvider>
        </NextThemesProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
