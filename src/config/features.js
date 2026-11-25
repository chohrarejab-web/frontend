/**
 * Configuration des fonctionnalités Maw2idi / SahaTN (Feature Flags)
 */
export const ENABLE_REVIEWS = false;

// Patient-first + Lightweight Doctor Companion mode (excludes Admin console & heavy desktop-only doctor modules)
export const ENABLE_ADMIN_CONSOLE = false;
export const DOCTOR_COMPANION_MODE = true;
export const DOCTOR_COMPANION_TABS = ['agenda', 'retard', 'teleconsult'];
