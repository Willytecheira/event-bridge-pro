import { useParams, useNavigate } from 'react-router-dom';
import { useEvent } from '@/hooks/useEvents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: event, isLoading } = useEvent(id ?? null);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!event) return <div className="p-8 text-center text-muted-foreground">Event not found</div>;

  const SentimentIcon = event.sentiment === 'BULLISH' ? ArrowUpRight :
    event.sentiment === 'BEARISH' ? ArrowDownRight : Minus;
  const sentimentColor = event.sentiment === 'BULLISH' ? 'text-success' :
    event.sentiment === 'BEARISH' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <h2 className="text-lg font-semibold font-mono">{event.unique_event_id}</h2>
        <Badge variant="secondary">{event.event_type}</Badge>
        <span className={`flex items-center gap-1 ${sentimentColor}`}>
          <SentimentIcon className="h-4 w-4" />
          {event.sentiment}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Ticker', value: event.ticker },
          { label: 'Asset Type', value: event.asset_type },
          { label: 'Status', value: event.status },
          { label: 'Kafka Published', value: event.published_to_internal_kafka ? 'Yes' : 'No' },
          { label: 'Has Reasoning', value: event.has_reasoning ? 'Yes' : 'No' },
          { label: 'Source', value: event.source },
          { label: 'Event Date', value: event.event_date_utc ? new Date(event.event_date_utc).toLocaleString() : '—' },
          { label: 'Processed At', value: new Date(event.created_at).toLocaleString() },
        ].map((item) => (
          <Card key={item.label} className="border-border/50 bg-card">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="font-mono text-sm font-medium mt-1">{item.value || '—'}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Raw Payload</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs font-mono bg-muted/30 p-4 rounded-lg overflow-auto max-h-96 text-muted-foreground">
              {event.raw_payload_json ? JSON.stringify(event.raw_payload_json, null, 2) : 'No raw payload'}
            </pre>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Normalized Payload</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs font-mono bg-muted/30 p-4 rounded-lg overflow-auto max-h-96 text-muted-foreground">
              {event.normalized_payload_json ? JSON.stringify(event.normalized_payload_json, null, 2) : 'No normalized payload'}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
