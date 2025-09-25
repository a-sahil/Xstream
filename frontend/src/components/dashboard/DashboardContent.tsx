import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LogOut, Activity, Wallet, Clock, ExternalLink } from "lucide-react"; // Changed icon
import { Skeleton } from "@/components/ui/skeleton";


interface DashboardContentProps {
  onLogout: () => void;
  walletAddress: string;
}

interface Transaction {
  id: string;
  type: "swap" | "stake" | "unstake" | "transfer" | "send" | "receive" | "contract interaction";
  amount: string;
  token: string;
  timestamp: string;
  status: "completed" | "pending" | "failed";
  hash: string;
}

export const DashboardContent = ({ onLogout, walletAddress }: DashboardContentProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState<string | null>(null);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!walletAddress) return;
      try {
        const response = await axios.get(`http://localhost:8000/api/get-balance/${walletAddress}`);
        setWalletBalance(response.data.balance);
      } catch (error) {
        console.error("Failed to fetch wallet balance:", error);
        setWalletBalance("Error");
      }
    };

    const loadTransactions = async () => {
        if (!walletAddress) return;
        setIsLoading(true);
        try {
            const response = await axios.get(`http://localhost:8000/api/get-account-transactions/${walletAddress}`);
            const formattedTransactions = response.data.map((tx: any) => ({
                id: tx.hash,
                type: tx.type.toLowerCase(),
                amount: tx.details.amount ? tx.details.amount.split(' ')[0] : 'N/A',
                token: tx.details.amount ? tx.details.amount.split(' ')[1] : 'APT',
                timestamp: tx.timestamp,
                status: tx.success ? 'completed' : 'failed',
                hash: tx.hash,
            }));
            setTransactions(formattedTransactions);
        } catch (error) {
            console.error("Failed to fetch transactions:", error);
        } finally {
            setIsLoading(false);
        }
    };

    fetchBalance();
    loadTransactions();
  }, [walletAddress]);

  const getTransactionIcon = (type: Transaction["type"]) => {
    switch (type) {
      case "swap": return "🔄";
      case "stake": return "🔒";
      case "unstake": return "🔓";
      case "send": return "💲";
      case "receive": return "📥";
      case "transfer": return "↔️";
      case "contract interaction": return "📄";
      default: return "💰";
    }
  };

  const getStatusColor = (status: Transaction["status"]) => {
    switch (status) {
      case "completed": return "text-success";
      case "pending": return "text-warning";
      case "failed": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const truncateHash = (hash: string) => {
    console.log("Truncating hash:", hash);
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-8 py-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard Overview</h1>
            <p className="text-sm text-muted-foreground">Manage your Web3 activities</p>
          </div>
          <Button 
            variant="outline" 
            onClick={onLogout}
            className="flex items-center gap-2 hover:bg-destructive hover:text-destructive-foreground transition-smooth"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </Button>
        </div>
      </header>

      <main className="flex-1 p-8 bg-gradient-subtle">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Wallet Balance
                </CardTitle>
                <Wallet className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                {walletBalance === null ? (
                  <Skeleton className="h-8 w-3/4" />
                ) : (
                  <div className="text-2xl font-bold">{walletBalance} APT</div>
                )}
                <p className="text-xs text-muted-foreground">Live balance from Aptos Testnet</p>
              </CardContent>
            </Card>
            
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Stakes
                </CardTitle>
                <Activity className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">Earning rewards (demo)</p>
              </CardContent>
            </Card>
            
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Recent Transactions
                </CardTitle>
                <Clock className="w-4 h-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{transactions.length}</div>
                <p className="text-xs text-muted-foreground">Last 25 transactions</p>
              </CardContent>
            </Card>
          </div>

        

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-lg border border-border/30">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.length > 0 ? transactions.map((tx, index) => (
                    <div key={tx.id}>
                      <div className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/30 transition-smooth">
                        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-lg">
                          {getTransactionIcon(tx.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium capitalize">{tx.type}</span>
                            <span className={`text-sm font-medium ${getStatusColor(tx.status)}`}>
                              • {tx.status}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {tx.amount !== 'N/A' ? `${tx.amount} ${tx.token} • ` : ''}{formatTimestamp(tx.timestamp)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                            {truncateHash(tx.hash)}
                          </code>
                          <Button asChild variant="ghost" size="sm">
                            <a href={`https://explorer.aptoslabs.com/txn/${tx.hash}?network=testnet`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        </div>
                      </div>
                      {index < transactions.length - 1 && <Separator className="my-2" />}
                    </div>
                  )) : (
                    <p className="text-center text-muted-foreground py-8">No transactions found.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};