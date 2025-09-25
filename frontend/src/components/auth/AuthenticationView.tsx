import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, User, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import socioAgentLogo from "@/assets/socioagent-logo.png";
import axios from "axios";

interface AuthenticationViewProps {
  onAuth: (userData: { uuid: string; walletAddress: string; twitterId: string }) => void;
}

export const AuthenticationView = ({ onAuth }: AuthenticationViewProps) => {
  const [uuid, setUuid] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const validateWalletAddress = (address: string) => {
    // Basic Aptos wallet address validation (starts with 0x and is 64-66 characters)
    const aptosAddressRegex = /^0x[a-fA-F0-9]{62,64}$/;
    return aptosAddressRegex.test(address);
  };

  const validateUuid = (uuid: string) => {
    // Basic UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uuid.trim() || !walletAddress.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    if (!validateUuid(uuid)) {
      toast({
        title: "Invalid UUID",
        description: "Please enter a valid UUID format.",
        variant: "destructive",
      });
      return;
    }

    if (!validateWalletAddress(walletAddress)) {
      toast({
        title: "Invalid Wallet Address",
        description: "Please enter a valid Aptos wallet address.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    // --- REPLACE THE SIMULATED AUTHENTICATION ---
  try {
    // This is the new API call
// New, corrected code
const response = await axios.post('http://localhost:8000/api/get-user-by-wallet', {
  uuid: uuid,
  aptosAddress: walletAddress // Use the correct state variable
});

    toast({
      title: "Authentication Successful",
      description: `Welcome back, @${response.data.twitterId}!`,
    });

    // Pass all necessary data to the onAuth handler
    onAuth({ uuid, walletAddress, twitterId: response.data.twitterId });

  } catch (error) {
    toast({
      title: "Authentication Failed",
      description: error.response?.data?.message || "Please check your credentials and try again.",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-primary p-3 shadow-glow">
              <img 
                src={socioAgentLogo} 
                alt="SocioAgent Logo" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            SocioAgent
          </h1>
          <p className="text-muted-foreground mt-2">
            Connect your Web3 identity to continue
          </p>
        </div>

        {/* Authentication Card */}
        <Card className="shadow-elegant border-border/50">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Authentication
            </CardTitle>
            <CardDescription>
              Enter your credentials to access your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="uuid" className="text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  UUID
                </Label>
                <Input
                  id="uuid"
                  type="text"
                  placeholder="00000000-0000-0000-0000-000000000000"
                  value={uuid}
                  onChange={(e) => setUuid(e.target.value)}
                  className="transition-smooth"
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="wallet" className="text-sm font-medium flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Aptos Wallet Address
                </Label>
                <Input
                  id="wallet"
                  type="text"
                  placeholder="0x..."
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  className="transition-smooth"
                  disabled={isLoading}
                />
              </div>

              <Button 
                type="submit" 
                variant="auth"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Authenticating..." : "Connect & Continue"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-muted-foreground">
          <p>Secure Web3 social media management platform</p>
        </div>
      </div>
    </div>
  );
};