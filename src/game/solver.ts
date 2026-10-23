import { LevelDef, Position, SolverResult } from '../types/game';

interface SearchNode {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  keysMask: number;
  switchesMask: number;
  teleportersMask: number;
  depth: number;
  path: Position[];
}

/**
 * High-performance deterministic Breadth-First-Search solver
 * for ChronoTile levels.
 *
 * Enforces the core rule:
 * Every time the player moves from (x, y) to (nx, ny),
 * (x, y) is unavailable for the very next turn.
 */
export function solveLevel(level: LevelDef, maxStates: number = 75000): SolverResult {
  const startTime = performance.now();

  const width = level.width;
  const height = level.height;

  // Locate Start and Exit
  let startX = -1;
  let startY = -1;
  let exitX = -1;
  let exitY = -1;

  const keyList: { x: number; y: number; color: string; id: number }[] = [];
  const gateList: { x: number; y: number; color: string; id: number }[] = [];
  const switchList = level.switches || [];
  const teleporterList = level.teleporters || [];

  let keyIdCounter = 0;
  let gateIdCounter = 0;

  for (let y = 0; y < height; y++) {
    const row = level.rows[y] || '';
    for (let x = 0; x < width; x++) {
      const char = row[x] || '#';
      if (char === 'S') {
        startX = x;
        startY = y;
      } else if (char === 'E') {
        exitX = x;
        exitY = y;
      } else if (char === 'K' || char === 'C' || char === 'M') {
        const color = char === 'K' ? 'gold' : char === 'C' ? 'cyan' : 'magenta';
        keyList.push({ x, y, color, id: keyIdCounter++ });
      } else if (char === 'G' || char === 'D' || char === 'N') {
        const color = char === 'G' ? 'gold' : char === 'D' ? 'cyan' : 'magenta';
        gateList.push({ x, y, color, id: gateIdCounter++ });
      }
    }
  }

  if (startX === -1 || startY === -1 || exitX === -1 || exitY === -1) {
    return {
      solvable: false,
      minMoves: 0,
      path: [],
      exploredStates: 0,
      timeMs: performance.now() - startTime,
      diagnostics: 'Error: Level missing Start (S) or Exit (E).',
    };
  }

  // Initial state
  const initialTeleportersMask = 0; // 0 = all teleporters have full uses
  const initialSwitchesMask = 0; // 0 = default switch state

  const initialNode: SearchNode = {
    x: startX,
    y: startY,
    prevX: -1,
    prevY: -1,
    keysMask: 0,
    switchesMask: initialSwitchesMask,
    teleportersMask: initialTeleportersMask,
    depth: 0,
    path: [{ x: startX, y: startY }],
  };

  const queue: SearchNode[] = [initialNode];
  const visited = new Set<string>();

  const encodeState = (node: SearchNode): string => {
    return `${node.x},${node.y}|${node.prevX},${node.prevY}|${node.keysMask}|${node.switchesMask}|${node.teleportersMask}`;
  };

  visited.add(encodeState(initialNode));

  const directions = [
    { dx: 0, dy: -1 }, // Up
    { dx: 0, dy: 1 },  // Down
    { dx: -1, dy: 0 }, // Left
    { dx: 1, dy: 0 },  // Right
  ];

  let statesExplored = 0;

  while (queue.length > 0) {
    const current = queue.shift()!;
    statesExplored++;

    // Check goal
    if (current.x === exitX && current.y === exitY) {
      const timeMs = Math.round((performance.now() - startTime) * 100) / 100;
      return {
        solvable: true,
        minMoves: current.depth,
        path: current.path,
        exploredStates: statesExplored,
        timeMs,
        diagnostics: `Solvable in ${current.depth} moves (explored ${statesExplored} states in ${timeMs}ms).`,
      };
    }

    if (statesExplored >= maxStates) {
      break;
    }

    // Try all 4 cardinal movements
    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;

      // 1. Boundary check
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
        continue;
      }

      // 2. CORE RULE CHECK: The tile just left is unavailable for the next turn!
      if (nx === current.prevX && ny === current.prevY) {
        continue;
      }

      const rawChar = level.rows[ny]?.[nx] ?? '#';

      // 3. Static wall check
      if (rawChar === '#') {
        continue;
      }

      // 4. Dynamic switch wall check
      let isSwitchBlocked = false;
      for (let sIdx = 0; sIdx < switchList.length; sIdx++) {
        const sw = switchList[sIdx];
        const isSwActive = (current.switchesMask & (1 << sIdx)) !== 0;
        for (const coord of sw.toggleCoords) {
          if (coord.x === nx && coord.y === ny) {
            // When switch is active, toggled coords change state
            if (isSwActive) {
              isSwitchBlocked = true;
            }
          }
        }
      }
      if (isSwitchBlocked) {
        continue;
      }

      // 5. Gate & Key check
      let nextKeysMask = current.keysMask;
      let gateBlocked = false;

      // Find if destination has a gate
      const targetGate = gateList.find((g) => g.x === nx && g.y === ny);
      if (targetGate) {
        // Player needs matching color key collected to pass gate
        const hasMatchingKey = keyList.some(
          (k) => k.color === targetGate.color && (nextKeysMask & (1 << k.id)) !== 0
        );
        if (!hasMatchingKey) {
          gateBlocked = true;
        }
      }
      if (gateBlocked) {
        continue;
      }

      // Check key pickup
      const targetKey = keyList.find((k) => k.x === nx && k.y === ny);
      if (targetKey) {
        nextKeysMask |= (1 << targetKey.id);
      }

      // 6. Switch trigger check
      let nextSwitchesMask = current.switchesMask;
      for (let sIdx = 0; sIdx < switchList.length; sIdx++) {
        const sw = switchList[sIdx];
        if (sw.x === nx && sw.y === ny) {
          nextSwitchesMask ^= (1 << sIdx); // Toggle switch
        }
      }

      // 7. Teleporter check
      let finalX = nx;
      let finalY = ny;
      let finalPrevX = current.x;
      let finalPrevY = current.y;
      let nextTeleportersMask = current.teleportersMask;

      const targetTp = teleporterList.find((t) => t.x === nx && t.y === ny);
      if (targetTp) {
        const tpIdx = teleporterList.indexOf(targetTp);
        const usedCount = (nextTeleportersMask >> (tpIdx * 2)) & 0b11;
        if (usedCount < targetTp.maxUses) {
          // Warp to target destination
          finalX = targetTp.targetX;
          finalY = targetTp.targetY;
          // When teleporting, the teleporter entrance tile becomes the cooling/blocked tile!
          finalPrevX = nx;
          finalPrevY = ny;
          // Increment used counter
          nextTeleportersMask = (nextTeleportersMask & ~(0b11 << (tpIdx * 2))) | ((usedCount + 1) << (tpIdx * 2));
        }
      }

      const nextNode: SearchNode = {
        x: finalX,
        y: finalY,
        prevX: finalPrevX,
        prevY: finalPrevY,
        keysMask: nextKeysMask,
        switchesMask: nextSwitchesMask,
        teleportersMask: nextTeleportersMask,
        depth: current.depth + 1,
        path: [...current.path, { x: finalX, y: finalY }],
      };

      const stateKey = encodeState(nextNode);
      if (!visited.has(stateKey)) {
        visited.add(stateKey);
        queue.push(nextNode);
      }
    }
  }

  const timeMs = Math.round((performance.now() - startTime) * 100) / 100;
  return {
    solvable: false,
    minMoves: 0,
    path: [],
    exploredStates: statesExplored,
    timeMs,
    diagnostics: `Unsolvable or exceeded search limit (${statesExplored} states explored in ${timeMs}ms).`,
  };
}

/**
 * Checks if a specific position has ANY legal moves from the current board state.
 * If 0 legal moves exist, the player is in temporal lock (trapped).
 */
export function getLegalMoves(
  x: number,
  y: number,
  prevX: number,
  prevY: number,
  level: LevelDef,
  heldKeys: string[],
  switchesActive: Record<string, boolean>
): Position[] {
  const directions = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];

  const legal: Position[] = [];

  for (const dir of directions) {
    const nx = x + dir.dx;
    const ny = y + dir.dy;

    // Bounds check
    if (nx < 0 || nx >= level.width || ny < 0 || ny >= level.height) continue;

    // Cannot step onto the tile just left (the core mechanic)
    if (nx === prevX && ny === prevY) continue;

    const char = level.rows[ny]?.[nx] ?? '#';
    if (char === '#') continue;

    // Check switches toggling dynamic wall
    let isWall = false;
    if (level.switches) {
      for (const sw of level.switches) {
        const isActive = switchesActive[sw.id] ?? false;
        if (isActive) {
          for (const coord of sw.toggleCoords) {
            if (coord.x === nx && coord.y === ny) {
              isWall = true;
            }
          }
        }
      }
    }
    if (isWall) continue;

    // Check gates
    if (char === 'G' && !heldKeys.includes('gold')) continue;
    if (char === 'D' && !heldKeys.includes('cyan')) continue;
    if (char === 'N' && !heldKeys.includes('magenta')) continue;

    legal.push({ x: nx, y: ny });
  }

  return legal;
}
