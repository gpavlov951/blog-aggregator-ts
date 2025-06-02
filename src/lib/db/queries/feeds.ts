import { db } from "../index";
import { feeds } from "../../schema";
import { eq } from "drizzle-orm";

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

export async function deleteAllFeeds() {
  const result = await db.delete(feeds);
  return result;
}
