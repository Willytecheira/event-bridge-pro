import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, AlertTriangle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);

  const { data: unresolvedErrors } = useQuery({
    queryKey: ['unresolved-errors-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('processing_errors')
        .select('id, stage, error_message, created_at')
        .eq('status', 'unresolved')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000,
  });

  const count = unresolvedErrors?.length ?? 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 relative">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border/50">
          <p className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Alerts ({count})
          </p>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {unresolvedErrors?.map((err) => (
            <div key={err.id} className="px-3 py-2 border-b border-border/20 hover:bg-muted/20">
              <div className="flex items-center gap-2">
                <XCircle className="h-3 w-3 text-destructive shrink-0" />
                <Badge variant="outline" className="text-[10px]">{err.stage}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1 font-mono">{err.error_message}</p>
            </div>
          ))}
          {count === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">No alerts 🎉</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
