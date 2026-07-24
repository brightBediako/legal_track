"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.throttleEnv = throttleEnv;
function throttleEnv() {
    const ttl = positiveInt(process.env.THROTTLE_TTL_MS, 60000);
    return {
        disabled: process.env.THROTTLE_DISABLED === 'true',
        ttl,
        limit: positiveInt(process.env.THROTTLE_LIMIT, 120),
        authLimit: positiveInt(process.env.THROTTLE_AUTH_LIMIT, 10),
        uploadLimit: positiveInt(process.env.THROTTLE_UPLOAD_LIMIT, 20),
    };
}
function positiveInt(raw, fallback) {
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}
