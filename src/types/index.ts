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

export const VerificationTokenType = {
    EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
    PASSWORD_RESET: 'PASSWORD_RESET',
} as const;
export type VerificationTokenType = (typeof VerificationTokenType)[keyof typeof VerificationTokenType];

export const Somatotype = {
    ECTOMORPH: 'ECTOMORPH',
    MESOMORPH: 'MESOMORPH',
    ENDOMORPH: 'ENDOMORPH',
} as const;
export type Somatotype = (typeof Somatotype)[keyof typeof Somatotype];

/** User Experience/Fitness Level - Now uses Int IDs */
export const ExperienceLevel = {
    BEGINNER: 1,
    INTERMEDIATE: 2,
    ADVANCED: 3,
} as const;
export type ExperienceLevel = (typeof ExperienceLevel)[keyof typeof ExperienceLevel];

// ============================================================================
// MASTER DATA KEYS - Used for database keys and mobile/backend consistency
// ============================================================================

/** Fitness Goal Keys */
export const FitnessGoalKey = {
    LOSE_WEIGHT: 'LOSE_WEIGHT',
    BUILD_MUSCLE: 'BUILD_MUSCLE',
    MAINTAIN: 'MAINTAIN',
    BALANCED: 'BALANCED'
} as const;
export type FitnessGoalKey = (typeof FitnessGoalKey)[keyof typeof FitnessGoalKey];

/** Equipment Keys */
export const EquipmentKey = {
    BODYWEIGHT: 'BODYWEIGHT',
    DUMBBELL: 'DUMBBELL',
    BARBELL: 'BARBELL',
    KETTLEBELL: 'KETTLEBELL',
    RESISTANCE_BAND: 'RESISTANCE_BAND',
    PULL_UP_BAR: 'PULL_UP_BAR',
    BENCH: 'BENCH',
} as const;
export type EquipmentKey = (typeof EquipmentKey)[keyof typeof EquipmentKey];

/** Health Limitation Keys */
export const HealthLimitationKey = {
    BACK_PAIN: 'BACK_PAIN',
    KNEE_INJURY: 'KNEE_INJURY',
    SHOULDER_INJURY: 'SHOULDER_INJURY',
} as const;
export type HealthLimitationKey = (typeof HealthLimitationKey)[keyof typeof HealthLimitationKey];

// ExerciseCategoryKey REMOVED - No longer used in schema

/** Movement Pattern Keys */
export const MovementPatternKey = {
    PUSH: 'PUSH',
    PULL: 'PULL',
    HINGE: 'HINGE',
    SQUAT: 'SQUAT',
    CARRY: 'CARRY',
    ROTATION: 'ROTATION',
} as const;
export type MovementPatternKey = (typeof MovementPatternKey)[keyof typeof MovementPatternKey];

// BodyTargetKey REMOVED - Use MuscleSubgroupKey instead (same values)

/** Muscle Keys */
export const MuscleKey = {
    CHEST: 'CHEST',
    LATS: 'LATS',
    TRAPS: 'TRAPS',
    RHOMBOIDS: 'RHOMBOIDS',
    FRONT_DELTOID: 'FRONT_DELTOID',
    SIDE_DELTOID: 'SIDE_DELTOID',
    REAR_DELTOID: 'REAR_DELTOID',
    BICEPS: 'BICEPS',
    TRICEPS: 'TRICEPS',
    FOREARM: 'FOREARM',
    ABS: 'ABS',
    OBLIQUES: 'OBLIQUES',
    LOWER_BACK: 'LOWER_BACK',
    CALVES: 'CALVES',
    QUADRICEPS: 'QUADRICEPS',
    HAMSTRINGS: 'HAMSTRINGS',
    GLUTES: 'GLUTES',
    HIP_FLEXORS: 'HIP_FLEXORS',
} as const;
export type MuscleKey = (typeof MuscleKey)[keyof typeof MuscleKey];

/** Muscle Group */
export const MuscleGroup = {
    UPPER_BODY: 'UPPER_BODY',
    CORE: 'CORE',
    LOWER_BODY: 'LOWER_BODY',
} as const;
export type MuscleGroup = (typeof MuscleGroup)[keyof typeof MuscleGroup];

/** Muscle Subgroup - Updated to match schema */
export const MuscleSubgroupKey = {
    CHEST: 'CHEST',
    BACK: 'BACK',
    SHOULDERS: 'SHOULDERS',
    ARMS: 'ARMS',
    ABS: 'ABS',
    WAIST: 'WAIST',
    LEGS: 'LEGS',
    GLUTES: 'GLUTES',
    THIGHS: 'THIGHS',
} as const;
export type MuscleSubgroupKey = (typeof MuscleSubgroupKey)[keyof typeof MuscleSubgroupKey];

/** Attribute Keys - For exercise and fitness goal attributes */
export const AttributeKey = {
    HYPERTROPHY: 'HYPERTROPHY',
    CALORIE_BURN: 'CALORIE_BURN',
    AESTHETIC_SHAPING: 'AESTHETIC_SHAPING',
    STRENGTH_BASE: 'STRENGTH_BASE',
} as const;
export type AttributeKey = (typeof AttributeKey)[keyof typeof AttributeKey];

/** Compound Level - Exercise complexity (1, 5, 10) */
export const CompoundLevel = {
    LOW: 1,
    MEDIUM: 5,
    HIGH: 10,
} as const;
export type CompoundLevel = (typeof CompoundLevel)[keyof typeof CompoundLevel];

/** Effect On Muscle - Muscle contribution level (1, 5, 10) */
export const EffectOnMuscle = {
    STABILIZER: 1,
    SECONDARY: 5,
    PRIMARY: 10,
} as const;
export type EffectOnMuscle = (typeof EffectOnMuscle)[keyof typeof EffectOnMuscle];

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
        somatotype: string;
    } | null;
    goals: {
        fitnessGoal: { id: number; key: string } | null;
        bodyTargets: { id: number; key: string }[];
    } | null;
    settings: {
        preferredUnit: Unit;
        languageId: number;
        theme: Theme;
        workoutReminders: boolean;
        progressUpdates: boolean;
    } | null;
    externalLogins: { provider: string }[];
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
    id: number;
    key: string;
    name: string;
}

export interface LocalizedFitnessGoal extends LocalizedItem { }

export interface LocalizedBodyTarget extends LocalizedItem {
    targetGender: Gender;
}

export interface LocalizedHealthLimitation extends LocalizedItem {
    description?: string;
}

export interface LocalizedEquipment extends LocalizedItem { }

// LocalizedExerciseCategory REMOVED - ExerciseCategory table no longer exists

export interface LocalizedMovementPattern extends LocalizedItem { }

export interface LocalizedMuscle extends LocalizedItem { }

export interface LocalizedExerciseTargetMuscle {
    id: number;
    name: string;
    effectOnMuscle: number;  // 1, 5, or 10
}

export interface LocalizedExercise {
    id: number;
    key: string;
    name: string;
    description?: string;
    movementPattern: LocalizedMovementPattern;
    exerciseExperienceLevel: number;  // Decimal 1.0-3.0
    metValue?: number;
    compoundLevel: number;  // 1, 5, or 10
    targetMuscles: LocalizedExerciseTargetMuscle[];
    equipment: LocalizedEquipment[];
    attributes: { key: string; level: number }[];
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

// Express Request extension for authenticated requests
export interface AuthenticatedUser {
    userId: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthenticatedUser;
        }
    }
}
