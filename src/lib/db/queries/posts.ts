import { desc, eq } from "drizzle-orm";
import { feedFollows, feeds, posts } from "../../schema";
import { db } from "../index";

export async function createPost(
  title: string,
  url: string,
  description: string | null,
  publishedAt: Date | null,
  feedId: string
) {
  const [result] = await db
    .insert(posts)
    .values({ title, url, description, publishedAt, feedId })
    .returning();

  return result;
}

export async function getPostsByFeedId(feedId: string) {
  const result = await db
    .select()
    .from(posts)
    .where(eq(posts.feedId, feedId))
    .orderBy(desc(posts.publishedAt));
  return result;
}

export async function getPostByUrl(url: string) {
  const [result] = await db.select().from(posts).where(eq(posts.url, url));
  return result;
}

export async function getAllPostsWithFeeds() {
  const result = await db
    .select({
      post: posts,
      feed: feeds,
    })
    .from(posts)
    .leftJoin(feeds, eq(posts.feedId, feeds.id))
    .orderBy(desc(posts.publishedAt));
  return result;
}

export async function getRecentPosts(limit: number = 10) {
  const result = await db
    .select()
    .from(posts)
    .orderBy(desc(posts.publishedAt))
    .limit(limit);
  return result;
}

export async function deletePostsByFeedId(feedId: string) {
  const result = await db.delete(posts).where(eq(posts.feedId, feedId));
  return result;
}

export async function updatePost(
  postId: string,
  updates: {
    title?: string;
    description?: string | null;
    publishedAt?: Date | null;
  }
) {
  const [result] = await db
    .update(posts)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, postId))
    .returning();
  return result;
}

export async function getPostsForUser(userId: string, limit: number = 10) {
  const result = await db
    .select({
      post: posts,
      feed: feeds,
    })
    .from(posts)
    .innerJoin(feeds, eq(posts.feedId, feeds.id))
    .innerJoin(feedFollows, eq(feeds.id, feedFollows.feedId))
    .where(eq(feedFollows.userId, userId))
    .orderBy(desc(posts.publishedAt))
    .limit(limit);
  return result;
}
