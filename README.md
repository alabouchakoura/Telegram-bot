# GitHub releases tracker Bot — Architecture

a telegram bot that monitors github repos for new releases and notifies users the moment a new version drops without a github account being required.

---

## What it does

A user tells the bot *"watch this GitHub repo for me."* The bot silently checks it on a schedule. The moment a new release tag appears, it sends a Telegram notification to the user.

```
User: /watch https://github.com/owner/repo/releases
                      │
                      ▼
         Bot stores the repo URL + current latest tag in DB

[Every 6 hours (we will modify this)]
                      │
                      ▼
         Scraper fetches the releases page
         → grabs the first (latest) release tag: "2024.04.09"
                      │
                      ▼
         Compare to last known tag in DB: "2024.03.10"
                      │
                      ▼
         Different → notify all watchers on Telegram:
         "new version was released a new version: 2024.04.09"
                      │
                      ▼
         DB updated: last_tag = "2024.04.09"
```

---

## Database

SQLite — a single `.db` file on disk, no server needed.

### Tables

```
┌─────────────┐       ┌──────────────────────┐       ┌─────────────────────┐
│    users    │       │       repos          │       │      watches        │
│─────────────│       │──────────────────────│       │─────────────────────│
│ chat_id PK  │       │ url        PK        │       │ chat_id  FK         │
└─────────────┘       │ name                 │       │ url      FK         │
                      │ last_tag             │       │ PRIMARY KEY(both)   │
                      │ last_checked (Unix)  │       └─────────────────────┘
                      └──────────────────────┘
```

### `users`

Stores every Telegram chat ID that has interacted with the bot.

| Column    | Type    | Notes                  |
|-----------|---------|------------------------|
| `chat_id` | INTEGER | Primary key, from Telegram |

### `repos`

One row per unique GitHub releases URL being tracked.

| Column         | Type    | Notes                                      |
|----------------|---------|--------------------------------------------|
| `url`          | TEXT    | Primary key — e.g. `https://github.com/user/repo/releases` |
| `name`         | TEXT    | Repo name, extracted from the page         |
| `last_tag`     | TEXT    | Latest release tag seen — e.g. `v2.3.1`   |
| `last_checked` | INTEGER | Unix timestamp of the last scrape          |

### `watches`

Junction table linking users to repos. One user can watch many repos; one repo can be watched by many users.

| Column    | Type    | Notes                          |
|-----------|---------|--------------------------------|
| `chat_id` | INTEGER | Foreign key → `users.chat_id`  |
| `url`     | TEXT    | Foreign key → `repos.url`      |

Primary key is the combination of both columns — no duplicate watches.

---

## Data Flow

### Adding a Watch

```
/watch <url>
    │
    ▼
bot.js receives command
    │
    ├── addUser(chat_id)         → INSERT OR IGNORE into users
    ├── addRepo(url)             → INSERT OR IGNORE into repos (last_tag = null)
    └── addWatch(chat_id, url)  → INSERT OR IGNORE into watches
```

### Scheduled Check (every 6 hours)

```
scheduler fires
    │
    ▼
getAllWatchedRepos()
→ SELECT repos + GROUP_CONCAT(chat_ids) for each repo
    │
    ▼
for each repo:
    │
    ├── scraper fetches GitHub releases page
    │   └── grabs the first tag shown (= latest release)
    │
    ├── compare new_tag vs last_tag in DB
    │
    ├── if CHANGED:
    │       ├── notify each watching chat_id
    │       └── updateRepo(url, name, new_tag)
    │
    └── if SAME:
            └── updateRepo(url, name, new_tag)  ← updates last_checked only
```

### Removing a Watch

```
/remove <url>
    │
    ▼
removeWatch(chat_id, url)
→ DELETE FROM watches WHERE chat_id = ? AND url = ?
```

If no users are left watching a repo, it stays in `repos` but will no longer trigger notifications (no watchers to notify). Optionally, it can be cleaned up.

---

## Modules Overview

| File | Responsibility |
|------|----------------|
| `bot.js` | Entry point. Handles Telegram commands (`/watch`, `/list`, `/remove`, `/check`). Starts the scheduler. |
| `db.js` | All database logic — table creation, reads, writes. |
| `scraper.js` | Fetches a GitHub releases page and extracts the latest release tag and repo name. |
| `notifier.js` | Formats and sends Telegram messages when a new release is detected. |
| `scheduler.js` | Cron job that runs every 6 hours — orchestrates scraping, comparison, notification, and DB updates. |

---

## Notification Format

When a new release is detected, each watching user receives:

```
🚀 New release: yt-dlp

Version: 2024.04.09
Previous: 2024.03.10

🔗 View Release
```

---

## Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Registers the user, shows available commands |
| `/watch <url>` | Adds a GitHub releases URL to the user's watchlist |
| `/list` | Shows all repos the user is currently watching and their last known tag |
| `/remove <url>` | Removes a repo from the user's watchlist |
| `/check <url>` | One-time manual check — returns the current latest release immediately |