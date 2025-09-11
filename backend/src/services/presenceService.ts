// src/services/presenceService.ts
import { redis } from "../config/redisClient";

/**
 * Key layout (all string values):
 * - presence:board:{boardId}   -> Set<string> of userIds
 * - typing:card:{cardId}       -> Set<string> of userIds typing
 * - hb:board:{boardId}:{userId}-> "1" with TTL for presence heartbeat
 * - lock:{name}                -> ownerId string with PX TTL (SET NX PX)
 */
export class PresenceService {
  // ---------- Board presence ----------

  /**
   * Add user to a board's presence set and (optionally) set a heartbeat.
   * Returns the updated list of users online in the board.
   */
  static async joinBoard(boardId: string, userId: string, heartbeatTtlSec = 60): Promise<string[]> {
    await redis.sadd(`presence:board:${boardId}`, userId);
    await redis.set(`hb:board:${boardId}:${userId}`, "1", { ex: heartbeatTtlSec });
    const users = (await redis.smembers(`presence:board:${boardId}`)) as string[];
    return users ?? [];
  }

  /**
   * Remove user from the board's presence set.
   * Returns the updated list of users online in the board.
   */
  static async leaveBoard(boardId: string, userId: string): Promise<string[]> {
    await redis.srem(`presence:board:${boardId}`, userId);
    await redis.del(`hb:board:${boardId}:${userId}`);
    const users = (await redis.smembers(`presence:board:${boardId}`)) as string[];
    return users ?? [];
  }

  /**
   * Return current presence (no cleanup).
   */
  static async listBoard(boardId: string): Promise<string[]> {
    const users = (await redis.smembers(`presence:board:${boardId}`)) as string[];
    return users ?? [];
  }

  /**
   * Heartbeat to keep the user "online" in a board. Call every ~30s from the client.
   */
  static async heartbeat(boardId: string, userId: string, heartbeatTtlSec = 60): Promise<void> {
    // Ensure user is in the set, then refresh TTL on hb key.
    await redis.sadd(`presence:board:${boardId}`, userId);
    await redis.set(`hb:board:${boardId}:${userId}`, "1", { ex: heartbeatTtlSec });
  }

  /**
   * Optional cleanup: evict users with missing/expired heartbeats.
   * Returns the updated list after cleanup.
   *
   * NOTE: Upstash doesn't support Lua; this is a best-effort pass.
   * We fetch members and check their heartbeat keys one by one.
   */
  static async cleanupBoard(boardId: string): Promise<string[]> {
    const members = (await redis.smembers(`presence:board:${boardId}`)) as string[] | null;
    if (!members || members.length === 0) return [];

    const alive: string[] = [];
    const evicted: string[] = [];

    // Parallelize GETs
    const gets = await Promise.all(
      members.map((uid) => redis.get<string | null>(`hb:board:${boardId}:${uid}`))
    );

    members.forEach((uid, i) => {
      if (gets[i]) alive.push(uid);
      else evicted.push(uid);
    });

    if (evicted.length) {
      // Remove dead users from presence set
      await Promise.all(evicted.map((uid) => redis.srem(`presence:board:${boardId}`, uid)));
    }

    return alive;
  }

  // ---------- Typing indicators per card ----------

  static async startTyping(cardId: string, userId: string): Promise<string[]> {
    await redis.sadd(`typing:card:${cardId}`, userId);
    const users = (await redis.smembers(`typing:card:${cardId}`)) as string[];
    return users ?? [];
  }

  static async stopTyping(cardId: string, userId: string): Promise<string[]> {
    await redis.srem(`typing:card:${cardId}`, userId);
    const users = (await redis.smembers(`typing:card:${cardId}`)) as string[];
    return users ?? [];
  }

  static async listTyping(cardId: string): Promise<string[]> {
    const users = (await redis.smembers(`typing:card:${cardId}`)) as string[];
    return users ?? [];
  }

  // ---------- Lightweight distributed locks ----------

  /**
   * Try to acquire a lock with a TTL (in ms). Returns true on success.
   * Example: lockName = `card:${cardId}:move`
   */
  static async acquireLock(lockName: string, ownerId: string, ttlMs = 5000): Promise<boolean> {
    // SET key value NX PX ttl
    const ok = await redis.set(`lock:${lockName}`, ownerId, { nx: true, px: ttlMs });
    return ok === "OK";
  }

  /**
   * Release a lock if you own it. Returns true if released, false otherwise.
   */
  static async releaseLock(lockName: string, ownerId: string): Promise<boolean> {
    const key = `lock:${lockName}`;
    const current = await redis.get<string>(key);
    if (current === ownerId) {
      await redis.del(key);
      return true;
    }
    return false;
  }

  /**
   * Renew lock TTL if you own it. Returns true on success.
   */
  static async extendLock(lockName: string, ownerId: string, ttlMs = 5000): Promise<boolean> {
    const key = `lock:${lockName}`;
    const current = await redis.get<string>(key);
    if (current === ownerId) {
      // Upstash lacks PEXPIRE; use EXPIRE in seconds (round up) or re-SET.
      const sec = Math.ceil(ttlMs / 1000);
      await redis.expire(key, sec);
      return true;
    }
    return false;
  }
}
