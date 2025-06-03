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

export async function fetchFeed(feedURL: string): Promise<RSSFeed> {
  // Fetch the feed data
  const response = await fetch(feedURL, {
    headers: {
      "User-Agent": "gator",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch feed: ${response.statusText}`);
  }

  const xmlText = await response.text();

  // Parse the XML
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  const parsedData = parser.parse(xmlText);

  // Extract the channel field
  const channel = parsedData.rss?.channel;
  if (!channel) {
    throw new Error("Invalid RSS feed: missing channel element");
  }

  // Extract metadata
  const { title, link, description } = channel;
  if (!title || !link || !description) {
    throw new Error("Invalid RSS feed: missing required channel metadata");
  }

  // Extract feed items
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

  // Assemble and return the result
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
    // Try parsing the date string directly
    const date = new Date(pubDateStr);

    // Check if the date is valid
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
    // Get the next feed to fetch from the database
    const nextFeed = await getNextFeedToFetch();

    if (!nextFeed) {
      console.log("No feeds available to scrape");
      return;
    }

    console.log(`Scraping feed: ${nextFeed.name} (${nextFeed.url})`);

    // Mark the feed as fetched
    await markFeedFetched(nextFeed.id);

    // Fetch the feed content
    const feedData = await fetchFeed(nextFeed.url);

    // Iterate over the items and save them to the database
    console.log(`Found ${feedData.channel.item.length} items:`);

    let savedCount = 0;
    let skippedCount = 0;

    for (const item of feedData.channel.item) {
      try {
        // Check if post already exists
        const existingPost = await getPostByUrl(item.link);
        if (existingPost) {
          skippedCount++;
          continue;
        }

        // Parse the published date
        const publishedAt = parsePublishedDate(item.pubDate);

        // Save the post to the database
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
        // Check if it's a duplicate URL error (unique constraint violation)
        if (error instanceof Error && error.message.includes("unique")) {
          skippedCount++;
          continue;
        }

        // Log other errors but continue processing
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
