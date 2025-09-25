import { NavLink } from "react-router-dom";
import { LayoutDashboard, ArrowRightLeft, Coins, User, Leaf, Layers } from "lucide-react"; // Add Leaf and Layers
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import socioAgentLogo from "@/assets/socioagent-logo.png";

interface DashboardSidebarProps {
  userData: {
    uuid: string;
    walletAddress: string;
    twitterId: string;
  };
}

const navigationItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    isActive: true,
  },
  {
    title: "Swap",
    url: "/swap",
    icon: ArrowRightLeft,
    isActive: false,
  },
  {
    title: "Staking & Lending",
    url: "/staking",
    icon: Coins,
    isActive: false,
  },
  // --- ADDED NEW ITEMS ---
  {
    title: "Yield Farming",
    url: "/yield",
    icon: Leaf,
    isActive: false,
  },
  {
    title: "Liquidity Pools",
    url: "/pools",
    icon: Layers,
    isActive: false,
  },
  // --- END ADDED ITEMS ---
];

export const DashboardSidebar = ({ userData }: DashboardSidebarProps) => {
  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getTwitterHandle = () => {
    return `@${userData.twitterId}`;
  };

  return (
    <Sidebar className="border-r border-sidebar-border">
      {/* Header */}
      <SidebarHeader className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary p-2 shadow-glow">
            <img 
              src={socioAgentLogo} 
              alt="Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h2 className="text-xl font-bold text-sidebar-foreground">
              SocioAgent
            </h2>
            <p className="text-sm text-sidebar-foreground/60">
              Web3 Dashboard
            </p>
          </div>
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-4 py-6">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 text-xs font-medium uppercase tracking-wider mb-4">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    className={`
                      w-full justify-start px-4 py-3 rounded-lg transition-smooth
                      ${item.isActive 
                        ? 'bg-sidebar-accent text-sidebar-primary font-semibold shadow-sm border border-sidebar-border/50' 
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* User Profile Footer */}
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent/30">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
              <User className="w-5 h-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-sidebar-foreground">
              {getTwitterHandle()}
            </div>
            <div className="text-xs text-sidebar-foreground/60 truncate">
              {truncateAddress(userData.walletAddress)}
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};