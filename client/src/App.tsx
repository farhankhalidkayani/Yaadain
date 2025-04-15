import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Stories from "@/pages/Stories";
import StoryDetail from "@/pages/StoryDetail";
import MemoryBooks from "@/pages/MemoryBooks";
import BookDetail from "@/pages/BookDetail";
import CreateBook from "@/pages/CreateBook";
import Subscribe from "@/pages/Subscribe";
import OrderBook from "@/pages/OrderBook";
import Profile from "@/pages/Profile";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";

function Router() {
  const [location, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      
      // Redirect to login if not authenticated and trying to access protected routes
      if (!user && !location.startsWith("/login") && !location.startsWith("/register")) {
        setLocation("/login");
      }
      
      // Redirect to dashboard if authenticated and trying to access auth routes
      if (user && (location.startsWith("/login") || location.startsWith("/register"))) {
        setLocation("/");
      }
    });
    
    return () => unsubscribe();
  }, [location, setLocation]);
  
  // Show nothing while determining auth state
  if (isAuthenticated === null) {
    return null;
  }
  
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/stories" component={Stories} />
      <Route path="/stories/:id" component={StoryDetail} />
      <Route path="/memory-books" component={MemoryBooks} />
      <Route path="/memory-books/:id" component={BookDetail} />
      <Route path="/create-book" component={CreateBook} />
      <Route path="/subscribe" component={Subscribe} />
      <Route path="/order-book/:id" component={OrderBook} />
      <Route path="/profile" component={Profile} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
