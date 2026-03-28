import { useState } from 'react';
import { useAuth } from '@/lib/bridge-api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@bridge.local');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuth((s) => s.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await login(email, password);
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/50 bg-card">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
            <Zap className="h-7 w-7 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight">Kafka Bridge</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Bridgewise SignalWise Monitor</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Password</label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Enter password" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Connecting...' : 'Sign In'}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Demo mode: any credentials will work when API is offline
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
