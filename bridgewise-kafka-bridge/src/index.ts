import 'dotenv/config';
import { createLogger } from './logger.js';
import { ExternalConsumer } from './external-consumer.js';
import { InternalProducer } from './internal-producer.js';
import { EventPipeline } from './pipeline.js';
import { SupabaseStore } from './supabase-store.js';

const logger = createLogger('main');

async function main() {
  logger.info('🚀 Bridgewise Kafka Bridge starting...');

  const store = new SupabaseStore();
  const producer = new InternalProducer();
  const pipeline = new EventPipeline(store, producer);
  const consumer = new ExternalConsumer(pipeline);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    await consumer.stop();
    await producer.disconnect();
    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  try {
    await producer.connect();
    await consumer.start();
    logger.info('✅ Bridge is running. Consuming messages...');
  } catch (err) {
    logger.error({ err }, 'Fatal error during startup');
    process.exit(1);
  }
}

main();
