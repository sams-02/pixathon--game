import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize Google GenAI if key is present
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  aiClient = new GoogleGenAI({ apiKey });
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    game: 'ChronoTile: Echoes of the Step',
    geminiConfigured: !!aiClient,
  });
});

// Gemini AI Hint & Chamber Tactical Analysis endpoint
app.post('/api/gemini/oracle-hint', async (req: Request, res: Response) => {
  try {
    const { levelName, moveCount, playerPos, prevPos, inventory, availableMoves, boardSummary } = req.body;

    if (!aiClient) {
      return res.status(200).json({
        hint: `Tactical Oracle: Keep in mind that stepping into a 1-tile dead end or corridor will trap you because your previous tile (${prevPos ? `${prevPos.x},${prevPos.y}` : 'none'}) is currently collapsed. Look for a looping path or switch!`,
        source: 'local-heuristic',
      });
    }

    const prompt = `You are the ChronoTile Tactical Oracle in an atmospheric sci-fi puzzle game.
The game rule: Every time the player moves, the tile they just left becomes completely unavailable (collapsed) for the next turn. Therefore, players can NEVER simply step backward into their previous tile! Stepping into a 1-wide dead-end alcove means instant trap unless there's an exit or teleporter.

Current Level: "${levelName}"
Current Move Number: ${moveCount}
Player Position: (${playerPos.x}, ${playerPos.y})
Just Left / Collapsed Tile: ${prevPos ? `(${prevPos.x}, ${prevPos.y})` : 'None (at start)'}
Held Keys: ${JSON.stringify(inventory?.keys || {})}
Available adjacent walkable moves right now: ${JSON.stringify(availableMoves || [])}
Board Snapshot:
${boardSummary || 'Standard puzzle grid with keys and gates'}

Provide a concise, clever, 1-2 sentence tactical hint (cryptic yet actionable) to guide the player without completely spoiling every single step. Speak in an enigmatic yet helpful chrono-guardian voice.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const hintText = response.text || 'Observe the temporal rhythm: every step closes a door, but opens another if you circle back in two paces.';
    return res.json({ hint: hintText, source: 'gemini-3.8-flash' });
  } catch (error: unknown) {
    console.error('Error generating AI hint:', error);
    return res.status(200).json({
      hint: 'The temporal currents are turbulent. Remember: you cannot retrace your last step immediately. Plan two paces ahead!',
      source: 'fallback',
    });
  }
});

// Gemini AI Chamber Generator endpoint
app.post('/api/gemini/generate-chamber', async (req: Request, res: Response) => {
  try {
    const { difficulty, theme } = req.body;

    if (!aiClient) {
      return res.status(400).json({
        error: 'GEMINI_API_KEY is not configured. Please use handcrafted levels or the built-in level designer.',
      });
    }

    const prompt = `You are the Grand Architect for ChronoTile, a grid-based spatial puzzle game where every move makes the tile just left unavailable for 1 turn.
Create a JSON specification for an original, solvable puzzle level.

Difficulty: ${difficulty || 'medium'} (options: easy, medium, hard)
Theme: ${theme || 'Quantum Void'}

Grid constraints:
- Dimensions: width between 6 and 9, height between 6 and 9.
- Tile symbols:
  '.' = walkable floor
  '#' = wall/void
  'S' = start position (exactly one)
  'E' = exit portal (exactly one)
  'K' = gold key (optional, 0 to 2)
  'G' = gold gate (matches gold key, optional, 0 to 2)
  'T' = teleporter pad (optional, exactly two or zero)
- Important puzzle rule: The player cannot retrace their immediately prior step because it collapses for 1 turn! Therefore, any key must either be in an open loop (minimum 2x2 or circular path) or reached via a teleporter, otherwise walking in to grab it traps the player.

Output ONLY valid JSON with this exact structure (no markdown fences, just pure JSON):
{
  "name": "Chamber Name",
  "subtitle": "Short thematic subtitle",
  "width": 7,
  "height": 7,
  "rows": [
    "#######",
    "#S....#",
    "#.###.#",
    "#..K..#",
    "#.###.#",
    "#....E#",
    "#######"
  ],
  "parMoves": 12,
  "flavorText": "One sentence lore description."
}`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    let raw = response.text || '';
    // Strip markdown formatting if any
    raw = raw.replace(/^```json/m, '').replace(/^```/m, '').trim();

    const chamberData = JSON.parse(raw);
    return res.json({ chamber: chamberData, source: 'gemini-3.8-flash' });
  } catch (error: unknown) {
    console.error('Error generating chamber with Gemini:', error);
    return res.status(500).json({ error: 'Failed to generate chamber from Gemini.' });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true, port: PORT, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ChronoTile] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[ChronoTile] Fatal startup error:', err);
  process.exit(1);
});
