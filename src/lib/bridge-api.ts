import { create } from 'zustand';

// Mock API base URL - configure to your actual bridge API
const API_BASE = import.meta.env.VITE_BRIDGE_API_URL || 'http://localhost:3500';

interface AuthState {
  token: string | null;
  email: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

// Simulated store - in production, this connects to your Fastify API
export const useAuth = create<AuthState>((set) => ({
  token: localStorage.getItem('bridge_token'),
  email: localStorage.getItem('bridge_email'),
  isAuthenticated: !!localStorage.getItem('bridge_token'),
  login: async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error('Invalid credentials');
      const data = await res.json();
      localStorage.setItem('bridge_token', data.token);
      localStorage.setItem('bridge_email', data.email);
      set({ token: data.token, email: data.email, isAuthenticated: true });
    } catch {
      // Demo mode: allow login with any credentials
      const demoToken = 'demo-token';
      localStorage.setItem('bridge_token', demoToken);
      localStorage.setItem('bridge_email', email);
      set({ token: demoToken, email, isAuthenticated: true });
    }
  },
  logout: () => {
    localStorage.removeItem('bridge_token');
    localStorage.removeItem('bridge_email');
    set({ token: null, email: null, isAuthenticated: false });
  },
}));

// API helper
async function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem('bridge_token');
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });
    if (res.ok) return res.json();
  } catch {
    // API not available, return null for demo mode
  }
  return null;
}

export const bridgeApi = {
  getHealth: () => apiFetch('/health'),
  getHealthDetailed: () => apiFetch('/health/detailed'),
  getMetrics: () => apiFetch('/metrics'),
  getEvents: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch(`/events${qs}`);
  },
  getEvent: (id: string) => apiFetch(`/events/${id}`),
  getErrors: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch(`/errors${qs}`);
  },
  reprocessError: (id: string) => apiFetch(`/errors/${id}/reprocess`, { method: 'POST' }),
  getLogs: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch(`/logs${qs}`);
  },
  pause: () => apiFetch('/service/pause', { method: 'POST' }),
  resume: () => apiFetch('/service/resume', { method: 'POST' }),
  testConnections: () => apiFetch('/connections/test', { method: 'POST' }),
};

// Demo data for when API is not connected
export const demoData = {
  status: {
    uptime_seconds: 86423,
    consumer_connected: true,
    producer_connected: true,
    is_paused: false,
    last_message_at: new Date(Date.now() - 12000).toISOString(),
    events_processed: 14832,
    events_duplicated: 237,
    events_errored: 18,
    started_at: new Date(Date.now() - 86423000).toISOString(),
    total_processed: 14832,
    total_errors: 18,
    total_duplicates: 237,
    events_last_hour: 142,
    database: 'connected',
  },
  events: [
    { id: '1', unique_event_id: 'evt-001-abc', event_type: 'PRICE_MOMENTUM', ticker: 'AAPL', sentiment: 'BULLISH', asset_type: 'EQUITY', has_reasoning: true, status: 'processed', published_to_internal_kafka: true, created_at: new Date(Date.now() - 60000).toISOString(), event_date_utc: new Date(Date.now() - 60000).toISOString() },
    { id: '2', unique_event_id: 'evt-002-def', event_type: 'EARNINGS_SURPRISE', ticker: 'MSFT', sentiment: 'BULLISH', asset_type: 'EQUITY', has_reasoning: false, status: 'processed', published_to_internal_kafka: true, created_at: new Date(Date.now() - 120000).toISOString(), event_date_utc: new Date(Date.now() - 120000).toISOString() },
    { id: '3', unique_event_id: 'evt-003-ghi', event_type: 'VOLUME_SPIKE', ticker: 'TSLA', sentiment: 'BEARISH', asset_type: 'EQUITY', has_reasoning: true, status: 'processed', published_to_internal_kafka: true, created_at: new Date(Date.now() - 300000).toISOString(), event_date_utc: new Date(Date.now() - 300000).toISOString() },
    { id: '4', unique_event_id: 'evt-004-jkl', event_type: 'PRICE_MOMENTUM', ticker: 'AMZN', sentiment: 'BULLISH', asset_type: 'EQUITY', has_reasoning: false, status: 'processed', published_to_internal_kafka: true, created_at: new Date(Date.now() - 600000).toISOString(), event_date_utc: new Date(Date.now() - 600000).toISOString() },
    { id: '5', unique_event_id: 'evt-005-mno', event_type: 'SECTOR_ROTATION', ticker: 'XLF', sentiment: 'NEUTRAL', asset_type: 'ETF', has_reasoning: true, status: 'processed', published_to_internal_kafka: true, created_at: new Date(Date.now() - 900000).toISOString(), event_date_utc: new Date(Date.now() - 900000).toISOString() },
  ],
  errors: [
    { id: 'e1', stage: 'json_parse', unique_event_id: null, error_message: 'Unexpected token at position 0', status: 'unresolved', created_at: new Date(Date.now() - 3600000).toISOString() },
    { id: 'e2', stage: 'validation', unique_event_id: 'evt-bad-001', error_message: 'Missing eventMetadata.eventType', status: 'unresolved', created_at: new Date(Date.now() - 7200000).toISOString() },
    { id: 'e3', stage: 'kafka_publish', unique_event_id: 'evt-006-pqr', error_message: 'Connection timeout to internal broker', status: 'resolved', created_at: new Date(Date.now() - 14400000).toISOString() },
  ],
};
