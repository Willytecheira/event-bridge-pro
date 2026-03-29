import { useEventsByHour, useEventDistribution } from '@/hooks/useEvents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, PieChart as PieIcon } from 'lucide-react';

const COLORS = [
  'hsl(142, 70%, 45%)',
  'hsl(200, 80%, 50%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 72%, 55%)',
  'hsl(280, 65%, 60%)',
  'hsl(172, 66%, 40%)',
];

export default function MetricsCharts() {
  const { data: hourlyData } = useEventsByHour();
  const { data: distribution } = useEventDistribution();

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2 border-border/50 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Events per Hour (24h)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourlyData ?? []}>
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'hsl(215, 12%, 55%)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(215, 12%, 55%)' }} tickLine={false} axisLine={false} width={30} />
              <Tooltip
                contentStyle={{ background: 'hsl(220, 18%, 9%)', border: '1px solid hsl(220, 14%, 16%)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: 'hsl(210, 20%, 92%)' }}
              />
              <Bar dataKey="count" fill="hsl(142, 70%, 45%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-accent" />
              By Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            {distribution?.byType && distribution.byType.length > 0 ? (
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={distribution.byType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} innerRadius={30}>
                    {distribution.byType.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(220, 18%, 9%)', border: '1px solid hsl(220, 14%, 16%)', borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">No data</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-warning" />
              By Sentiment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {distribution?.bySentiment && distribution.bySentiment.length > 0 ? (
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={distribution.bySentiment} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} innerRadius={30}>
                    {distribution.bySentiment.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(220, 18%, 9%)', border: '1px solid hsl(220, 14%, 16%)', borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">No data</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
