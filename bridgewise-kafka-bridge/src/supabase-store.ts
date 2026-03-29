import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './config.js';
import { createLogger } from './logger.js';
import type { NormalizedEvent } from './normalizer.js';

const logger = createLogger('store');

export class SupabaseStore {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(
      env('SUPABASE_URL'),
      env('SUPABASE_SERVICE_ROLE_KEY')
    );
  }

  async isDuplicate(uniqueEventId: string): Promise<boolean> {
    const { data } = await this.client
      .from('processed_events')
      .select('id')
      .eq('unique_event_id', uniqueEventId)
      .maybeSingle();
    return !!data;
  }

  async recordDuplicate(uniqueEventId: string, rawPayload: any) {
    await this.client.from('duplicate_events').insert({
      unique_event_id: uniqueEventId,
      raw_payload_json: rawPayload,
    });
    logger.debug({ uniqueEventId }, 'Duplicate recorded');
  }

  async saveProcessedEvent(event: NormalizedEvent, rawPayload: any, publishedToKafka: boolean) {
    const { error } = await this.client.from('processed_events').insert({
      unique_event_id: event.event_id,
      source: event.source,
      external_topic: event.external_topic,
      raw_payload_json: rawPayload,
      normalized_payload_json: event as any,
      event_type: event.event_type,
      ticker: event.ticker,
      asset_type: event.asset_type,
      sentiment: event.sentiment,
      event_date_utc: event.event_date_utc,
      has_reasoning: event.has_reasoning,
      status: 'processed',
      published_to_internal_kafka: publishedToKafka,
    });
    if (error) {
      logger.error({ error, uniqueEventId: event.event_id }, 'Failed to save processed event');
      throw error;
    }
  }

  async saveError(stage: string, errorMessage: string, uniqueEventId?: string, rawPayload?: string, stackTrace?: string) {
    await this.client.from('processing_errors').insert({
      stage,
      unique_event_id: uniqueEventId ?? null,
      raw_payload_text: rawPayload ?? null,
      error_message: errorMessage,
      stack_trace: stackTrace ?? null,
      status: 'unresolved',
    });
  }

  async log(level: string, module: string, message: string, metadata?: any) {
    await this.client.from('service_logs').insert({
      level,
      module,
      message,
      metadata_json: metadata ?? null,
    });
  }
}
