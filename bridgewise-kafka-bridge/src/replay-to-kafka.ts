/**
 * Replay script: reads processed_events from Supabase and publishes them to internal Kafka.
 * Run: npx tsx src/replay-to-kafka.ts
 */
import { config } from 'dotenv';
config(); // Load .env file

import { Kafka } from 'kafkajs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const INTERNAL_KAFKA_BROKERS = (process.env.INTERNAL_KAFKA_BROKERS || 'localhost:9092').split(',');
const TOPIC_RAW = process.env.INTERNAL_TOPIC_RAW || 'bridgewise.alerts.raw';
const TOPIC_NORMALIZED = process.env.INTERNAL_TOPIC_NORMALIZED || 'bridgewise.alerts.normalized';

async function main() {
  console.log('📡 Connecting to Supabase...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log('📡 Connecting to internal Kafka...');
  const kafka = new Kafka({ clientId: 'replay-script', brokers: INTERNAL_KAFKA_BROKERS });
  const producer = kafka.producer();
  await producer.connect();
  console.log('✅ Connected to Kafka');

  const { data: events, error } = await supabase
    .from('processed_events')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Error fetching events:', error.message);
    process.exit(1);
  }

  console.log(`📦 Found ${events.length} events to replay`);

  let sent = 0;
  for (const event of events) {
    try {
      // Publish raw
      if (event.raw_payload_json) {
        await producer.send({
          topic: TOPIC_RAW,
          messages: [{
            key: event.unique_event_id,
            value: JSON.stringify(event.raw_payload_json),
          }],
        });
      }

      // Publish normalized
      if (event.normalized_payload_json) {
        await producer.send({
          topic: TOPIC_NORMALIZED,
          messages: [{
            key: event.unique_event_id,
            value: JSON.stringify(event.normalized_payload_json),
          }],
        });
      }

      sent++;
      console.log(`  ✅ [${sent}/${events.length}] ${event.unique_event_id} (${event.ticker || 'N/A'})`);
    } catch (err: any) {
      console.error(`  ❌ Failed: ${event.unique_event_id}`, err.message);
    }
  }

  await producer.disconnect();
  console.log(`\n🎉 Replay complete: ${sent}/${events.length} events sent to Kafka`);
  process.exit(0);
}

main();
