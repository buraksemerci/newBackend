import { z } from 'zod';

/**
 * Connection Request Schemas - Zod Validation
 */

// Send connection request
export const sendRequestSchema = z.object({
    receiverId: z.string().uuid(),
});
export type SendRequestInput = z.infer<typeof sendRequestSchema>;

// Accept/Decline/Cancel/Remove request
export const connectionActionSchema = z.object({
    userId: z.string().uuid(),
});
export type ConnectionActionInput = z.infer<typeof connectionActionSchema>;

// Block user
export const blockUserSchema = z.object({
    userId: z.string().uuid(),
});
export type BlockUserInput = z.infer<typeof blockUserSchema>;

// Update privacy settings
export const updatePrivacySchema = z.object({
    profileVisibility: z.enum(['EVERYONE', 'CONNECTIONS_ONLY', 'NOBODY']).optional(),
    canReceiveRequestsFrom: z.enum(['EVERYONE', 'NOBODY']).optional(),
});
export type UpdatePrivacyInput = z.infer<typeof updatePrivacySchema>;
