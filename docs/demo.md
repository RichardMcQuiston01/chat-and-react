# Demo

The demo lives in `packages/demo`. It is a small Vite app that shows the web component at work.

## Run the demo

```bash
# From the repo root, install everything first
bun install

# Then start the dev server
cd packages/demo
bun run dev
```

Open `http://localhost:5173` in your browser.

## What the demo shows

The demo is a five-page form. It uses every input type and shows how branching works.

| Page                        | Input types used                                                                             |
| --------------------------- | -------------------------------------------------------------------------------------------- |
| Welcome                     | `text` (name), `textarea` (bio — only shows if a name was typed)                             |
| Preferences                 | `radio` (contact method), `checkbox` (interests), `dropdown` (country), `radio` (occupation) |
| Education _(students only)_ | `text` (school), `dropdown` (study level)                                                    |
| Profession _(workers only)_ | `text` (job title), `dropdown` (industry)                                                    |
| Final                       | `textarea` (feedback)                                                                        |

Your answer about occupation on the Preferences page decides where you go next:

- Students go to the Education page.
- Workers go to the Profession page.
- Everyone else skips to the Final page.

On the right side of the screen, a **live event log** shows the data for each `chat-page-submit` and `chat-form-complete` event as it happens. When the form is done, a **Start over** button appears. It clears the log and resets the form.

## Build the demo for a website

```bash
cd packages/demo
bun run build   # files are written to packages/demo/dist/
bun run preview # view the built site on your computer
```

## Host the demo on GitHub Pages

The demo is set up to deploy to GitHub Pages. A workflow in `.github/workflows/deploy-demo.yml` builds it and publishes it each time changes to the demo, core, or web packages land on `main`. You can also run it by hand from the **Actions** tab.

To turn it on, do this once:

1. Open your repository on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.

After the workflow runs, the demo is at `https://<your-username>.github.io/chat-and-react/`.

The demo uses relative file paths, so it works from that sub-folder with no extra setup.

## Run the demo with Docker

The repo includes a Dockerfile. It builds the whole project (core, then web, then demo) and serves it with nginx. You do not need Bun or Node on your computer.

```bash
# From the repo root
docker build -f packages/demo/Dockerfile -t chat-and-react-demo .
docker run --rm -p 8080:80 chat-and-react-demo
```

Or use Docker Compose from the repo root:

```bash
docker compose up --build
```

Open `http://localhost:8080` in your browser. The demo runs on port **8080**.
