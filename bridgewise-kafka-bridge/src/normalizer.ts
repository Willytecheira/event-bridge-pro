import { createLogger } from './logger.js';

const logger = createLogger('normalizer');

export interface NormalizedEvent {
  event_id: string;
  source: string;
  external_topic: string;
  event_name: string;
  event_type: string;
  event_date_utc: string;
  sentiment: string;
  importance_level: number;
  ticker: string | null;
  exchange: string | null;
  asset_id: string | null;
  company_id: string | null;
  trading_item_id: string | null;
  asset_name: string | null;
  asset_name_short: string | null;
  asset_type: string | null;
  currency: string | null;
  primary_exchange_country: string | null;
  domicile_country: string | null;
  asset_trigger_price: number | null;
  asset_threshold_price: number | null;
  asset_change_percent: number | null;
  title_en: string | null;
  body_en: string | null;
  title_es: string | null;
  body_es: string | null;
  title_pt: string | null;
  body_pt: string | null;
  has_reasoning: boolean;
  reasoning_count: number;
  reasoning: any[];
  raw_received_at: string;
  processed_at: string;
}

function getContent(eventContent: any, locale: string): { title: string | null; body: string | null } {
  if (!eventContent) return { title: null, body: null };

  // Try exact locale
  const content = eventContent[locale];
  if (content) {
    return {
      title: content.title || content.eventTitle || null,
      body: content.body || content.eventBody || null,
    };
  }
  return { title: null, body: null };
}

export function normalizeEvent(raw: any): NormalizedEvent {
  const meta = raw.eventMetadata || {};
  const assets = raw.assetsDetails?.[0] || {};
  const eventContent = raw.eventContent || {};
  const reasoning = raw.reasoning || [];

  // Content with fallbacks
  const en = getContent(eventContent, 'en-US');
  let es = getContent(eventContent, 'es-ES');
  if (!es.title && !es.body) es = en; // fallback to en-US
  const pt = getContent(eventContent, 'pt-BR'); // null if missing

  const normalized: NormalizedEvent = {
    event_id: meta.uniqueEventId || '',
    source: 'bridgewise',
    external_topic: 'alerts-reasoning-external',
    event_name: meta.eventName || meta.eventType || '',
    event_type: meta.eventType || '',
    event_date_utc: meta.eventDate || new Date().toISOString(),
    sentiment: meta.eventSentiment || 'UNKNOWN',
    importance_level: meta.eventImportanceLevel ?? 0,
    ticker: assets.ticker || assets.symbol || null,
    exchange: assets.exchange || null,
    asset_id: assets.assetId?.toString() || null,
    company_id: assets.companyId?.toString() || null,
    trading_item_id: assets.tradingItemId?.toString() || null,
    asset_name: assets.assetName || assets.companyName || null,
    asset_name_short: assets.assetNameShort || assets.ticker || null,
    asset_type: assets.assetType || null,
    currency: assets.currency || null,
    primary_exchange_country: assets.primaryExchangeCountry || null,
    domicile_country: assets.domicileCountry || null,
    asset_trigger_price: assets.triggerPrice ?? null,
    asset_threshold_price: assets.thresholdPrice ?? null,
    asset_change_percent: assets.changePercent ?? null,
    title_en: en.title,
    body_en: en.body,
    title_es: es.title,
    body_es: es.body,
    title_pt: pt.title,
    body_pt: pt.body,
    has_reasoning: Array.isArray(reasoning) && reasoning.length > 0,
    reasoning_count: Array.isArray(reasoning) ? reasoning.length : 0,
    reasoning: Array.isArray(reasoning) ? reasoning : [],
    raw_received_at: new Date().toISOString(),
    processed_at: new Date().toISOString(),
  };

  return normalized;
}
