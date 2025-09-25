import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardContent } from "./DashboardContent";

interface DashboardViewProps {
  userData: {
    uuid: string;
    walletAddress: string;
    twitterId: string;
  };
  onLogout: () => void;
}

export const DashboardView = ({ userData, onLogout }: DashboardViewProps) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen w-full flex bg-background">
        <DashboardSidebar userData={userData} />
         <DashboardContent onLogout={onLogout} walletAddress={userData.walletAddress} />
      </div>
    </SidebarProvider>
  );
};