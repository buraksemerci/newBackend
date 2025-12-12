/**
 * Social Connection System Configuration
 * 
 * This file contains all configurable parameters for the social connection system.
 * Limits can be adjusted here without touching core business logic.
 */

export const SOCIAL_CONFIG = {
    // Connection Limits
    MAX_CONNECTIONS: 100, // Maximum number of friends a user can have
    MAX_PENDING_SENT: 50, // Maximum number of pending outgoing requests

    // Rate Limits
    DAILY_REQUEST_LIMIT: 20, // Maximum connection requests per day

    // Cooldown Periods
    DECLINE_COOLDOWN_DAYS: 3, // Days to wait after declining before requesting again

    // Privacy Defaults
    DEFAULT_PROFILE_VISIBILITY: 'EVERYONE' as const, // EVERYONE, CONNECTIONS_ONLY, NOBODY
    DEFAULT_CAN_RECEIVE_REQUESTS_FROM: 'EVERYONE' as const, // EVERYONE, NOBODY
} as const;

// Type exports for type safety
export type ProfileVisibility = 'EVERYONE' | 'CONNECTIONS_ONLY' | 'NOBODY';
export type ReceiveRequestsFrom = 'EVERYONE' | 'NOBODY';
export type ConnectionStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';
export type ConnectionEventType =
    | 'CREATED'
    | 'ACCEPTED'
    | 'DECLINED'
    | 'CANCELLED'
    | 'REMOVED'
    | 'BLOCKED'
    | 'UNBLOCKED';
