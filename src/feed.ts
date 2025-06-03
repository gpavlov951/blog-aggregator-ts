import { XMLParser } from "fast-xml-parser";
import { getNextFeedToFetch, markFeedFetched } from "./lib/db/queries/feeds";
import { createPost, getPostByUrl } from "./lib/db/queries/posts";

type RSSItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
};

type RSSFeed = {
  channel: {
    title: string;
    link: string;
    description: string;
    item: RSSItem[];
  };
};

async function fetchFeed(feedURL: string): Promise<RSSFeed> {
  const response = await fetch(feedURL, {
    headers: {
      "User-Agent": "gator",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch feed: ${response.statusText}`);
  }

  const xmlText = await response.text();

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  const parsedData = parser.parse(xmlText);

  const channel = parsedData.rss?.channel;
  if (!channel) {
    throw new Error("Invalid RSS feed: missing channel element");
  }

  const { title, link, description } = channel;
  if (!title || !link || !description) {
    throw new Error("Invalid RSS feed: missing required channel metadata");
  }

  let items: RSSItem[] = [];
  const rawItems = channel.item;

  if (Array.isArray(rawItems)) {
    items = rawItems
      .map((item) => {
        if (!item.title || !item.link || !item.description || !item.pubDate) {
          return null;
        }
        return {
          title: item.title,
          link: item.link,
          description: item.description,
          pubDate: item.pubDate,
        };
      })
      .filter((item): item is RSSItem => item !== null);
  }

  return {
    channel: {
      title,
      link,
      description,
      item: items,
    },
  };
}

function parsePublishedDate(pubDateStr: string): Date | null {
  try {
    const date = new Date(pubDateStr);

    if (isNaN(date.getTime())) {
      console.warn(`Invalid date format: ${pubDateStr}`);
      return null;
    }

    return date;
  } catch (error) {
    console.warn(`Error parsing date "${pubDateStr}":`, error);
    return null;
  }
}

export async function scrapeFeeds() {
  try {
    const nextFeed = await getNextFeedToFetch();

    if (!nextFeed) {
      console.log("No feeds available to scrape");
      return;
    }

    console.log(`Scraping feed: ${nextFeed.name} (${nextFeed.url})`);

    await markFeedFetched(nextFeed.id);

    const feedData = await fetchFeed(nextFeed.url);

    console.log(`Found ${feedData.channel.item.length} items:`);

    let savedCount = 0;
    let skippedCount = 0;

    for (const item of feedData.channel.item) {
      try {
        const existingPost = await getPostByUrl(item.link);
        if (existingPost) {
          skippedCount++;
          continue;
        }

        const publishedAt = parsePublishedDate(item.pubDate);

        await createPost(
          item.title,
          item.link,
          item.description,
          publishedAt,
          nextFeed.id
        );

        savedCount++;
        console.log(`Saved: ${item.title}`);
      } catch (error) {
        if (error instanceof Error && error.message.includes("unique")) {
          skippedCount++;
          continue;
        }

        console.error(`Error saving post "${item.title}":`, error);
      }
    }

    console.log(
      `Scraping complete: ${savedCount} posts saved, ${skippedCount} posts skipped (already exist)`
    );
  } catch (error) {
    console.error("Error scraping feed:", error);
  }
}
