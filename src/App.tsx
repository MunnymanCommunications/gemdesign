import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "next-themes";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/pdf-extractor" element={<BrowserPDFExtractorPage />} />
              <Route path="/business-tools" element={<BusinessTools />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/theme" element={<Theme />} />
              <Route path="/subscription" element={<Subscription />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/get-started" element={<GetStarted />} />
              <Route path="/helpful-documents" element={<HelpfulDocuments />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
