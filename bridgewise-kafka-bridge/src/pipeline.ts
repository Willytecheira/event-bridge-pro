import { processRawPayload } from './raw-processor.js';
import { validateEvent } from './validator.js';
import { normalizeEvent } from './normalizer.js';
import { SupabaseStore } from './supabase-store.js';
import { InternalProducer } from './internal-producer.js';
import { createLogger } from './logger.js';

const logger = createLogger('pipeline');
const BYTES_TO_STRIP = parseInt(process.env.BYTES_TO_STRIP || '5', 10);

export class EventPipeline {
  constructor(
    private store: SupabaseStore,
    private producer: InternalProducer
  ) {}

  async process(messageBuffer: Buffer): Promise<void> {
    // Stage 1: Raw processing - strip bytes and parse JSON
    const rawResult = processRawPayload(messageBuffer, BYTES_TO_STRIP);

    if (!rawResult.success) {
      logger.error({ error: rawResult.error }, 'Raw processing failed');
      await this.store.saveError('json_parse', rawResult.error, undefined, messageBuffer.toString('base64').substring(0, 500));
      await this.store.log('error', 'processor', `Raw parse failed: ${rawResult.error}`);
      return;
    }

    const { data: parsed, cleanJson } = rawResult;

    // Stage 2: Validation
    const validation = validateEvent(parsed);
    if (!validation.valid) {
      const errorMsg = `Validation failed: ${validation.errors.join(', ')}`;
      logger.warn({ errors: validation.errors, uniqueEventId: validation.uniqueEventId }, errorMsg);
      await this.store.saveError('validation', errorMsg, validation.uniqueEventId, cleanJson.substring(0, 2000));
      await this.store.log('warn', 'validator', errorMsg, { uniqueEventId: validation.uniqueEventId });
      return;
    }

    const uniqueEventId = validation.uniqueEventId!;

    // Stage 3: Deduplication
    const isDuplicate = await this.store.isDuplicate(uniqueEventId);
    if (isDuplicate) {
      logger.info({ uniqueEventId }, 'Duplicate event detected, skipping');
      await this.store.recordDuplicate(uniqueEventId, parsed);
      await this.store.log('info', 'dedup', `Duplicate skipped: ${uniqueEventId}`);
      return;
    }

    // Stage 4: Normalization
    const normalized = normalizeEvent(parsed);

    // Stage 5: Publish to internal Kafka
    let publishedRaw = false;
    let publishedNormalized = false;
    try {
      publishedRaw = await this.producer.publishRaw(uniqueEventId, cleanJson);
      publishedNormalized = await this.producer.publishNormalized(uniqueEventId, normalized);
    } catch (err: any) {
      logger.error({ err, uniqueEventId }, 'Kafka publish failed');
      await this.store.saveError('kafka_publish', err.message, uniqueEventId);
    }

    const publishedToKafka = publishedRaw && publishedNormalized;

    // Stage 6: Persist to database
    try {
      await this.store.saveProcessedEvent(normalized, parsed, publishedToKafka);
      logger.info({
        uniqueEventId,
        ticker: normalized.ticker,
        type: normalized.event_type,
        sentiment: normalized.sentiment,
        kafkaPublished: publishedToKafka,
      }, 'Event processed successfully');
      await this.store.log('info', 'processor', `Processed: ${uniqueEventId} (${normalized.ticker} ${normalized.event_type})`, {
        ticker: normalized.ticker,
        sentiment: normalized.sentiment,
      });
    } catch (err: any) {
      logger.error({ err, uniqueEventId }, 'Failed to persist event');
      await this.store.saveError('persistence', err.message, uniqueEventId);
    }
  }
}
