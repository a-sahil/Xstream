import { useState } from "react";
import { AuthenticationView } from "@/components/auth/AuthenticationView";
import { DashboardView } from "@/components/dashboard/DashboardView";

interface UserData {
  uuid: string;
  walletAddress: string;
   twitterId: string; // Add twitterId here
}

const Index = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleAuth = (data: UserData) => {
    setUserData(data);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setUserData(null);
    setIsAuthenticated(false);
  };

  if (!isAuthenticated || !userData) {
    return <AuthenticationView onAuth={handleAuth} />;
  }

  return <DashboardView userData={userData} onLogout={handleLogout} />;
};

export default Index;
