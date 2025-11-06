import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Deposit from "./pages/Deposit";
import Games from "./pages/Games";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import AdminRegister from "./pages/AdminRegister";
import NotFound from "./pages/NotFound";
import DiceGame from "./pages/game/DiceGame";
import CoinFlip from "./pages/game/CoinFlip";
import NumberGuess from "./pages/game/NumberGuess";
import Slots from "./pages/game/Slots";
import Roulette from "./pages/game/Roulette";
import Blackjack from "./pages/game/Blackjack";
import Sports from "./pages/game/Sports";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/deposit" element={<Deposit />} />
          <Route path="/games" element={<Games />} />
          <Route path="/game/dice" element={<DiceGame />} />
          <Route path="/game/coin-flip" element={<CoinFlip />} />
          <Route path="/game/number-guess" element={<NumberGuess />} />
          <Route path="/game/slots" element={<Slots />} />
          <Route path="/game/roulette" element={<Roulette />} />
          <Route path="/game/blackjack" element={<Blackjack />} />
          <Route path="/game/sports" element={<Sports />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin-register" element={<AdminRegister />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
