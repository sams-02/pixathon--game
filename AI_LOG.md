# AI_LOG.md

## Tools
- **Google Antigravity (AGY)**: Full-stack agentic coding, architecture scaffolding, Three.js 3D rendering pipeline, deterministic BFS solver integration, and state management.
- **Gemini (Gemini 3.8 Flash)**: Spatial puzzle chamber generation, Tactical Oracle AI heuristic reasoning, and narrative prompt engineering.
- **ElevenLabs**: Audio design reference and procedural WebAudio synthesis curves (frequency modulation, envelopes, and harmonic sweeps).

---

## Key Prompts

### 1. Core Architecture & Game Foundation (Problem Statement 3)
> "Build a complete, modular web game named 'ECHO-LOCK' based on this exact design specification for Pixathon Problem Statement 3 (Puzzle with a Twist).
> 
> **Core Twist**: Every time you move, the tile you just left becomes UNAVAILABLE for the next turn. You cannot immediately step backward onto the previous tile.
> 
> **Interactive Entities**: Floor, Wall, Player Spawn, Exit Portal, Key/Gate pairs, Switch/Phase Doors, 1-Use Teleporter pairs.
> 
> **Usability & Controls**: Full state history stack (`historyStack`) with 'Z' Undo, 'R' Restart, WASD/Arrow controls, and instant dead-end/trap detection.
> 
> **Procedural WebAudio**: Native `AudioContext` sound synthesizer for steps, locks, chimes, warps, and fanfares."

*Outcome*: Established core React + Three.js + Express game loop, grid coordinates, and state immutability.

### 2. High-Performance Deterministic BFS Solver
> "Write a standalone deterministic Breadth-First Search solver in TypeScript that models state tuples `(x, y, lockedX, lockedY, keysMask, switchesMask, teleMask)` to verify that all puzzle chambers are 100% solvable within par moves and cannot become soft-locked without a valid solution."

*Outcome*: Built `solver.ts` which computes minimum legal moves, detects unsolvable states in real-time, and powers the Tactical Oracle.

### 3. Procedural Audio Synthesis (ElevenLabs Inspired)
> "Design a zero-asset WebAudio engine in `audio/sound.ts` inspired by ElevenLabs audio aesthetics: 260Hz tactile footsteps, 120Hz metallic latch cooldown clank, harmonic major-third key pickups (587Hz → 880Hz), and a 4-chord ascending fanfare with celebratory confetti."

*Outcome*: Replaced static MP3 dependencies with instant, latency-free procedural audio synthesis.

### 4. Interactive Level Designer & Matrix Customization
> "Create an in-game Station Architect modal allowing players to draw custom grids, test BFS solvability in real-time, copy/paste raw level JSON specifications, and export custom puzzles."

*Outcome*: Implemented `LevelEditorModal.tsx` with live syntax validation and instant chamber playtesting.

### 5. Rule Visibility & Problem Statement #3 Announcements
> "State at the start of the game that we have added a new rule: we cannot go backwards. This is the sole rule change from the original game and corresponds to problem statement number 3. Announce this rule both before and after the game loads."

*Outcome*: Integrated mission briefing cards on `TitleScreen.tsx`, level-start toast banners in `GameHud.tsx`, and real-time telemetry tracking of the locked collapsed tile.

### 6. Anti-Glare Matte Arena & Geometry Fixes
> "Ensure that, when viewed from above, the map arena does not appear glittering or shining. It must be entirely practical and playable, looking so dull that it seems glittering. Enhance everything."

*Outcome*: Overhauled PBR lighting, eliminated coplanar Z-fighting, and introduced ultra-matte non-reflective tactile materials.

---

## When AI Got It Wrong

### 1. Coplanar Z-Fighting & Specular Glare in the 3D Arena
- **The Issue**: When generating `SceneManager.ts`, the AI placed both the floor walking plate (`deckGeo`) and the outer border frame (`frameGeo`) with their top faces sharing the exact same vertical plane (`y = 0.00`). Furthermore, it applied high metallic values (`metalness: 0.82–0.90`), low roughness (`0.25–0.38`), and loaded a bright studio `RoomEnvironment` PMREM reflection map with a direct sunlight intensity of 3.4.
- **Visual Failure**: From isometric and top-down camera views, the arena floor suffered from aggressive Z-fighting flickering, jagged triangular moiré noise, and blinding specular glints (captured in the gameplay screenshot).
- **Resolution**:
  - Re-architected floor tile geometry into a stepped hierarchy: a recessed base chassis (`y = -0.09` to `-0.01`) and a raised matte deck plate (`y = -0.01` to `+0.03`), completely eliminating coplanar face collisions.
  - Replaced high-gloss metallic shaders with tactile matte composites (`metalness: 0.02`, `roughness: 0.95`).
  - Balanced astrophysical lighting (direct light reduced to 1.6, soft ambient hemisphere fill increased to 1.25) so the arena appears clean, architectural, and glare-free from any angle.

### 2. Dependency Resolution Conflict in Local Dev Setup
- **The Issue**: The AI generated a `package.json` that pinned `"esbuild": "^0.25.0"` alongside `"vite": "^8.3.0"`. When running `npm install`, npm aborted with an `ERESOLVE` peer dependency conflict because Vite 8 requires `esbuild@^0.27.0 || ^0.28.0`.
- **Resolution**: Updated `package.json` to `"esbuild": "^0.28.0"` matching Vite 8 and TSX requirements, allowing clean installation with zero vulnerabilities.
