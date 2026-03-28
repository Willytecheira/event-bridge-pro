import { useState, useEffect, useCallback } from 'react';
import { useAuth, bridgeApi, demoData } from '@/lib/bridge-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, AlertTriangle, CheckCircle2, Clock, Copy, 
  LogOut, Pause, Play, RefreshCw, Server, Zap, XCircle,
  ArrowUpRight, ArrowDownRight, Minus, Database, Radio
} from 'lucide-react';

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
  const { logout, email } = useAuth();
  const [status, setStatus] = useState<any>(demoData.status);
  const [events, setEvents] = useState<any[]>(demoData.events);
  const [errors, setErrors] = useState<any[]>(demoData.errors);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(10);
  const [isPaused, setIsPaused] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchData = useCallback(async () => {
    const [metricsRes, eventsRes, errorsRes] = await Promise.all([
      bridgeApi.getMetrics(),
      bridgeApi.getEvents({ limit: '10' }),
      bridgeApi.getErrors({ limit: '5' }),
    ]);
    if (metricsRes) setStatus(metricsRes);
    if (eventsRes?.rows) setEvents(eventsRes.rows);
    if (errorsRes?.rows) setErrors(errorsRes.rows);
    setLastRefresh(new Date());
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchData, refreshInterval * 1000);
    return () => clearInterval(id);
  }, [autoRefresh, refreshInterval, fetchData]);

  const togglePause = async () => {
    if (isPaused) {
      await bridgeApi.resume();
      setIsPaused(false);
    } else {
      await bridgeApi.pause();
      setIsPaused(true);
    }
  };

  const kpiCards = [
    { label: 'Events Processed', value: status.total_processed?.toLocaleString() || status.events_processed?.toLocaleString(), icon: CheckCircle2, color: 'text-success' },
    { label: 'Duplicates', value: status.total_duplicates?.toLocaleString() || status.events_duplicated?.toLocaleString(), icon: Copy, color: 'text-warning' },
    { label: 'Errors', value: status.total_errors?.toLocaleString() || status.events_errored?.toLocaleString(), icon: AlertTriangle, color: 'text-destructive' },
    { label: 'Last Hour', value: status.events_last_hour?.toLocaleString() || '—', icon: Activity, color: 'text-accent' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold tracking-tight">Kafka Bridge</span>
            <Badge variant="outline" className="text-xs font-mono border-primary/30 text-primary">v1.0</Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className={`h-3 w-3 ${autoRefresh ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
              <button onClick={() => setAutoRefresh(!autoRefresh)} className="hover:text-foreground transition-colors">
                {autoRefresh ? `${refreshInterval}s` : 'Paused'}
              </button>
            </div>
            <span className="text-xs text-muted-foreground">{email}</span>
            <Button variant="ghost" size="sm" onClick={logout} className="h-8 w-8 p-0">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 space-y-6">
        {/* Connection Status Bar */}
        <div className="flex flex-wrap gap-3 items-center">
          <StatusPill label="Consumer" connected={status.consumer_connected} />
          <StatusPill label="Producer" connected={status.producer_connected} />
          <StatusPill label="Database" connected={status.database === 'connected'} />
          <div className="flex-1" />
          <span className="text-xs text-muted-foreground">
            Uptime: <span className="font-mono text-foreground">{formatUptime(status.uptime_seconds)}</span>
          </span>
          <span className="text-xs text-muted-foreground">
            Last msg: <span className="font-mono text-foreground">{timeAgo(status.last_message_at)}</span>
          </span>
          <Button variant="outline" size="sm" onClick={togglePause} className="h-7 text-xs gap-1">
            {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
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

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Events */}
          <div className="lg:col-span-2">
            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Radio className="h-4 w-4 text-primary" />
                    Recent Events
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">Last 10</span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
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
                      {events.map((evt) => (
                        <tr key={evt.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
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
              </CardContent>
            </Card>
          </div>

          {/* Recent Errors */}
          <div>
            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Recent Errors
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {errors.map((err) => (
                  <div key={err.id} className="rounded-lg border border-border/50 p-3 space-y-2 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <Badge variant={err.status === 'resolved' ? 'secondary' : 'destructive'} className="text-xs">
                        {err.stage}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">{timeAgo(err.created_at)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 font-mono">{err.error_message}</p>
                    {err.status === 'unresolved' && (
                      <Button variant="ghost" size="sm" className="h-6 text-xs text-accent hover:text-accent"
                        onClick={() => bridgeApi.reprocessError(err.id)}>
                        Mark Resolved
                      </Button>
                    )}
                  </div>
                ))}
                {errors.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No errors 🎉</p>
                )}
              </CardContent>
            </Card>

            {/* System Info */}
            <Card className="border-border/50 bg-card mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Server className="h-4 w-4 text-accent" />
                  System
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <InfoRow label="Started" value={status.started_at ? new Date(status.started_at).toLocaleString() : '—'} />
                <InfoRow label="Consumer" value={status.consumer_connected ? 'Connected' : 'Disconnected'} />
                <InfoRow label="Producer" value={status.producer_connected ? 'Connected' : 'Disconnected'} />
                <InfoRow label="Status" value={isPaused ? 'Paused' : 'Running'} />
                <InfoRow label="Refreshed" value={lastRefresh.toLocaleTimeString()} />
              </CardContent>
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
