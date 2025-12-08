// Since SQL Server doesn't support native enums, we define them as constants
// These are used for validation and type safety

export const Gender = {
    MALE: 'MALE',
    FEMALE: 'FEMALE',
    OTHER: 'OTHER',
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

export const DeviceType = {
    IOS: 'IOS',
    ANDROID: 'ANDROID',
    WEB: 'WEB',
} as const;
export type DeviceType = (typeof DeviceType)[keyof typeof DeviceType];

export const ExternalProvider = {
    GOOGLE: 'GOOGLE',
    APPLE: 'APPLE',
    FACEBOOK: 'FACEBOOK',
} as const;
export type ExternalProvider = (typeof ExternalProvider)[keyof typeof ExternalProvider];

export const Theme = {
    LIGHT: 'LIGHT',
    DARK: 'DARK',
    SYSTEM: 'SYSTEM',
} as const;
export type Theme = (typeof Theme)[keyof typeof Theme];

export const Unit = {
    METRIC: 'METRIC',
    IMPERIAL: 'IMPERIAL',
} as const;
export type Unit = (typeof Unit)[keyof typeof Unit];

// User-related types
export interface UserBasicInfo {
    id: string;
    email: string;
    username: string;
    isEmailVerified: boolean;
}

export interface UserWithProfile extends UserBasicInfo {
    profile: {
        firstName: string;
        lastName: string;
        birthDate: Date;
        gender: Gender;
    } | null;
}

export interface UserFullInfo extends UserWithProfile {
    body: {
        heightCm: number;
        weightKg: number;
        targetWeightKg: number | null;
    } | null;
    settings: {
        preferredUnit: Unit;
        preferredLanguage: string;
        theme: Theme;
        workoutReminders: boolean;
        progressUpdates: boolean;
    } | null;
    goalType: {
        id: string;
        key: string;
    } | null;
}

// Auth-related types
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

export interface AuthResponse extends TokenPair {
    user: UserBasicInfo;
}

// Device-related types
export interface DeviceInfo {
    deviceId: string;
    deviceName?: string;
    deviceType: DeviceType;
    fcmToken?: string;
}

export interface ActiveDevice {
    id: string;
    deviceId: string;
    deviceName: string | null;
    deviceType: DeviceType;
    lastActiveAt: Date;
    createdAt: Date;
    isCurrent: boolean;
}

// Registration-related types
export interface RegistrationProfile {
    firstName: string;
    lastName: string;
    birthDate: Date;
    gender: Gender;
}

export interface RegistrationBody {
    heightCm: number;
    weightKg: number;
    targetWeightKg?: number;
}

export interface RegistrationSettings {
    preferredUnit: Unit;
    preferredLanguage: string;
    theme: Theme;
}

export interface RegistrationData {
    email: string;
    password?: string;
    username: string;
    profile: RegistrationProfile;
    body: RegistrationBody;
    settings: RegistrationSettings;
    goalTypeId: string;
    bodyTargetIds: string[];
    healthLimitationIds?: string[];
    equipmentIds: string[];
    workoutLocationIds: string[];
    device: DeviceInfo;
}

// Social auth types
export interface SocialAuthData {
    provider: ExternalProvider;
    providerKey: string;
    email: string;
    emailVerified?: boolean;
}

// Localized data types
export interface LocalizedItem {
    id: string;
    key: string;
    name: string;
}

export interface LocalizedGoalType extends LocalizedItem { }

export interface LocalizedBodyTarget extends LocalizedItem {
    targetGender: Gender;
}

export interface LocalizedHealthLimitation extends LocalizedItem {
    description?: string;
}

export interface LocalizedEquipment extends LocalizedItem {
    isDefault: boolean;
}

export interface LocalizedWorkoutLocation extends LocalizedItem { }

// Pagination types
export interface PaginationParams {
    page: number;
    limit: number;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
