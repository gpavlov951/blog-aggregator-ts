import { and, eq } from "drizzle-orm";
import { feedFollows, feeds, users } from "../../schema";
import { db } from "../index";

export async function createFeedFollow(userId: string, feedId: string) {
  const [newFeedFollow] = await db
    .insert(feedFollows)
    .values({
      userId,
      feedId,
    })
    .returning();

  const [result] = await db
    .select({
      id: feedFollows.id,
      createdAt: feedFollows.createdAt,
      updatedAt: feedFollows.updatedAt,
      userId: feedFollows.userId,
      feedId: feedFollows.feedId,
      userName: users.name,
      feedName: feeds.name,
    })
    .from(feedFollows)
    .innerJoin(users, eq(feedFollows.userId, users.id))
    .innerJoin(feeds, eq(feedFollows.feedId, feeds.id))
    .where(eq(feedFollows.id, newFeedFollow.id));

  return result;
}

export async function getFeedFollowsForUser(userId: string) {
  return db
    .select({
      id: feedFollows.id,
      createdAt: feedFollows.createdAt,
      updatedAt: feedFollows.updatedAt,
      userId: feedFollows.userId,
      feedId: feedFollows.feedId,
      userName: users.name,
      feedName: feeds.name,
    })
    .from(feedFollows)
    .innerJoin(users, eq(feedFollows.userId, users.id))
    .innerJoin(feeds, eq(feedFollows.feedId, feeds.id))
    .where(eq(feedFollows.userId, userId));
}

export async function deleteFeedFollow(userId: string, feedUrl: string) {
  // First get the feed ID from the URL
  const [feed] = await db.select().from(feeds).where(eq(feeds.url, feedUrl));

  if (!feed) {
    throw new Error(`Feed with URL "${feedUrl}" not found`);
  }

  // Delete the feed follow record
  const [deletedFollow] = await db
    .delete(feedFollows)
    .where(and(eq(feedFollows.userId, userId), eq(feedFollows.feedId, feed.id)))
    .returning();

  if (!deletedFollow) {
    throw new Error(`You are not following feed with URL "${feedUrl}"`);
  }

  return deletedFollow;
}
