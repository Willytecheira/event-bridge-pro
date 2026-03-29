# Bridgewise Kafka Bridge - Deployment Guide

## Quick Start

### 1. Clone and configure
```bash
cd bridgewise-kafka-bridge
cp .env.example .env
# Edit .env with your actual credentials
```

### 2. Get your Supabase Service Role Key
Go to your Lovable Cloud project → Cloud → Settings to find your `SUPABASE_SERVICE_ROLE_KEY`.
Set it in `.env` along with your `SUPABASE_URL`.

### 3. Configure Kafka credentials
Edit `.env` with your Bridgewise external Kafka credentials:
```env
BRIDGEWISE_KAFKA_BROKERS=your-broker:9093
BRIDGEWISE_KAFKA_USERNAME=your-username
BRIDGEWISE_KAFKA_PASSWORD=your-password
BRIDGEWISE_TOPIC=alerts-reasoning-external
```

And your internal Kafka:
```env
INTERNAL_KAFKA_BROKERS=your-internal-broker:9092
```

### 4. Deploy with Docker
```bash
docker-compose up -d --build
```

### 5. Check logs
```bash
docker-compose logs -f bridge-worker
```

## Architecture

```
Bridgewise External Kafka          Your Internal Kafka
 (alerts-reasoning-external)         (bridgewise.alerts.raw)
         │                           (bridgewise.alerts.normalized)
         │                                    ▲
         ▼                                    │
  ┌──────────────────────────────────────────────┐
  │           Bridge Worker (Node.js)             │
  │                                              │
  │  1. Consume message                          │
  │  2. Strip 5 bytes                            │
  │  3. Parse JSON                               │
  │  4. Validate fields                          │
  │  5. Check duplicates (DB)                    │
  │  6. Normalize event                          │
  │  7. Publish to internal Kafka                │
  │  8. Persist to Lovable Cloud DB              │
  └──────────────────┬───────────────────────────┘
                     │
                     ▼
              Lovable Cloud DB
         (processed_events, errors,
          duplicates, service_logs)
                     │
                     ▼
           Admin Panel (Lovable)
        Dashboard, Charts, Logs, Users
```

## Processing Pipeline

For each message:
1. **Raw Processing**: Receive bytes → strip first 5 bytes → convert to UTF-8
2. **JSON Parse**: Parse the cleaned string as JSON
3. **Validation**: Verify `eventMetadata`, `uniqueEventId`, `eventType`, `eventDate`
4. **Deduplication**: Check `uniqueEventId` against DB, skip if exists
5. **Normalization**: Map to internal schema with multilingual content (en-US, es-ES, pt-BR)
6. **Kafka Publish**: Send raw + normalized to internal topics
7. **Persistence**: Save to `processed_events` table
8. **Error Handling**: Any failure saves to `processing_errors` without crashing

## Production Checklist

- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Configure all Kafka credentials
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)
- [ ] Test with a single message before enabling continuous consumption
- [ ] Monitor logs for the first hour of operation
- [ ] Set up alerting on the admin panel for errors

## Troubleshooting

**Consumer won't connect**: Check broker URLs, credentials, and SSL settings.
**Messages not parsing**: Verify the 5-byte strip is correct for your payload format.
**Duplicates increasing**: This is normal - it means the dedup layer is working.
**Errors increasing**: Check the admin panel → Errors for details.
