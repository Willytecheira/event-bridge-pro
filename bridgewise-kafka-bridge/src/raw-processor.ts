import { createLogger } from './logger.js';

const logger = createLogger('processor');

/**
 * Removes the first N bytes from a raw Kafka message buffer
 * and parses the remaining bytes as JSON.
 */
export function processRawPayload(buffer: Buffer, bytesToStrip: number = 5): { success: true; data: any; cleanJson: string } | { success: false; error: string } {
  try {
    if (buffer.length <= bytesToStrip) {
      return { success: false, error: `Payload too short (${buffer.length} bytes, need > ${bytesToStrip})` };
    }

    const stripped = buffer.subarray(bytesToStrip);
    const cleanJson = stripped.toString('utf-8');

    try {
      const data = JSON.parse(cleanJson);
      return { success: true, data, cleanJson };
    } catch (parseErr: any) {
      return { success: false, error: `JSON parse failed: ${parseErr.message}. First 200 chars: ${cleanJson.substring(0, 200)}` };
    }
  } catch (err: any) {
    return { success: false, error: `Raw processing failed: ${err.message}` };
  }
}
