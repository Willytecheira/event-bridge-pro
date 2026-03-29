import { Kafka, Producer, CompressionTypes } from 'kafkajs';
import { env } from './config.js';
import { createLogger } from './logger.js';
import type { NormalizedEvent } from './normalizer.js';

const logger = createLogger('producer');

export class InternalProducer {
  private kafka: Kafka;
  private producer: Producer;
  private topicRaw: string;
  private topicNormalized: string;
  private topicErrors: string;

  constructor() {
    const brokers = env('INTERNAL_KAFKA_BROKERS').split(',');
    this.kafka = new Kafka({
      clientId: env('INTERNAL_KAFKA_CLIENT_ID', 'bridgewise-bridge'),
      brokers,
    });
    this.producer = this.kafka.producer({ idempotent: true });
    this.topicRaw = env('INTERNAL_TOPIC_RAW', 'bridgewise.alerts.raw');
    this.topicNormalized = env('INTERNAL_TOPIC_NORMALIZED', 'bridgewise.alerts.normalized');
    this.topicErrors = env('INTERNAL_TOPIC_ERRORS', 'bridgewise.alerts.errors');
  }

  async connect() {
    await this.producer.connect();
    logger.info('Connected to internal Kafka');
  }

  async disconnect() {
    await this.producer.disconnect();
    logger.info('Disconnected from internal Kafka');
  }

  async publishRaw(uniqueEventId: string, cleanJson: string): Promise<boolean> {
    try {
      await this.producer.send({
        topic: this.topicRaw,
        messages: [{ key: uniqueEventId, value: cleanJson }],
      });
      logger.debug({ uniqueEventId, topic: this.topicRaw }, 'Published raw');
      return true;
    } catch (err: any) {
      logger.error({ err, uniqueEventId }, 'Failed to publish raw');
      return false;
    }
  }

  async publishNormalized(uniqueEventId: string, normalized: NormalizedEvent): Promise<boolean> {
    try {
      await this.producer.send({
        topic: this.topicNormalized,
        messages: [{ key: uniqueEventId, value: JSON.stringify(normalized) }],
      });
      logger.debug({ uniqueEventId, topic: this.topicNormalized }, 'Published normalized');
      return true;
    } catch (err: any) {
      logger.error({ err, uniqueEventId }, 'Failed to publish normalized');
      return false;
    }
  }

  async publishError(error: { stage: string; message: string; uniqueEventId?: string }) {
    try {
      await this.producer.send({
        topic: this.topicErrors,
        messages: [{ key: error.uniqueEventId || 'unknown', value: JSON.stringify(error) }],
      });
    } catch {
      // Best effort
    }
  }
}
