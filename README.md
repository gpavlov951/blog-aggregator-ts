# Blog Aggregator CLI

A TypeScript-based command-line tool for aggregating and managing RSS/XML blog feeds. This CLI allows you to register users, add feeds, follow feeds, and browse posts from your followed feeds.

## Features

- 🔐 User registration and authentication
- 📰 RSS/XML feed parsing and aggregation
- 👥 Multi-user support
- 📖 Browse posts from followed feeds
- 🔄 Automatic feed scraping with configurable intervals
- 💾 PostgreSQL database storage with Drizzle ORM

## Prerequisites

Before running this CLI, you'll need:

- **Node.js** (version specified in `.nvmrc`)
- **PostgreSQL** database
- **pnpm** package manager

## Installation

1. Clone the repository:

```bash
git clone https://github.com/gpavlov951/blog-aggregator-ts.git
cd blog-aggregator-ts
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up your PostgreSQL database and note the connection URL.

## Configuration

### Setting up the config file

The CLI uses a configuration file located at `~/.gatorconfig.json` in your home directory. You need to create this file manually with your database connection details.

Create the file with the following structure:

```json
{
  "db_url": "postgresql://username:password@localhost:5432/your_database_name"
}
```

Replace the connection string with your actual PostgreSQL credentials:

- `username`: Your PostgreSQL username
- `password`: Your PostgreSQL password
- `localhost:5432`: Your PostgreSQL host and port
- `your_database_name`: The name of your database

### Database Setup

1. Run database migrations to set up the required tables:

```bash
pnpm run db:migrate
```

2. (Optional) Use Drizzle Studio to inspect your database:

```bash
pnpm run db:studio
```

## Usage

### Running the CLI

You can run commands using either:

```bash
# Development mode (with hot reload)
pnpm run dev <command> [arguments]

# Production mode
pnpm run start <command> [arguments]
```

### Available Commands

#### User Management

**`register <username>`**

- Register a new user and set them as the current user
- Example: `pnpm run start register john_doe`

**`login <username>`**

- Log in as an existing user
- Example: `pnpm run start login john_doe`

**`users`**

- List all registered users (shows current user with indicator)
- Example: `pnpm run start users`

**`reset`**

- ⚠️ **WARNING**: Deletes all users from the database
- Example: `pnpm run start reset`

#### Feed Management

**`addfeed <name> <url>`**

- Add a new RSS/XML feed and automatically follow it
- Requires login
- Example: `pnpm run start addfeed "TechCrunch" "https://techcrunch.com/feed/"`

**`feeds`**

- List all feeds in the database with their creators
- Example: `pnpm run start feeds`

**`follow <url>`**

- Follow an existing feed by its URL
- Requires login
- Example: `pnpm run start follow "https://techcrunch.com/feed/"`

**`following`**

- List all feeds you're currently following
- Requires login
- Example: `pnpm run start following`

**`unfollow <url>`**

- Unfollow a feed by its URL
- Requires login
- Example: `pnpm run start unfollow "https://techcrunch.com/feed/"`

#### Content Browsing

**`browse [limit]`**

- Browse recent posts from your followed feeds
- Optional limit parameter (default: 2)
- Requires login
- Example: `pnpm run start browse 10`

**`agg <time_interval>`**

- Start the feed aggregator to continuously scrape feeds
- Time interval examples: `1s`, `30s`, `1m`, `5m`, `1h`
- Runs until interrupted with Ctrl+C
- Example: `pnpm run start agg 1m`

## Example Workflow

Here's a typical workflow to get started:

```bash
# 1. Register a new user
pnpm run start register alice

# 2. Add some feeds
pnpm run start addfeed "Hacker News" "https://hnrss.org/frontpage"
pnpm run start addfeed "Dev.to" "https://dev.to/feed"

# 3. Check what feeds exist
pnpm run start feeds

# 4. Follow additional feeds
pnpm run start follow "https://feeds.feedburner.com/oreilly/radar"

# 5. See what you're following
pnpm run start following

# 6. Start aggregating feeds (runs continuously)
pnpm run start agg 2m

# 7. In another terminal, browse recent posts
pnpm run start browse 5
```

## Development

### Available Scripts

- `pnpm run dev` - Run in development mode with hot reload
- `pnpm run start` - Run in production mode
- `pnpm run db:generate` - Generate database migrations
- `pnpm run db:migrate` - Run database migrations
- `pnpm run db:studio` - Open Drizzle Studio

### Project Structure

```
src/
├── index.ts          # Main CLI entry point
├── commands.ts       # Command handlers
├── config.ts         # Configuration management
├── middleware.ts     # Authentication middleware
├── feed.ts           # RSS/XML feed parsing
└── lib/
    ├── db/           # Database queries
    └── schema.ts     # Database schema
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

This project is part of the [Boot.dev](https://www.boot.dev/lessons/4d624835-9830-4ca6-bfbb-280112f64baf) curriculum.
