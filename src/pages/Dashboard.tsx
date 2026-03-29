import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useMetrics, useEvents, useErrors } from '@/hooks/useEvents';
import { bridgeApi, demoData } from '@/lib/bridge-api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Activity, AlertTriangle, CheckCircle2, Copy,
  LogOut, Pause, Play, RefreshCw, Server, Zap, XCircle,
  ArrowUpRight, ArrowDownRight, Minus, Radio, Users, ScrollText, BarChart3
} from 'lucide-react';
import MetricsCharts from '@/components/MetricsCharts';
import NotificationsBell from '@/components/NotificationsBell';

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
}

function timeAgo(iso: string | null) {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

function SentimentIcon({ sentiment }: { sentiment: string }) {
  if (sentiment === 'BULLISH') return <ArrowUpRight className="h-3.5 w-3.5 text-success" />;
  if (sentiment === 'BEARISH') return <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

export default function Dashboard() {
  const { logout, email, role } = useSupabaseAuth();
  const navigate = useNavigate();
  const { data: metrics } = useMetrics();
  const { data: dbEvents } = useEvents({ limit: 10 });
  const { data: dbErrors } = useErrors();

  // Bridge API status (for connection info)
  const [bridgeStatus, setBridgeStatus] = useState<any>(demoData.status);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const fetchBridgeStatus = useCallback(async () => {
    const res = await bridgeApi.getMetrics();
    if (res) setBridgeStatus(res);
  }, []);

  useEffect(() => { fetchBridgeStatus(); }, [fetchBridgeStatus]);
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchBridgeStatus, 15000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchBridgeStatus]);

  const togglePause = async () => {
    if (isPaused) { await bridgeApi.resume(); setIsPaused(false); }
    else { await bridgeApi.pause(); setIsPaused(true); }
  };

  // Use DB metrics if available, fallback to bridge/demo
  const stats = {
    total_processed: metrics?.total_processed ?? bridgeStatus.total_processed ?? 0,
    total_duplicates: metrics?.total_duplicates ?? bridgeStatus.total_duplicates ?? 0,
    total_errors: metrics?.total_errors ?? bridgeStatus.total_errors ?? 0,
    events_last_hour: metrics?.events_last_hour ?? bridgeStatus.events_last_hour ?? 0,
  };

  const events = dbEvents ?? demoData.events;
  const errors = (dbErrors ?? demoData.errors).slice(0, 5);

  const kpiCards = [
    { label: 'Events Processed', value: stats.total_processed.toLocaleString(), icon: CheckCircle2, color: 'text-success' },
    { label: 'Duplicates', value: stats.total_duplicates.toLocaleString(), icon: Copy, color: 'text-warning' },
    { label: 'Errors', value: stats.total_errors.toLocaleString(), icon: AlertTriangle, color: 'text-destructive' },
    { label: 'Last Hour', value: stats.events_last_hour.toLocaleString(), icon: Activity, color: 'text-accent' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold tracking-tight">Kafka Bridge</span>
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
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className={`h-3 w-3 ${autoRefresh ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
              <button onClick={() => setAutoRefresh(!autoRefresh)} className="hover:text-foreground transition-colors">
                {autoRefresh ? '15s' : 'Paused'}
              </button>
            </div>
            <NotificationsBell />
            <span className="text-xs text-muted-foreground hidden sm:inline">{email}</span>
            <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">{role}</Badge>
            <Button variant="ghost" size="sm" onClick={logout} className="h-8 w-8 p-0">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 space-y-6">
        {/* Connection Status */}
        <div className="flex flex-wrap gap-3 items-center">
          <StatusPill label="Consumer" connected={bridgeStatus.consumer_connected} />
          <StatusPill label="Producer" connected={bridgeStatus.producer_connected} />
          <StatusPill label="Database" connected={bridgeStatus.database === 'connected'} />
          <div className="flex-1" />
          <span className="text-xs text-muted-foreground">
            Uptime: <span className="font-mono text-foreground">{formatUptime(bridgeStatus.uptime_seconds)}</span>
          </span>
          <span className="text-xs text-muted-foreground">
            Last msg: <span className="font-mono text-foreground">{timeAgo(bridgeStatus.last_message_at)}</span>
          </span>
          {role === 'admin' && (
            <Button variant="outline" size="sm" onClick={togglePause} className="h-7 text-xs gap-1">
              {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((kpi) => (
            <Card key={kpi.label} className="border-border/50 bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
                <p className="text-2xl font-bold font-mono tracking-tight">{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <MetricsCharts />

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Events */}
          <div className="lg:col-span-2">
            <Card className="border-border/50 bg-card">
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Radio className="h-4 w-4 text-primary" /> Recent Events
                </h3>
                <span className="text-xs text-muted-foreground">Last 10</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-xs text-muted-foreground">
                      <th className="px-4 py-2 text-left font-medium">Ticker</th>
                      <th className="px-4 py-2 text-left font-medium">Type</th>
                      <th className="px-4 py-2 text-left font-medium">Sentiment</th>
                      <th className="px-4 py-2 text-left font-medium">Asset</th>
                      <th className="px-4 py-2 text-left font-medium">Reasoning</th>
                      <th className="px-4 py-2 text-left font-medium">Kafka</th>
                      <th className="px-4 py-2 text-right font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((evt: any) => (
                      <tr
                        key={evt.id}
                        className="border-b border-border/30 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => navigate(`/events/${evt.id}`)}
                      >
                        <td className="px-4 py-2.5 font-mono font-semibold text-foreground">{evt.ticker || '—'}</td>
                        <td className="px-4 py-2.5">
                          <Badge variant="secondary" className="text-xs font-mono">{evt.event_type}</Badge>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="flex items-center gap-1">
                            <SentimentIcon sentiment={evt.sentiment} />
                            <span className="text-xs">{evt.sentiment || '—'}</span>
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{evt.asset_type || '—'}</td>
                        <td className="px-4 py-2.5">
                          {evt.has_reasoning
                            ? <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                            : <XCircle className="h-3.5 w-3.5 text-muted-foreground/40" />
                          }
                        </td>
                        <td className="px-4 py-2.5">
                          {evt.published_to_internal_kafka
                            ? <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                            : <XCircle className="h-3.5 w-3.5 text-destructive" />
                          }
                        </td>
                        <td className="px-4 py-2.5 text-right text-xs text-muted-foreground font-mono">{timeAgo(evt.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Recent Errors + System */}
          <div className="space-y-4">
            <Card className="border-border/50 bg-card">
              <div className="px-4 pt-4 pb-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" /> Recent Errors
                </h3>
              </div>
              <div className="px-4 pb-4 space-y-3">
                {errors.map((err: any) => (
                  <div key={err.id} className="rounded-lg border border-border/50 p-3 space-y-2 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <Badge variant={err.status === 'resolved' ? 'secondary' : 'destructive'} className="text-xs">
                        {err.stage}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">{timeAgo(err.created_at)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 font-mono">{err.error_message}</p>
                  </div>
                ))}
                {errors.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No errors 🎉</p>
                )}
              </div>
            </Card>

            <Card className="border-border/50 bg-card">
              <div className="px-4 pt-4 pb-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Server className="h-4 w-4 text-accent" /> System
                </h3>
              </div>
              <div className="px-4 pb-4 space-y-2 text-xs">
                <InfoRow label="Started" value={bridgeStatus.started_at ? new Date(bridgeStatus.started_at).toLocaleString() : '—'} />
                <InfoRow label="Consumer" value={bridgeStatus.consumer_connected ? 'Connected' : 'Disconnected'} />
                <InfoRow label="Producer" value={bridgeStatus.producer_connected ? 'Connected' : 'Disconnected'} />
                <InfoRow label="Status" value={isPaused ? 'Paused' : 'Running'} />
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatusPill({ label, connected }: { label: string; connected: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${
      connected
        ? 'border-success/30 bg-success/5 text-success'
        : 'border-destructive/30 bg-destructive/5 text-destructive'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-success animate-pulse-dot' : 'bg-destructive'}`} />
      {label}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
  );
}
