import { XMLParser } from "fast-xml-parser";

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
