"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PresenceService = void 0;
// src/services/presenceService.ts
const redisClient_1 = require("../config/redisClient");
/**
 * Key layout (all string values):
 * - presence:board:{boardId}   -> Set<string> of userIds
 * - typing:card:{cardId}       -> Set<string> of userIds typing
 * - hb:board:{boardId}:{userId}-> "1" with TTL for presence heartbeat
 * - lock:{name}                -> ownerId string with PX TTL (SET NX PX)
 */
class PresenceService {
    // ---------- Board presence ----------
    /**
     * Add user to a board's presence set and (optionally) set a heartbeat.
     * Returns the updated list of users online in the board.
     */
    static async joinBoard(boardId, userId, heartbeatTtlSec = 60) {
        await redisClient_1.redis.sadd(`presence:board:${boardId}`, userId);
        await redisClient_1.redis.set(`hb:board:${boardId}:${userId}`, "1", { ex: heartbeatTtlSec });
        const users = (await redisClient_1.redis.smembers(`presence:board:${boardId}`));
        return users ?? [];
    }
    /**
     * Remove user from the board's presence set.
     * Returns the updated list of users online in the board.
     */
    static async leaveBoard(boardId, userId) {
        await redisClient_1.redis.srem(`presence:board:${boardId}`, userId);
        await redisClient_1.redis.del(`hb:board:${boardId}:${userId}`);
        const users = (await redisClient_1.redis.smembers(`presence:board:${boardId}`));
        return users ?? [];
    }
    /**
     * Return current presence (no cleanup).
     */
    static async listBoard(boardId) {
        const users = (await redisClient_1.redis.smembers(`presence:board:${boardId}`));
        return users ?? [];
    }
    /**
     * Heartbeat to keep the user "online" in a board. Call every ~30s from the client.
     */
    static async heartbeat(boardId, userId, heartbeatTtlSec = 60) {
        // Ensure user is in the set, then refresh TTL on hb key.
        await redisClient_1.redis.sadd(`presence:board:${boardId}`, userId);
        await redisClient_1.redis.set(`hb:board:${boardId}:${userId}`, "1", { ex: heartbeatTtlSec });
    }
    /**
     * Optional cleanup: evict users with missing/expired heartbeats.
     * Returns the updated list after cleanup.
     *
     * NOTE: Upstash doesn't support Lua; this is a best-effort pass.
     * We fetch members and check their heartbeat keys one by one.
     */
    static async cleanupBoard(boardId) {
        const members = (await redisClient_1.redis.smembers(`presence:board:${boardId}`));
        if (!members || members.length === 0)
            return [];
        const alive = [];
        const evicted = [];
        // Parallelize GETs
        const gets = await Promise.all(members.map((uid) => redisClient_1.redis.get(`hb:board:${boardId}:${uid}`)));
        members.forEach((uid, i) => {
            if (gets[i])
                alive.push(uid);
            else
                evicted.push(uid);
        });
        if (evicted.length) {
            // Remove dead users from presence set
            await Promise.all(evicted.map((uid) => redisClient_1.redis.srem(`presence:board:${boardId}`, uid)));
        }
        return alive;
    }
    // ---------- Typing indicators per card ----------
    static async startTyping(cardId, userId) {
        await redisClient_1.redis.sadd(`typing:card:${cardId}`, userId);
        const users = (await redisClient_1.redis.smembers(`typing:card:${cardId}`));
        return users ?? [];
    }
    static async stopTyping(cardId, userId) {
        await redisClient_1.redis.srem(`typing:card:${cardId}`, userId);
        const users = (await redisClient_1.redis.smembers(`typing:card:${cardId}`));
        return users ?? [];
    }
    static async listTyping(cardId) {
        const users = (await redisClient_1.redis.smembers(`typing:card:${cardId}`));
        return users ?? [];
    }
    // ---------- Lightweight distributed locks ----------
    /**
     * Try to acquire a lock with a TTL (in ms). Returns true on success.
     * Example: lockName = `card:${cardId}:move`
     */
    static async acquireLock(lockName, ownerId, ttlMs = 5000) {
        // SET key value NX PX ttl
        const ok = await redisClient_1.redis.set(`lock:${lockName}`, ownerId, { nx: true, px: ttlMs });
        return ok === "OK";
    }
    /**
     * Release a lock if you own it. Returns true if released, false otherwise.
     */
    static async releaseLock(lockName, ownerId) {
        const key = `lock:${lockName}`;
        const current = await redisClient_1.redis.get(key);
        if (current === ownerId) {
            await redisClient_1.redis.del(key);
            return true;
        }
        return false;
    }
    /**
     * Renew lock TTL if you own it. Returns true on success.
     */
    static async extendLock(lockName, ownerId, ttlMs = 5000) {
        const key = `lock:${lockName}`;
        const current = await redisClient_1.redis.get(key);
        if (current === ownerId) {
            // Upstash lacks PEXPIRE; use EXPIRE in seconds (round up) or re-SET.
            const sec = Math.ceil(ttlMs / 1000);
            await redisClient_1.redis.expire(key, sec);
            return true;
        }
        return false;
    }
}
exports.PresenceService = PresenceService;
