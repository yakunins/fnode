# Impressor — Top 15 Fusion Project Ideas

**Goal**: Build in 1 week (2 devs). Fusion .NET backend + React frontend. Impress recruiters, managers, and engineers so hard they can't say no.

**Stack**: ASP.NET + Fusion (backend), React + Next.js (frontend), WebSocket real-time transport.

**Scoring**: Each idea rated on three axes (1-5):

- **Wow factor** — How fast does it impress someone who opens the link?
- **Fusion fit** — How well does it showcase Fusion's reactive invalidation / real-time sync?
- **1-week feasible** — Can 1-2 devs ship a polished MVP in 7 days?

---

## Ranking (sorted by total score)

| #   | Project                                                                       | Wow | Fusion | Feasible | Total  | Min Concurrent | Total Users | Cold-Start Risk                         | Best For                        |
| --- | ----------------------------------------------------------------------------- | :-: | :----: | :------: | :----: | :------------: | :---------: | --------------------------------------- | ------------------------------- |
| 1   | [Live Auction Arena](#1-live-auction-arena)                                   |  5  |   5    |    4     | **14** |       2        |     30      | **Low** — timers tick even solo         | Fintech, startup, full-stack    |
| 2   | [Multiplayer Trivia](#2-realtime-multiplayer-trivia)                          |  5  |   4    |    5     | **14** |      4-6       |     50      | **Medium** — bots fill rooms            | Any role, easy crowd-pleaser    |
| 3   | [One More Call](#3-one-more-call--call-your-parents)                          |  5  |   4    |    5     | **14** |       0        |     50      | **None** — every message is permanent   | Everyone. The one they remember |
| 4   | [The Wall (Infinite Canvas)](#4-the-wall--infinite-collaborative-canvas)      |  5  |   5    |    3     | **13** |       10       |     50      | **Medium** — pre-seed content           | Senior/architect roles          |
| 5   | [Stock/Crypto Dashboard](#5-live-stockcrypto-dashboard-with-ai-signals)       |  4  |   5    |    4     | **13** |       0        |      0      | **None** — API feeds ARE the content    | Fintech, data-heavy roles       |
| 6   | [TripSync — Group Travel Planner](#6-tripsync--live-group-travel-planner)     |  4  |   5    |    4     | **13** |       2        |     30      | **Low** — works solo as trip planner    | Travel, SaaS, maps              |
| 7   | [AI Code Autopsy](#7-ai-code-autopsy--live-review-arena)                      |  4  |   4    |    5     | **13** |       0        |     50      | **None** — AI reviews solo pastes       | Dev tools, AI, SaaS             |
| 8   | [Math Battle Arena (Kids)](#8-math-battle-arena--kids-learning-game)          |  4  |   4    |    5     | **13** |       2        |     30      | **Low** — bots + solo mode              | EdTech, family-friendly         |
| 9   | [Live Web Highlighter (Extension)](#9-live-web-highlighter--chrome-extension) |  4  |   5    |    3     | **12** |       2        |     50      | **Low** — works solo as bookmarker      | Browser ext, dev tools          |
| 10  | [DevRadar — Live GitHub Dashboard](#10-devradar--live-github-dashboard)       |  4  |   5    |    4     | **13** |       0        |      0      | **None** — GitHub API IS the content    | Dev tools, observability        |
| 11  | [MicroWar — Browser RTS](#11-microwar--browser-rts)                           |  5  |   4    |    3     | **12** |       2        |     50      | **Low** — strong vs AI                  | Gaming, distributed systems     |
| 12  | [Team Pulse Board](#12-real-time-team-pulse--mood-board)                      |  3  |   4    |    5     | **12** |       5        |     20      | **Medium** — need a few teams to try it | HR-tech / people roles          |
| 13  | [Road Pulse (Drivers)](#13-road-pulse--live-driver-alerts)                    |  3  |   4    |    4     | **11** |       5        |     100     | **High** — needs local density          | Mobile / geo / transit          |
| 14  | [AI Travel Scout](#14-ai-travel-scout--conversational-trip-builder)           |  4  |   4    |    3     | **11** |       0        |     30      | **None** — AI chat works solo           | AI, travel, maps                |
| 15  | [GateKeep — Smart Access Hub](#15-gatekeep--smart-access-hub)                 |  3  |   5    |    3     | **11** |       1        |     10      | **None** — works for 1 household        | IoT, smart home, mobile         |

---

## My Recommendation

**Pick #3 (One More Call)** — no recruiter has ever seen a portfolio project with soul. It's trivially easy to build, zero cold-start risk, and the story behind it is unforgettable in an interview. Plus it's genuinely useful.

**Close seconds**: #1 (Auction) or #2 (Trivia) — both high-wow, buildable in a week, and work for any audience.

If targeting fintech: **#5 (Stock Dashboard)** — zero cold-start risk, works alone.
If targeting dev tools / AI: **#7 (AI Code Autopsy)** — every dev will try it, AI is the hottest signal on a resume.
If targeting travel / maps: **#6 (TripSync)** — practical, beautiful, collaborative.
If you want the "this person is a gamer AND an engineer" flex: **#11 (MicroWar)** — Starcraft in the browser, built in a week.

**Avoid combining ideas.** One polished project beats three half-finished ones. Spend day 1-4 on core functionality, day 5-6 on UX polish and deployment, day 7 on a killer README + demo video.

**General launch playbook (applies to all):**

1. **Day 1 of launch**: Post to Hacker News "Show HN" + r/SideProject + r/webdev simultaneously
2. **Seed the app**: Never launch an empty multiplayer app. Use bots, pre-populated content, or invite 10 friends first
3. **Record a 15-sec GIF/video**: This is your ammo for Twitter, Reddit, Discord. People don't click links — they watch GIFs
4. **Add a live user counter**: "47 people online right now" creates FOMO and proves the real-time works
5. **GitHub star campaign**: Post the repo in r/opensource, dev Discord servers. Stars = social proof for recruiters

---

## 1. Live Auction Arena

**Wow: 5 | Fusion: 5 | Feasible: 4 | Total: 14**

Real-time auction house. Multiple items up for bidding simultaneously. Countdown timers, bid animations, "going once... going twice..." tension. Anyone can create an auction or bid.

**Why it wins**: Opens link → sees live countdowns ticking → places a bid → price jumps for everyone instantly → competitive rush. Recruiters _feel_ the real-time. Shows you handle race conditions, consistency, and UX under pressure.

**Fusion showcase**: Each auction = reactive Computed (current price, time left, bid count). Placing a bid invalidates the auction state, pushes to all subscribers. Bid conflict resolution (two bids at same millisecond) demonstrates server authority. Computed aggregates: "hottest auctions", "total bids/sec" update live.

**Scope**: Mock items (funny images, meme NFTs, "hire me" tokens). No real money. Add a leaderboard of top bidders.

**How many users needed**: This is the **most forgiving** for low concurrency. Even 1 user alone can browse active auctions with countdown timers ticking — the server drives the tension, not other players. But bidding wars need **2+ concurrent per auction**. Sweet spot: **5-10 concurrent users** across 3-5 auctions feels like a bustling marketplace. For a recruiter demo, you + your brother bidding against each other on 2 browsers is enough. For viral, you want **30-50 total bidders** in a day to generate a leaderboard worth looking at.

**Where to get them**: r/WebGames, r/InternetIsBeautiful, r/SideProject. Auction meme items or trending topics for humor factor ("bid on this pixel", "auction: naming rights for my next commit"). Post in Telegram/Discord gaming communities. Twitter/X with a clip of a bidding war. The competitive element makes people share it with friends — "come outbid me." IndieHackers as a tech showcase. **Seeding trick**: Create 10 auctions with funny items and stagger their end times across a 2-hour window. Post "auction ends in 15 min, come bid!" in Discord/Reddit for urgency.

---

## 2. Realtime Multiplayer Trivia

**Wow: 5 | Fusion: 4 | Feasible: 5 | Total: 14**

Drop-in trivia game. Join a room, answer timed questions, see everyone's scores animate live. Leaderboard updates in real-time. New round every 30 seconds.

**Why it wins**: Interviewer opens link → joins a game in 2 seconds → competing against strangers → leaderboard is moving → they're hooked. Games are the ultimate "I get distributed state" signal.

**Fusion showcase**: Game state (current question, timer, scores) as Computed values. Player joins → subscribes to room state. Answer submitted → server invalidates scores → all clients update. Leaderboard is a computed projection that re-sorts reactively.

**Scope**: 50-100 pre-loaded questions (tech trivia, general knowledge). Rooms auto-created. No auth needed — just pick a name.

**How many users needed**: Needs the **most concurrent users** to feel alive. A trivia room with 1 person is just a quiz app — boring. Minimum **4-6 per room** for a real leaderboard race. Ideal: **15-30 per room** for that "packed lobby" energy. The good news: rooms are ephemeral (30-sec rounds), so you don't need sustained concurrency — a burst of 20 people clicking the link at the same time from a Reddit post is enough. **Fallback**: Add AI/bot players that answer with realistic delays and accuracy so rooms never feel empty. Show "12 players in this room" even if 8 are bots.

**Where to get them**: EASIEST of all 15 to get users. r/WebGames, r/CasualGames, r/trivia, r/QuizBowl. Post in any Discord server with "play trivia with me right now" — people click immediately. Twitter/X: "I built a multiplayer trivia game, can you beat my score?" Share in Slack/Teams communities. Tech trivia questions attract devs from r/programming, r/webdev. HN "Show HN" with tech-only trivia mode. The game loop is self-promoting — players invite friends to compete. **Seeding trick**: Schedule a "launch event" — "live trivia tournament, today 7pm UTC" — across 3-4 communities simultaneously to guarantee a burst.

---

## 3. One More Call — Call Your Parents

**Wow: 5 | Fusion: 4 | Feasible: 5 | Total: 14**

A real-time global wall of gratitude and remembrance. Two modes: **"Call them"** — for people whose parents are alive. A personal timer shows how long since your last call. Tap "I called" → timer resets → your message of what you talked about joins the live global feed → a counter ticks up: "4,327 people called their parents today." **"Write to them"** — for people whose parents are gone. Write a letter to them. Others can light a candle (react). A quiet, beautiful live wall of letters that grows in real-time. A global counter: "12,847 letters written. They'd be proud."

**Why it wins**: This is not a tech demo. This is the project that makes a recruiter close their laptop and call their mom. No one has EVER seen a portfolio project like this. In an interview, when they ask "tell me about a project you built," you say: "My parents all died. I built something so other people don't take theirs for granted." The room goes silent. You got the job. Beyond the story — the tech is solid: real-time feeds, live counters, reactive aggregates, beautiful UI. It proves you can build product with purpose, not just code.

**Fusion showcase**: Global call counter = Computed that invalidates on every "I called" tap, pushes to all connected clients. Letter wall = paginated Computed feed with live prepend on new entries. Candle/reaction count per letter = Computed. "Time since last call" timer is client-side but the "call logged" event triggers server invalidation → updates the user's profile + global feed + daily stats. Daily/weekly trends ("Sundays have 3x more calls") are computed aggregates. "X people online right now" = reactive presence.

**Scope**: Landing page with the global counter (big, animated). Two paths: "My parents are alive" → call tracker with timer + feed. "I miss them" → letter writer + candle wall. No auth required — optional account to track your own call history. Beautiful, minimal UI. Mobile-first. Shareable letters ("share this letter" link). Daily digest email (optional): "247 people called their parents today. When did you last call yours?"

**How many users needed**: **Zero concurrent needed for emotional impact.** A single visitor reads pre-existing letters and is moved. The global counter grows with every user, so even 1 new "I called" per hour keeps it alive. For launch: **50 letters pre-seeded** (write them yourself, ask friends, write to your own parents). The wall should never be empty. For the call tracker: works entirely solo — it's a personal tool. For viral: this project has **the highest organic share rate of all 15** — people will share it with the caption "this wrecked me" or "calling my mom right now." One emotional Reddit post = thousands of users.

**Where to get them**: r/MadeMeCry, r/wholesome, r/MadeMeSmile — emotional content subs with millions of members. r/GriefSupport, r/ChildrenofDeadParents — communities that will deeply connect with the "Write to them" mode. Mother's Day / Father's Day posts (schedule launch near these dates for maximum impact). Twitter/X: "I built this because my parents are gone. Call yours." — this tweet goes viral. Facebook shares (emotional content spreads fastest on FB). LinkedIn: "I'm a developer looking for work. Here's why I built this." — hiring managers will DM you. **The nuclear play**: A TikTok/Reel of the live counter ticking up with soft music, captioned "Each tick is someone who called their parent today." **Seeding trick**: Write 20 letters yourself. They're real. Ask 10 friends to write one. Ask 10 friends to log a call. Launch with 30 letters and a counter at 10. It's enough.

---

## 4. The Wall — Infinite Collaborative Canvas

**Wow: 5 | Fusion: 5 | Feasible: 3 | Total: 13**

Infinite zoomable surface where anyone can drop text, images, sticky notes. Zoom into any note — it becomes its own canvas. Fractal collaboration. Every visitor sees every other visitor's cursors and edits live.

**Why it wins**: Opens link → sees 50 people typing live → zooms in → it's another world inside. Instant dopamine. Shows you can build Figma-class infra.

**Fusion showcase**: Each tile/note is a Computed. Zoom level determines which Computeds are subscribed. Invalidation cascades when someone edits a nested note. Presence (cursors) via reactive state.

**Risk**: Canvas rendering + zoom math is complex. Tight for 1 week. Consider using `react-flow` or `pixi.js` to shortcut the canvas layer.

**How many users needed**: Works solo (you can explore old content), but the wow moment needs **10-20 concurrent** — enough that the canvas feels alive with cursors. For a recruiter demo, even 3-5 live cursors is impressive. For a viral screenshot/video, you want **50+ total contributors** so the canvas has depth to zoom into. Dead canvas = dead project, so pre-seed layers of content before launch.

**Where to get them**: r/InternetIsBeautiful (perfect fit — interactive web experiment), r/webdev, r/creativecoding. Post on Hacker News as "Show HN: Infinite collaborative canvas." Twitter/X with a 15-sec screen recording of zooming through layers — viral potential is high. ProductHunt as an "art experiment." Discord communities for digital art and creative coding. **Seeding trick**: Spend 1 hour with your brother filling 3 zoom levels with content so first visitors see a rich world, not a blank page.

---

## 5. Live Stock/Crypto Dashboard with AI Signals

**Wow: 4 | Fusion: 5 | Feasible: 4 | Total: 13**

Multi-ticker real-time dashboard. Prices stream live, sparkline charts animate, computed indicators (moving averages, RSI) update reactively. Add an "AI signal" column that shows buy/hold/sell with a one-line rationale (LLM-generated periodically).

**Why it wins**: Fintech is where the high-paying jobs are. This screams "I can build your trading platform." The AI angle is timely. Clean dashboard with 20+ tickers updating smoothly = engineering credibility.

**Fusion showcase**: Each ticker = Computed that invalidates on price change. Indicators (SMA, RSI) are Computed values that depend on price history — Fusion auto-tracks these dependencies. Dashboard subscribes only to visible tickers (virtual scrolling + selective subscription).

**Scope**: Use free APIs (Yahoo Finance, CoinGecko). 20-30 tickers. AI signals via OpenAI API on a 5-min refresh cycle. Pre-compute and cache.

**How many users needed**: **Zero concurrent users needed** — this is the only project that works perfectly with 0 other humans. Tickers update from external APIs, AI signals run on a cron. A single recruiter opening the link sees a fully alive dashboard with 20+ tickers moving. This is the biggest advantage: no cold-start problem. For "social proof," add a visitor counter ("1,247 traders watching") and a shared watchlist feature that needs **5-10 users** to feel collaborative. But the core demo is impressive alone.

**Where to get them**: r/CryptoCurrency, r/wallstreetbets, r/algotrading, r/stocks — these subs are massive and hungry for free tools. The AI signal angle is clickbait gold: "Free AI buy/sell signals, real-time." Crypto Twitter is extremely active — post charts with AI predictions. Telegram crypto groups (hundreds of them, thousands of members each). ProductHunt in the fintech category. Caution: these communities are skeptical of spam, so frame it as "open-source experiment" not "alpha signals." **Seeding trick**: Not needed — the data feeds ARE the content. Just launch.

---

## 6. TripSync — Live Group Travel Planner

**Wow: 4 | Fusion: 5 | Feasible: 4 | Total: 13**

A real-time collaborative trip planner built on a live map. Create a trip → share a link → everyone pins hotels, restaurants, attractions on the map simultaneously. Drag to reorder the itinerary. Vote on options ("Thai vs. Italian for dinner?"). Live budget tracker updates as items are added. See your friends' cursors moving on the map. Day-by-day timeline view that recomputes travel times and costs reactively.

**Why it wins**: Every group trip devolves into a 47-message WhatsApp thread with links nobody clicks. This solves a pain YOU know — maps are your daily tool. Travel is universal — every interviewer has planned a trip. "He built a collaborative Google Maps for trip planning" lands instantly. Shows: real-time collab, maps integration, computed aggregates (budget, distances), and product thinking.

**Fusion showcase**: Each trip is a set of Computeds: pins (locations), itinerary order, votes, budget items. Add a pin → invalidates the trip state → all collaborators see it appear on the map + itinerary + budget recalculates. Vote on a restaurant → Computed tally updates live. Reorder itinerary → travel time between stops recomputes (distance API calls cached as Computeds). Budget is a Computed sum of all items, grouped by category, updating as any item changes. Presence (cursors on map) via reactive state.

**Scope**: Map via Mapbox/Leaflet. Pin types: hotel, food, attraction, transport. Each pin has name, notes, cost, votes. Itinerary sidebar: drag-to-reorder, day grouping. Budget panel: total + per-category breakdown. Voting: thumbs up/down per pin. Share via link (no auth needed). Optional: export itinerary as PDF/image.

**How many users needed**: Works perfectly **solo** — it's a personal trip planner with a beautiful map UI. Collaboration kicks in at **2-3 concurrent** (you + travel buddies planning together). For a recruiter demo: create a trip, open in 2 browsers, add pins from both → show map update live + budget recalculate. For traction: **30 trips created** by different people is enough to show adoption. Every trip is private, so no cold-start problem — no one sees an empty room.

**Where to get them**: r/travel, r/solotravel, r/backpacking, r/TravelHacks — massive subs, always looking for free planning tools. r/digitalnomad. Travel Twitter/Instagram. ProductHunt in the travel category. **The hook**: "Plan your next trip together on a live map — stop screenshotting Google Maps into group chats." Post a beautiful screenshot of a planned trip (Tokyo itinerary, European road trip) as the hero image. Travel bloggers/YouTubers — offer it as a free tool for their audience. **Seeding trick**: Create 3 stunning sample trips (e.g., "5 Days in Tokyo," "Road Trip: California Coast," "Weekend in Paris") with real pins, costs, and photos. New visitors see these as templates and immediately understand the value.

---

## 7. AI Code Autopsy — Live Review Arena

**Wow: 4 | Fusion: 4 | Feasible: 5 | Total: 13**

Paste any code snippet → AI reviews it live, streaming line-by-line annotations: bugs, security issues, performance problems, style suggestions. The review appears in real-time next to the code, like a senior dev pair-programming with you. Others can watch your review live, upvote findings, and add their own comments. A public feed shows the most interesting reviews happening now.

**Why it wins**: Every developer will try this. "Paste code, get roasted by AI in real-time" is irresistible. The live-streaming review (not just a static response) shows Fusion's reactive power. Recruiters at dev tools companies (GitHub, GitLab, JetBrains, Vercel) will think: "this is our next feature." The public feed creates a "learning from others' code" community angle.

**Fusion showcase**: Code paste triggers a server-side AI review. As the LLM streams tokens, each annotation is a Computed that invalidates as it grows → watchers see the review build in real-time, line by line. Upvotes per annotation = reactive Computed. The public feed ("trending reviews") is a computed projection sorted by votes + recency. Review stats (total reviews, top issues found, languages breakdown) are computed aggregates. If you share a review link, new viewers subscribe to its Computed state and see late-arriving annotations appear live.

**Scope**: Monaco editor (syntax highlighting). Paste code or enter a GitHub file URL. AI review via OpenAI/Claude API (streaming). Annotations appear inline (gutter icons + hover details). Severity levels: critical, warning, info. Public feed of recent reviews. Upvote/downvote per annotation. Share link per review. Stats dashboard: "3,247 reviews performed, 12,891 bugs found."

**How many users needed**: **Zero concurrent needed.** Works perfectly solo — paste code, get AI review. The social layer (watching others' reviews, upvoting) is a bonus that activates at **5-10 daily users**. For a recruiter demo: paste a deliberately buggy snippet → watch the AI tear it apart in real-time. For traction: devs will use this repeatedly (unlike a toy). **50 total reviews** in week one generates a meaningful public feed. Every review is permanent content, so the app gets richer over time.

**Where to get them**: r/programming, r/webdev, r/codereview, r/learnprogramming — devs actively seek code review. Hacker News: "Show HN: Paste code, get AI-reviewed live." Dev Twitter: screen recording of AI finding a security bug in real-time. Reddit: "I built a free AI code reviewer — roast my code." **The viral loop**: Every review has a share link. Devs share their "AI roast" results like they share personality test results. **Seeding trick**: Pre-run 20 reviews on famous open-source code snippets (React hooks, Linux kernel snippets, notorious bugs). These populate the public feed and show the AI's capability immediately.

---

## 8. Math Battle Arena — Kids Learning Game

**Wow: 4 | Fusion: 4 | Feasible: 5 | Total: 13**

Real-time competitive math game for kids (ages 6-12). Two or more players race to solve arithmetic problems. Animated characters punch/jump/score when you answer correctly. Streak bonuses, power-ups (freeze opponent's timer, double points), and a live leaderboard with fun avatars. Difficulty scales by age bracket.

**Why it wins**: EdTech is a $400B market. Parents LOVE educational games. "He built an educational game that my kid won't stop playing" is a conversation starter in any interview. The real-time competitive element makes it addictive — kids drag their friends in. Plus: it's wholesome, portfolio-safe, and shows you think about real users, not just tech demos.

**Fusion showcase**: Game room state (both players' scores, current problem, streak counter, active power-ups) as Computed values. Answer submitted → server validates → invalidates scores, triggers animation events for both players. Power-up activation invalidates opponent's UI state. Global leaderboard ("Top Mathletes This Week") is a computed projection across all rooms. Difficulty adjustment is a Computed that depends on the player's rolling accuracy.

**Scope**: Addition, subtraction, multiplication, division. 3 difficulty tiers (Easy/Medium/Hard auto-selected by age). Cute avatar picker (8-10 characters). Sound effects. 60-second rounds. No auth — pick a name and avatar. Optional: "classroom mode" where a teacher creates a room code and 20 kids join.

**How many users needed**: **Very forgiving**. Solo mode works great — kid vs. timed problems, chasing their own high score. **2 concurrent** = full competitive experience (1v1 duel). Classroom mode needs **5-20 per room** but the teacher organizes that. For a recruiter demo: open 2 tabs, race yourself. For traction: **30 total players** generating a leaderboard is enough. **Bots optional** — a "practice with CPU" mode with adjustable difficulty covers the solo case.

**Where to get them**: r/Teachers, r/homeschool, r/Parenting, r/edtech — parents and teachers actively search for free learning tools. Facebook parenting groups (massive, engaged audiences). Teacher Twitter/Instagram. Post as "free math game for your classroom" in education Slack/Discord communities. ProductHunt in the education category. **The cheat code**: Email 5 elementary school teachers and ask them to try it with their class. One teacher = 20-30 instant users who come back daily. School newsletters. Homeschool co-op forums. **Seeding trick**: Pre-populate the leaderboard with fun bot names ("MathNinja", "NumberWizard") so it looks active from day one.

---

## 9. Live Web Highlighter — Chrome Extension

**Wow: 4 | Fusion: 5 | Feasible: 3 | Total: 12**

A Chrome extension that lets you highlight text, annotate, and pin comments on ANY webpage — and everyone else with the extension sees your highlights in real-time. Think "Google Docs comments, but for the entire internet." A sidebar shows all annotations on the current page, who's online, and a live activity feed. Team workspaces for private annotations.

**Why it wins**: This is a **category-defining product idea** — not just a demo. Browser extensions signal deep platform knowledge (Chrome APIs, content scripts, service workers). The real-time collab layer on top of arbitrary websites is technically impressive and immediately useful. Recruiters at any SaaS company will think: "this person can build browser-level product features."

**Fusion showcase**: Each URL has a Computed state (list of annotations, active users, highlight positions). User highlights text → command creates annotation → invalidates page state → pushes to all viewers of that URL. The sidebar's "recent activity across all pages" is a computed feed that aggregates across URLs. Online presence per page = reactive Computed. Team workspaces scope which annotations you see — subscription filtering powered by Fusion.

**Scope**: Chrome extension (Manifest V3) + React popup/sidebar + Fusion backend. Highlight text → right-click → "Annotate." Sidebar shows all annotations on current page. Color-coded by user. "X people viewing this page" indicator. Optional: team workspace with invite link.

**How many users needed**: Works great **solo** — it's a personal annotation/bookmark tool even with 0 other users. The collaboration shines at **2-5 concurrent on the same page** (e.g., team reviewing a doc together). For a recruiter demo: install extension, open any article, highlight a paragraph, show it appearing in another browser window. For traction: **50 installs** is impressive for a Chrome extension in week one. You don't need mass concurrency — the value stacks over time as annotations accumulate.

**Where to get them**: r/chrome, r/browsers, r/productivity, r/webdev. Hacker News: "Show HN: I built real-time collaborative annotations for any webpage." ProductHunt (extensions do well there). Dev Twitter — screen recording of 2 people annotating the same article live. Research communities (r/PhD, r/AcademicPhilosophy) — paper review use case. **The hook**: "Stop sending screenshots of articles. Just highlight and share." **Seeding trick**: Pre-annotate 10 popular tech blog posts (Hacker News front page articles). When someone with the extension visits those pages, they see highlights and think "oh, people are using this." Include a "featured annotations" page in the extension popup showing the most-highlighted URLs.

---

## 10. DevRadar — Live GitHub Dashboard

**Wow: 4 | Fusion: 5 | Feasible: 4 | Total: 13**

A real-time developer dashboard that turns your GitHub activity into a living control room. Live feeds: PR status changes, CI/CD pipeline progress, deploy events, issue assignments, review requests. Multiple repos on one screen. Computed health scores per repo ("3 failing checks, 2 stale PRs → health: 72%"). Team view: see who's working on what right now. Integrates with GitHub webhooks for instant updates — no polling.

**Why it wins**: Every dev team needs this but nobody has built it well. Datadog costs $$$. GitHub's own UI requires clicking into each repo. This puts everything on one live screen. Recruiters at dev tools companies will immediately see the product value. Engineering managers will think "I want this for my team." Shows: webhook integration, real-time data aggregation, computed health metrics, and clean dashboard design.

**Fusion showcase**: Each repo is a Computed (open PRs, CI status, last deploy, contributor activity). GitHub webhooks trigger invalidation → dashboard updates instantly. Repo health score is a Computed that depends on multiple sub-metrics (PR staleness, check failures, deploy frequency) — Fusion auto-tracks the dependency chain. Team activity feed is a computed merge-sort across all repo feeds. "Deploy velocity" and "PR cycle time" are time-windowed computed aggregates.

**Scope**: Connect via GitHub OAuth. Select repos to monitor. Dashboard: repo cards with health score, latest PRs, CI status. Activity feed (live). Team panel: avatar + what they're working on. Alerts: "CI failed on main" push notification. GitHub webhooks for real-time events (fallback: poll API every 30s).

**How many users needed**: **Zero concurrent needed.** Connects to YOUR GitHub repos — works entirely solo from minute one. For a recruiter demo: connect to a popular open-source repo (React, Next.js) → show live PR activity + CI status updating. For team use: **2-5 devs on the same team** watching the same dashboard. For traction: **20 GitHub accounts connected** is enough. Every connected user generates content (their activity). **The killer feature**: public dashboards for open-source projects. Set up a live dashboard for a popular repo → embed it in their README → free advertising.

**Where to get them**: r/programming, r/devops, r/webdev, r/github. Hacker News: "Show HN: Live GitHub dashboard with health scores — free Datadog alternative for devs." Dev Twitter: screenshot of a multi-repo dashboard with live CI indicators. ProductHunt in the developer tools category. GitHub community forums. **The hook**: "Your repos, one screen, always live." **Seeding trick**: Connect to 5 popular open-source repos (React, Vue, Rust, Go, Deno) and make those dashboards public. Screenshot them for marketing. Visitors see a living dashboard instantly.

---

## 11. MicroWar — Browser RTS

**Wow: 5 | Fusion: 4 | Feasible: 3 | Total: 12**

A simplified real-time strategy game in the browser. Inspired by Starcraft but stripped to the essence: gather resources (click mineral patches), build units (3 types: worker, soldier, tank), send them to attack. Fog of war. 1v1 matches, 5-minute games. Minimap, resource counters, unit selection — all updating in real-time. Watch live games as a spectator.

**Why it wins**: You played Starcraft. You know what makes RTS tick. "He built a real-time strategy game with server-authoritative state in a week" is an elite-level signal for distributed systems knowledge. The spectator mode proves real-time pub/sub at scale. Gaming companies, infrastructure teams, and anyone who's ever played Starcraft will be drawn in.

**Fusion showcase**: Game state (map, units, buildings, resources, fog of war) is server-authoritative Computed. Player commands (move, build, attack) are sent to server → server resolves game tick → invalidates changed state → pushes diffs to both players (and spectators). Each player only receives state within their fog-of-war vision — Fusion's selective subscription handles this naturally. Resource counts, unit counts, and army value are Computed projections. Spectators subscribe to the full game state — a separate Computed view with no fog. Match history / replay is a Computed sequence of game states.

**Scope**: HTML5 Canvas for the game view. Simple tilemap (32x32 grid). 3 unit types with rock-paper-scissors balance. Resource: minerals only. Buildings: base, barracks, factory. Fog of war (reveal around your units). Matchmaking: "Find Game" button pairs two players. Spectate: list of live games. 5-minute timer — most army value wins if no base destroyed.

**How many users needed**: **Surprisingly low.** 1v1 means you only need **2 concurrent** for a game. vs AI mode means **0 humans needed** — and a strong AI opponent makes the game actually fun solo. Spectator mode works with **any number**. For a recruiter demo: play against AI, show the spectator view in another tab. For multiplayer: **10 concurrent** means 5 simultaneous games happening — the spectator lobby looks alive. **Bot AI is mandatory** — both as an opponent and to fill the "live games" list.

**Where to get them**: r/RealTimeStrategy, r/starcraft, r/IndieGaming, r/WebGames, r/gamedev. Hacker News: "Show HN: I built a browser RTS with server-authoritative state." Game dev Discord servers. Twitter: gameplay GIF of a tank rush winning a game. Starcraft community forums. **The hook**: "Free browser RTS — no download, 5-minute games." **Seeding trick**: Record a 30-sec gameplay video of a close match with dramatic music. Post it everywhere. Also: have the AI play itself in "demo matches" that spectators can watch — the spectator lobby is never empty.

---

## 12. Real-time Team Pulse / Mood Board

**Wow: 3 | Fusion: 4 | Feasible: 5 | Total: 12**

Team members click an emoji (or slider) to share how they're feeling. Dashboard shows live aggregate mood, trends over time, anonymous comments. "Team energy" score animates in real-time as people vote.

**Why it wins**: HR-tech / people-ops is a huge market. Simple concept, but the live aggregate animation is satisfying. Shows you think about product value, not just tech. Good for manager-audience roles.

**Fusion showcase**: Individual votes → Computed aggregates (average mood, trend line, emoji distribution) all recompute reactively. Historical data as time-series Computed snapshots. Anonymous but authenticated (simple tokens).

**Scope**: No auth. Create a "room" → share link → team votes. Charts via Recharts or Victory. Export to CSV.

**How many users needed**: Needs **5-10 per room** to produce meaningful aggregates — a mood chart with 2 data points is pointless. But rooms are private (team-based), so you don't need strangers — you need **3-5 teams to try it**. Ask friends, post in Slack communities: "try this in your next standup." For the public dashboard / recruiter demo, create a "global mood" room where anyone can vote — this works with **20-30 total votes** spread across a day to show a trend line. Lower bar than games, but higher than solo tools.

**Where to get them**: r/agile, r/scrum, r/projectmanagement, r/startups — teams that do retros. Slack communities for engineering managers. Post as "free anonymous team mood tracker" in LinkedIn (managers love this stuff). HR-tech Twitter. The key: make it zero-friction — one click to create a room, share link, done. Post in remote-work communities (r/remotework, r/digitalnomad) — "how is your team feeling today?" ProductHunt in the productivity category. Company Slack channels ("try this in your next standup"). **Seeding trick**: Create a public "Developer Mood Today" room and post the link daily in dev Discords. Accumulate a week of trend data before showing recruiters.

---

## 13. Road Pulse — Live Driver Alerts

**Wow: 3 | Fusion: 4 | Feasible: 4 | Total: 11**

A real-time crowd-sourced driving companion. Drivers (or passengers) report hazards, speed traps, road closures, cheap gas, and traffic jams. Reports appear on a live map and auto-expire. Nearby drivers get push alerts. Live counters: "12 active reports in your area." Upvote/downvote to confirm or dismiss reports. Think Waze, but stripped to the core and open.

**Why it wins**: Every driver uses Waze or Google Maps — this is a problem space that resonates with literally everyone. Showing you can build location-aware, real-time crowd-sourced infrastructure signals strong backend + mobile skills. Transit/logistics companies (Uber, Lyft, delivery startups) are always hiring and will immediately see the relevance.

**Fusion showcase**: Each geographic cell has a Computed state (active reports, upvote counts, report density). Driver's viewport determines which cells are subscribed — moving along a road dynamically shifts subscriptions. New report → invalidates cell → pushes to all drivers viewing that area. "Reports near me" is a Computed that depends on GPS position + surrounding cell states. Aggregate stats ("most dangerous road today") are computed projections across all cells.

**Scope**: Mobile-first responsive web app (PWA — installable, works offline for map tiles). Map via Mapbox/Leaflet. Report types: hazard, police, closure, gas price, traffic. Tap-to-report with GPS auto-fill. Reports expire after 1 hour. Upvote to extend, downvote to dismiss faster. Push notifications via service worker for nearby reports.

**How many users needed**: **Highest geographic density requirement.** A driving app with 10 users spread across a country = empty map for everyone. You need **5-10 active reporters per city** to be useful. For a recruiter demo: seed reports along a well-known route (your daily commute) and demo the real-time alert flow. For real traction: focus on **one city** — post in local subreddits (r/[yourcity]), local Facebook groups, Nextdoor. **100 users in one metro area** is better than 1000 scattered globally.

**Where to get them**: r/driving, r/roadtrip, r/dashcam, local city subreddits (r/nyc, r/LosAngeles, etc.), Nextdoor, local Facebook groups. Waze community forums (people who love crowd-sourced reporting). Trucker forums and Discord servers (professional drivers care deeply about road hazards). Google/Apple Maps local guides communities. **The hook**: "Free, open Waze alternative — no ads, no tracking." **Seeding trick**: Drive your commute route and seed 15-20 reports (real ones). Take a screenshot of the map with active reports. That screenshot is your marketing material. Also: scrape public DOT road closure data to auto-populate real closures.

---

## 14. AI Travel Scout — Conversational Trip Builder

**Wow: 4 | Fusion: 4 | Feasible: 3 | Total: 11**

Chat with an AI about where to go and what to do — and watch it build your trip on a live map as you talk. Say "I want 3 days in Barcelona, I like street food and architecture" → the AI streams a response AND simultaneously pins Sagrada Familia, La Boqueria, Gothic Quarter on the map with routes, time estimates, and cost breakdowns. Edit by chatting: "swap day 2 lunch for something cheaper" → map updates live. Share the resulting trip with friends — they see the map + itinerary update in real-time as the AI works.

**Why it wins**: AI + maps + travel = three of your strongest interests in one project. This is the future of trip planning and nobody has nailed it yet. The "AI builds a map while you watch" moment is jaw-dropping — it's the ChatGPT "streaming text" wow, but spatial. Recruiters at travel companies (Booking, Airbnb, Google Travel) and AI companies will both want you.

**Fusion showcase**: The chat conversation is a Computed (new messages invalidate → push to all viewers). As the AI streams its response, it emits structured "pin" events that are parsed and written to the trip's map state — also a Computed. Viewers watching the shared trip see pins appear on the map in real-time as the AI talks. Itinerary (order, time, cost) is a Computed that recomputes when pins are added/removed/reordered. Budget total is a derived Computed. "X people viewing this trip" = reactive presence.

**Scope**: Split-screen: chat on left, map on right. AI via Claude/OpenAI API (streaming). AI responses include structured data (lat/lng, name, category, cost, time) parsed into map pins. Itinerary sidebar: ordered list of stops with time + cost. Budget footer. Share via link. Mobile-responsive.

**How many users needed**: **Zero concurrent needed.** Works as a solo AI travel assistant. The sharing/collab is a bonus. For a recruiter demo: type a trip request → watch the map populate in real-time → jaw drops. For traction: **30 trips generated** creates enough sample content. Every trip is shareable — users send links to friends who see the AI-built itinerary. **No cold-start problem** — the AI is always available.

**Where to get them**: r/travel, r/solotravel, r/ChatGPT, r/artificial — overlap of travel and AI communities. Hacker News: "Show HN: Chat with AI, watch it build your trip on a live map." ProductHunt (AI tools trend hard). Travel bloggers/YouTubers: "free AI trip planner." Twitter: screen recording of AI pinning Barcelona stops in real-time. **The hook**: "Tell AI where you want to go. Watch it plan your trip on a live map." **Seeding trick**: Pre-generate 10 beautiful trips ("Tokyo 5-day foodie tour", "Iceland ring road", "NYC weekend") and showcase them as templates. Visitors see polished results before trying their own.

---

## 15. GateKeep — Smart Access Hub

**Wow: 3 | Fusion: 5 | Feasible: 3 | Total: 11**

A real-time smart access control system for your home (or office). Your phone is the key — tap to unlock. Live dashboard shows: door status (locked/unlocked), who entered when, active access codes for guests, and a live activity log. Share temporary access with guests ("pizza delivery: access for 30 min"). Alerts: "front door has been open for 5 minutes." Works with a Raspberry Pi + relay/smart lock, or fully simulated for demo purposes.

**Why it wins**: You live this pain — no remote key for your door. This solves YOUR problem, and the best portfolio projects solve real problems. IoT + real-time + mobile + security is a rare full-stack combination that signals deep versatility. Smart home companies (Ring, August, Nest) hire exactly this skill set. Even as a simulated demo, the real-time state management (door state, access logs, temporary codes) is a compelling Fusion showcase.

**Fusion showcase**: Door state (locked/unlocked/open/closed) is a Computed that invalidates on sensor events → pushes to all dashboard viewers and mobile clients instantly. Access log is a Computed feed (new entries prepend live). Temporary access codes have a TTL — their Computed state auto-invalidates on expiry ("guest code expired" appears in real-time). "Door open for X minutes" alert is a time-based Computed that triggers notification. Multiple doors/zones: each is an independent Computed — shows Fusion scaling across entities. Admin view (all doors) vs user view (only doors you have access to) = scoped subscriptions.

**Scope**: Two modes: **Simulated** (for demo/portfolio — virtual door with toggle button, simulated sensor events) and **Hardware** (Raspberry Pi + GPIO + relay wired to electric strike/magnetic lock). React dashboard: door status cards, live activity feed, guest access manager. Mobile PWA: "tap to unlock" button. Guest access: generate a link/code with expiry. Push notifications for alerts.

**How many users needed**: **Works for 1 person / 1 household.** You ARE the user. For a recruiter demo: simulated mode — show the dashboard, tap unlock on phone, see door status change in real-time on desktop. Add a guest code, "use" it from another browser, see the access log update. For real hardware mode: wire it to your actual door — then demo it live in a video call interview ("watch, I'll unlock my front door from this browser"). **Mind = blown.** For traction: this isn't a mass-user product. It's a **personal project that becomes an IoT product demo**. 1 installation (your home) is enough.

**Where to get them**: You don't need mass users — this is a **hardware + software portfolio piece**. Post the build on r/homeautomation, r/RaspberryPi, r/IoT, r/DIY, r/smartHome. Hacker News: "Show HN: I built a smart door lock with Fusion and a Raspberry Pi." YouTube/TikTok: 60-sec video of unlocking your door from your phone. Maker communities (Hackaday, Instructables). **The hook**: "My door didn't have a remote key. So I built one." **Seeding trick**: Record a polished 90-sec demo video: phone tap → door unlocks → dashboard updates → guest gets temporary access → access expires. This video IS the portfolio piece. The code is secondary.
