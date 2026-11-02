# 🧰 Random Tools

A collection of small personal tools, published as one website with GitHub Pages.

- The **home page** (`index.html`) lists every tool with its icon, name and description.
- **Each top-level folder is one tool**, served at `https://<user>.github.io/random-tools/<folder>/`.

## Adding a tool

1. Copy the template: `cp -r _template my-tool`
2. Edit `my-tool/tool.json`:
   ```json
   {
     "name": "My Tool",
     "description": "What this tool does (required).",
     "icon": "🛠️",
     "tags": ["optional", "tags"]
   }
   ```
3. Build the tool in `my-tool/index.html` (plain HTML/CSS/JS, any extra files go in the same folder).
4. Commit and push to `main`. GitHub Actions rebuilds the list and redeploys.

Folders without a `tool.json`, and folders starting with `_` or `.`, are not listed.

## Preview locally

```sh
node scripts/build-manifest.mjs   # generates tools.json
python3 -m http.server 8000       # open http://localhost:8000
```

## One-time setup

In the GitHub repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
