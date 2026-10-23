<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# ChronoTile: Echoes of the Step
### Problem Statement #3 — Spatial Grid Puzzle Update

> **Core Rule Change (Problem Statement #3):**
> **You Cannot Go Backwards.** We updated the existing puzzle game with this sole rule change, turning it into our defining unique mechanic. Every time the player takes a step, the tile just left collapses for 1 turn. Stepping directly backward into the previous tile is strictly forbidden.

---

## Features
- **Problem Statement #3 Rule**: Non-reversible forward routing (tile uncouples for 1 turn).
- **Tactical 3D Arena**: Precision anti-glare, matte architectural grid designed for maximum top-down playability with zero glittering, moire, or specular blowout.
- **Dynamic Elements**: Key/Gate color locks (Gold, Cyan, Magenta), toggle switches, bidirectional wormhole teleporters.
- **Integrated AI & Heuristic Solvers**: Real-time deterministic BFS solver + Gemini Tactical Oracle.
- **In-Game Station Architect**: Interactive level editor with instant JSON import/export and solvability testing.

## Run Locally

**Prerequisites:** Node.js (v20+)

1. Install dependencies:
   ```bash
   npm install
   ```

2. (Optional) Set your `GEMINI_API_KEY` in `.env` for AI Oracle hints:
   ```env
   GEMINI_API_KEY="your-gemini-key"
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.
