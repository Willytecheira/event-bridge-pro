import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut, Zap, BarChart3, ScrollText, Users } from 'lucide-react';
import NotificationsBell from '@/components/NotificationsBell';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { logout, email, role } = useSupabaseAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 cursor-pointer" onClick={() => navigate('/')}>
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold tracking-tight cursor-pointer" onClick={() => navigate('/')}>Kafka Bridge</span>
            <Badge variant="outline" className="text-xs font-mono border-primary/30 text-primary">v1.0</Badge>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-xs gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" /> Dashboard
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/logs')} className="text-xs gap-1.5">
              <ScrollText className="h-3.5 w-3.5" /> Logs
            </Button>
            {role === 'admin' && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/users')} className="text-xs gap-1.5">
                <Users className="h-3.5 w-3.5" /> Users
              </Button>
            )}
          </nav>
          <div className="flex items-center gap-3">
            <NotificationsBell />
            <span className="text-xs text-muted-foreground hidden sm:inline">{email}</span>
            <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">{role}</Badge>
            <Button variant="ghost" size="sm" onClick={logout} className="h-8 w-8 p-0">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4">
        {children}
      </main>
    </div>
  );
}
