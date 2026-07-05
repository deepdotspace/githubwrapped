# GitHub Wrapped

Your year in code, wrapped. Paste any public GitHub username and get a Spotify-Wrapped-style,
scroll-driven animated story of that developer's year: contributions, streaks, the busiest day,
top languages, a flagship repo, and a developer archetype, ending in a shareable trophy card.

**Live:** https://githubwrapped.app.space

## What it does

- **No login, any user.** Open `githubwrapped.app.space/<username>` (or paste a name on the home
  page) and the story renders for any public GitHub account.
- **Real, tokenless data.** Every number traces to live GitHub data, and no personal access token
  is required. The contribution calendar is parsed from GitHub's public contributions fragment;
  profile, repo, and language data come from the GitHub REST API.
- **A scroll story, not a form.** Eleven full-screen sections animate as you scroll: a count-up of
  contributions, the contribution grid igniting, longest streak, busiest day and weekday rhythm,
  top languages, your flagship repo, the receipts (stars, forks, followers), a rule-based developer
  archetype, and a trophy card.
- **Kind to quiet years.** Low-activity accounts get gentler copy and stay celebratory, never empty.

## How it works

The story is driven by a single `WrappedStats` object assembled server-side from the two tokenless
sources, then cached. The developer archetype and all copy are deterministic and seeded per
username, so a given user always reads the same and there is no live AI in the render path. The free
contributions fetch runs first and gates the billed REST calls, so an unknown user never triggers a
lookup cost.

## Stack

- Frontend: React + Vite + Tailwind, a scroll-snap story with CSS / SVG / canvas animation.
- Backend: a Cloudflare Worker (Hono), KV cache, per-IP rate limiting.
- Built on the [DeepSpace](https://deep.space) SDK.

## Local development

Requires the DeepSpace CLI and a one-time sign-in (dev, test, and deploy run against DeepSpace).

```sh
npm install
npx deepspace login      # one-time browser sign-in
npx deepspace dev        # local dev server
npx deepspace test       # test suite
npx deepspace deploy     # deploy to <name>.app.space
```

## License

Released under the [MIT License](LICENSE).
