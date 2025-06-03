import { eq, sql } from "drizzle-orm";
import { feeds, users } from "../../schema";
import { db } from "../index";

export async function createFeed(name: string, url: string, userId: string) {
  const [result] = await db
    .insert(feeds)
    .values({ name, url, userId })
    .returning();
  return result;
}

export async function getFeedsByUserId(userId: string) {
  const result = await db.select().from(feeds).where(eq(feeds.userId, userId));
  return result;
}

export async function getFeedByUrl(url: string) {
  const [result] = await db.select().from(feeds).where(eq(feeds.url, url));
  return result;
}

export async function getNextFeedToFetch() {
  const [result] = await db
    .select()
    .from(feeds)
    .orderBy(sql`${feeds.lastFetchedAt} NULLS FIRST`)
    .limit(1);
  return result;
}

export async function markFeedFetched(feedId: string) {
  const now = new Date();

  const [result] = await db
    .update(feeds)
    .set({
      lastFetchedAt: now,
      updatedAt: now,
    })
    .where(eq(feeds.id, feedId))
    .returning();

  return result;
}

export async function deleteAllFeeds() {
  const result = await db.delete(feeds);
  return result;
}

export async function getAllFeedsWithUsers() {
  const result = await db
    .select({
      feed: feeds,
      user: users,
    })
    .from(feeds)
    .leftJoin(users, eq(feeds.userId, users.id))
    .orderBy(feeds.name);
  return result;
}
