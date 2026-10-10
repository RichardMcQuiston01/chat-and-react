# Schema Builder

The Schema Builder lives in `packages/schema-builder`. It is a visual editor made with Vite and React 18. You can create, edit, import, and export `chat-and-react` schemas without writing JSON by hand.

## Run the Schema Builder

```bash
# From the repo root, install everything first
bun install

# Then start the dev server
cd packages/schema-builder
bun run dev
```

Open `http://localhost:5173` in your browser. If that port is busy, the number may go up by one.

## What you can do

| Feature                    | What it does                                                                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Page management**        | Add, remove, and pick pages from the left sidebar                                                                                               |
| **Question editor**        | Change the ID, title, input type, options, and placeholder of each question. Move questions up or down                                          |
| **Conditional visibility** | Link a question to a named rule. The question only shows when the rule passes                                                                   |
| **Branching rules**        | Add `if` and `always` rules to each page. Pick the question, the answer to look for, and the page to go to. The last `always` rule is protected |
| **Named rules**            | Edit `x-chat-rules` as raw JSON. Rule names fill in the rule dropdowns for you                                                                  |
| **Schema options**         | Turn `userResumable`, `localStorage`, and `autoComplete` on or off                                                                              |
| **Import**                 | Open an existing `schema.json` file and keep editing it                                                                                         |
| **Validate**               | Check your schema with `parseSchema`. A banner tells you if it passed or failed                                                                 |
| **Export**                 | Download `schema.json`. The schema is checked first, and the file is only saved if it is valid                                                  |
| **JSON preview**           | A drawer at the bottom shows your JSON as you work. You can open and close it                                                                   |

## Build the Schema Builder for a website

```bash
cd packages/schema-builder
bun run build   # files are written to packages/schema-builder/dist/
bun run preview # view the built site on your computer
```
