import { createLogger } from './logger.js';

const logger = createLogger('validator');

export interface ValidationResult {
  valid: boolean;
  uniqueEventId?: string;
  errors: string[];
}

/**
 * Validates that a parsed event has minimum required fields.
 */
export function validateEvent(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data.eventMetadata) {
    errors.push('Missing eventMetadata');
    return { valid: false, errors };
  }

  const meta = data.eventMetadata;

  if (!meta.uniqueEventId) errors.push('Missing eventMetadata.uniqueEventId');
  if (!meta.eventType) errors.push('Missing eventMetadata.eventType');
  if (!meta.eventDate) errors.push('Missing eventMetadata.eventDate');

  const uniqueEventId = meta.uniqueEventId as string | undefined;

  if (errors.length > 0) {
    logger.warn({ errors, uniqueEventId }, 'Validation failed');
    return { valid: false, uniqueEventId, errors };
  }

  return { valid: true, uniqueEventId, errors: [] };
}
