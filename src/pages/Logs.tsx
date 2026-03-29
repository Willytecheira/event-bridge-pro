import { useState } from 'react';
import { useLogs } from '@/hooks/useEvents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollText } from 'lucide-react';

const LEVEL_COLORS: Record<string, string> = {
  error: 'bg-destructive/10 text-destructive border-destructive/30',
  warn: 'bg-warning/10 text-warning border-warning/30',
  info: 'bg-accent/10 text-accent border-accent/30',
  debug: 'bg-muted text-muted-foreground border-border',
};

export default function LogsPage() {
  const [level, setLevel] = useState<string>('');
  const [module, setModule] = useState<string>('');
  const { data: logs, isLoading } = useLogs({
    level: level && level !== 'all' ? level : undefined,
    module: module && module !== 'all' ? module : undefined,
    limit: 200,
  });

  const uniqueModules = [...new Set(logs?.map((l) => l.module) ?? [])];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-primary" />
          Service Logs
        </h2>
        <div className="flex gap-2">
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="warn">Warn</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
            </SelectContent>
          </Select>
          <Select value={module} onValueChange={setModule}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="All Modules" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              {uniqueModules.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-border/50 bg-card">
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[70vh]">
            <table className="w-full text-xs font-mono">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-border/50 text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium w-36">Time</th>
                  <th className="px-3 py-2 text-left font-medium w-16">Level</th>
                  <th className="px-3 py-2 text-left font-medium w-28">Module</th>
                  <th className="px-3 py-2 text-left font-medium">Message</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">Loading...</td></tr>
                )}
                {logs?.map((log) => (
                  <tr key={log.id} className="border-b border-border/20 hover:bg-muted/20">
                    <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </td>
                    <td className="px-3 py-1.5">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${LEVEL_COLORS[log.level] || ''}`}>
                        {log.level}
                      </Badge>
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground">{log.module}</td>
                    <td className="px-3 py-1.5 text-foreground">{log.message}</td>
                  </tr>
                ))}
                {!isLoading && (!logs || logs.length === 0) && (
                  <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">No logs found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
