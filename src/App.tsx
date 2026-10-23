/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChronoSceneManager } from './three/SceneManager';
import { LevelDef, Position, GameSnapshot, GameInventory } from './types/game';
import { HANDCRAFTED_LEVELS } from './game/levels';
import { solveLevel, getLegalMoves } from './game/solver';
import { sound } from './audio/sound';

import { TitleScreen } from './components/TitleScreen';
import { GameHud } from './components/GameHud';
import { CollapsibleDock } from './components/CollapsibleDock';
import { VictoryModal } from './components/VictoryModal';
import { TrappedModal } from './components/TrappedModal';
import { OracleModal } from './components/OracleModal';
import { LevelSelectModal } from './components/LevelSelectModal';
import { LevelEditorModal } from './components/LevelEditorModal';
import { HelpModal } from './components/HelpModal';

export default function App() {
  // Game Screen State
  const [screen, setScreen] = useState<'title' | 'playing'>('title');

  // Current Level & Progression
  const [currentLevel, setCurrentLevel] = useState<LevelDef>(HANDCRAFTED_LEVELS[0]);
  const [completedLevels, setCompletedLevels] = useState<string[]>([]);

  // Player & Game State
  const [playerPos, setPlayerPos] = useState<Position>({ x: 1, y: 1 });
  const [prevPos, setPrevPos] = useState<Position | null>(null);
  const [moveCount, setMoveCount] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Astronaut Inventory & Special Abilities
  const [inventory, setInventory] = useState<GameInventory>({
    keys: { gold: 0, cyan: 0, magenta: 0 },
    abilities: { quantumBlinks: 3, phaseRestores: 2, speedBoostActive: false },
  });
  const [isBlinkActive, setIsBlinkActive] = useState<boolean>(false);
  const [collectedKeys, setCollectedKeys] = useState<string[]>([]);
  const [gateStates, setGateStates] = useState<Record<string, boolean>>({});
  const [switchStates, setSwitchStates] = useState<Record<string, boolean>>({});
  const [teleporterUses, setTeleporterUses] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<GameSnapshot[]>([]);

  // Status flags
  const [isWon, setIsWon] = useState<boolean>(false);
  const [isTrapped, setIsTrapped] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(sound.getMuted());
  const [isIsometric, setIsIsometric] = useState<boolean>(true);
  const [cameraAzimuth, setCameraAzimuth] = useState<number>(Math.PI * 0.28);

  // Modals
  const [showLevelSelect, setShowLevelSelect] = useState<boolean>(false);
  const [showLevelEditor, setShowLevelEditor] = useState<boolean>(false);
  const [showOracle, setShowOracle] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // Solvability status computed in real-time
  const [isSolvable, setIsSolvable] = useState<boolean>(true);
  const [minMoves, setMinMoves] = useState<number>(currentLevel.parMoves);
  const [availableMovesCount, setAvailableMovesCount] = useState<number>(2);

  // Three.js Scene References
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<ChronoSceneManager | null>(null);

  // Helper: locate start position in level
  const getStartPos = useCallback((lvl: LevelDef): Position => {
    for (let y = 0; y < lvl.height; y++) {
      const row = lvl.rows[y] || '';
      for (let x = 0; x < lvl.width; x++) {
        if (row[x] === 'S') return { x, y };
      }
    }
    return { x: 1, y: 1 };
  }, []);

  // Helper: check exit position in level
  const isExitPos = useCallback((lvl: LevelDef, pos: Position): boolean => {
    return lvl.rows[pos.y]?.[pos.x] === 'E';
  }, []);

  // Load level into state and 3D scene
  const initLevel = useCallback(
    (lvl: LevelDef) => {
      const start = getStartPos(lvl);
      setCurrentLevel(lvl);
      setPlayerPos(start);
      setPrevPos(null);
      setMoveCount(0);
      setElapsedSeconds(0);
      setInventory({
        keys: { gold: 0, cyan: 0, magenta: 0 },
        abilities: { quantumBlinks: 3, phaseRestores: 2, speedBoostActive: false },
      });
      setIsBlinkActive(false);
      setCollectedKeys([]);
      setGateStates({});
      setHistory([]);
      setIsWon(false);
      setIsTrapped(false);

      const initSw: Record<string, boolean> = {};
      if (lvl.switches) {
        for (const sw of lvl.switches) {
          initSw[sw.id] = sw.isActive;
        }
      }
      setSwitchStates(initSw);

      const initTp: Record<string, number> = {};
      if (lvl.teleporters) {
        for (const tp of lvl.teleporters) {
          initTp[tp.id] = tp.remainingUses;
        }
      }
      setTeleporterUses(initTp);

      if (sceneManagerRef.current) {
        sceneManagerRef.current.buildLevel(lvl, start, null);
        sceneManagerRef.current.setBlinkMode(false);
      }

      const sol = solveLevel(lvl);
      setIsSolvable(sol.solvable);
      setMinMoves(sol.minMoves);

      const legal = getLegalMoves(start.x, start.y, -1, -1, lvl, [], initSw);
      setAvailableMovesCount(legal.length);
    },
    [getStartPos]
  );

  // 30-Second Mission Timer Interval
  useEffect(() => {
    if (screen !== 'playing' || isWon || isTrapped) return;

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 0.1);
    }, 100);

    return () => clearInterval(timer);
  }, [screen, isWon, isTrapped]);

  // Execute a standard move from current position to (targetX, targetY)
  const attemptMove = useCallback(
    (targetX: number, targetY: number) => {
      if (isWon || isTrapped) return;

      const dx = Math.abs(targetX - playerPos.x);
      const dy = Math.abs(targetY - playerPos.y);

      // Standard move requires cardinal adjacency
      if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
        if (targetX < 0 || targetX >= currentLevel.width || targetY < 0 || targetY >= currentLevel.height) {
          return;
        }

        // Core Law Check
        if (prevPos && targetX === prevPos.x && targetY === prevPos.y) {
          sound.playCollapse();
          return;
        }

        const tileChar = currentLevel.rows[targetY]?.[targetX] ?? '#';
        if (tileChar === '#') return;

        // Switches dynamic wall check
        if (currentLevel.switches) {
          for (const sw of currentLevel.switches) {
            const isActive = switchStates[sw.id] ?? false;
            if (isActive) {
              for (const coord of sw.toggleCoords) {
                if (coord.x === targetX && coord.y === targetY) {
                  return;
                }
              }
            }
          }
        }

        // Gate & Key Check
        const heldKeysList = [
          ...(inventory.keys.gold > 0 ? ['gold'] : []),
          ...(inventory.keys.cyan > 0 ? ['cyan'] : []),
          ...(inventory.keys.magenta > 0 ? ['magenta'] : []),
        ];

        let isGate = false;
        let gateKey: 'gold' | 'cyan' | 'magenta' = 'gold';
        if (tileChar === 'G') { isGate = true; gateKey = 'gold'; }
        else if (tileChar === 'D') { isGate = true; gateKey = 'cyan'; }
        else if (tileChar === 'N') { isGate = true; gateKey = 'magenta'; }

        if (isGate && !heldKeysList.includes(gateKey)) {
          sound.playCollapse();
          return;
        }

        // Save History Snapshot
        const snapshot: GameSnapshot = {
          playerPos: { ...playerPos },
          prevPos: prevPos ? { ...prevPos } : null,
          moveCount,
          inventory: {
            keys: { ...inventory.keys },
            abilities: { ...inventory.abilities },
          },
          collectedKeys: [...collectedKeys],
          gateStates: { ...gateStates },
          switchStates: { ...switchStates },
          teleporterUses: { ...teleporterUses },
          toggledWalls: {},
        };
        setHistory((prev) => [...prev, snapshot]);

        let nextKeys = { ...inventory.keys };
        const nextCollectedKeys = [...collectedKeys];
        const keyId = `${targetX},${targetY}`;

        if (isGate) {
          sound.playGateOpen();
          sceneManagerRef.current?.openGateMesh(targetX, targetY);
        }

        if ((tileChar === 'K' || tileChar === 'C' || tileChar === 'M') && !collectedKeys.includes(keyId)) {
          sound.playKeyPickup();
          const color = tileChar === 'K' ? 'gold' : tileChar === 'C' ? 'cyan' : 'magenta';
          nextKeys[color] = (nextKeys[color] || 0) + 1;
          nextCollectedKeys.push(keyId);
          setCollectedKeys(nextCollectedKeys);
          setInventory((inv) => ({ ...inv, keys: nextKeys }));
          sceneManagerRef.current?.removeKeyMesh(targetX, targetY);
        }

        // Switches
        const nextSwitches = { ...switchStates };
        if (currentLevel.switches) {
          for (const sw of currentLevel.switches) {
            if (sw.x === targetX && sw.y === targetY) {
              nextSwitches[sw.id] = !nextSwitches[sw.id];
              sound.playSwitch();
              sceneManagerRef.current?.setSwitchActive(sw.id, nextSwitches[sw.id]);
            }
          }
          setSwitchStates(nextSwitches);
        }

        // Teleporters
        let finalX = targetX;
        let finalY = targetY;
        let finalPrevPos: Position = { ...playerPos };
        const nextTpUses = { ...teleporterUses };

        if (currentLevel.teleporters) {
          for (const tp of currentLevel.teleporters) {
            if (tp.x === targetX && tp.y === targetY) {
              const remaining = nextTpUses[tp.id] ?? tp.remainingUses;
              if (remaining > 0) {
                sound.playTeleport();
                finalX = tp.targetX;
                finalY = tp.targetY;
                finalPrevPos = { x: targetX, y: targetY };
                nextTpUses[tp.id] = remaining - 1;
                sceneManagerRef.current?.setTeleporterUses(tp.id, remaining - 1);
              }
            }
          }
          setTeleporterUses(nextTpUses);
        }

        sound.playMove();
        sound.playCollapse();

        const newPlayerPos = { x: finalX, y: finalY };
        setPlayerPos(newPlayerPos);
        setPrevPos(finalPrevPos);
        setMoveCount((c) => c + 1);

        sceneManagerRef.current?.movePlayerTo(finalX, finalY, finalPrevPos);

        // Win Condition
        if (isExitPos(currentLevel, newPlayerPos)) {
          sound.playWinFanfare();
          setIsWon(true);
          if (!completedLevels.includes(currentLevel.id)) {
            setCompletedLevels((prev) => [...prev, currentLevel.id]);
          }
          return;
        }

        // Trapped Check
        const currentHeldKeys = [
          ...(nextKeys.gold > 0 ? ['gold'] : []),
          ...(nextKeys.cyan > 0 ? ['cyan'] : []),
          ...(nextKeys.magenta > 0 ? ['magenta'] : []),
        ];

        const legalMoves = getLegalMoves(
          finalX,
          finalY,
          finalPrevPos.x,
          finalPrevPos.y,
          currentLevel,
          currentHeldKeys,
          nextSwitches
        );
        setAvailableMovesCount(legalMoves.length);

        if (legalMoves.length === 0) {
          sound.playTrapped();
          setIsTrapped(true);
        }

        // Dynamic Solvability
        const currentSubLevel: LevelDef = {
          ...currentLevel,
          rows: currentLevel.rows.map((row, rY) => {
            let str = '';
            for (let rX = 0; rX < currentLevel.width; rX++) {
              if (rX === finalX && rY === finalY) str += 'S';
              else str += row[rX] || '#';
            }
            return str;
          }),
        };
        const sol = solveLevel(currentSubLevel);
        setIsSolvable(sol.solvable);
        setMinMoves(sol.minMoves);
      }
    },
    [
      isWon,
      isTrapped,
      playerPos,
      currentLevel,
      prevPos,
      switchStates,
      inventory,
      collectedKeys,
      gateStates,
      teleporterUses,
      moveCount,
      isExitPos,
      completedLevels,
    ]
  );

  // SPECIAL ABILITY 1: QUANTUM BLINK (TELEPORT ANYWHERE!)
  const handleToggleBlinkMode = useCallback(() => {
    if (inventory.abilities.quantumBlinks <= 0) {
      sound.playAbilityDenied();
      return;
    }
    const nextMode = !isBlinkActive;
    setIsBlinkActive(nextMode);
    sceneManagerRef.current?.setBlinkMode(nextMode);
  }, [isBlinkActive, inventory.abilities.quantumBlinks]);

  const handleBlinkTargetSelect = useCallback(
    (targetX: number, targetY: number) => {
      if (inventory.abilities.quantumBlinks <= 0) {
        sound.playAbilityDenied();
        return;
      }

      // Check target is inside bounds and not a wall
      if (targetX < 0 || targetX >= currentLevel.width || targetY < 0 || targetY >= currentLevel.height) {
        return;
      }
      const char = currentLevel.rows[targetY]?.[targetX] ?? '#';
      if (char === '#') return;

      // Save History Snapshot
      const snapshot: GameSnapshot = {
        playerPos: { ...playerPos },
        prevPos: prevPos ? { ...prevPos } : null,
        moveCount,
        inventory: {
          keys: { ...inventory.keys },
          abilities: { ...inventory.abilities },
        },
        collectedKeys: [...collectedKeys],
        gateStates: { ...gateStates },
        switchStates: { ...switchStates },
        teleporterUses: { ...teleporterUses },
        toggledWalls: {},
      };
      setHistory((prev) => [...prev, snapshot]);

      // Decrement Blink Charge
      const nextAbilities = {
        ...inventory.abilities,
        quantumBlinks: inventory.abilities.quantumBlinks - 1,
      };
      setInventory((inv) => ({ ...inv, abilities: nextAbilities }));
      setIsBlinkActive(false);

      // Audio & Particle FX
      sound.playQuantumBlink();

      // The vacated deck tile uncouples on hydraulic dampers!
      const finalPrevPos = { ...playerPos };
      const newPos = { x: targetX, y: targetY };

      setPlayerPos(newPos);
      setPrevPos(finalPrevPos);
      setMoveCount((c) => c + 1);
      setIsTrapped(false);

      sceneManagerRef.current?.teleportPlayerTo(targetX, targetY, finalPrevPos);

      // Check Key Pickup if teleported onto key
      if ((char === 'K' || char === 'C' || char === 'M') && !collectedKeys.includes(`${targetX},${targetY}`)) {
        sound.playKeyPickup();
        const color = char === 'K' ? 'gold' : char === 'C' ? 'cyan' : 'magenta';
        const nextKeys = { ...inventory.keys, [color]: (inventory.keys[color] || 0) + 1 };
        setCollectedKeys((prev) => [...prev, `${targetX},${targetY}`]);
        setInventory((inv) => ({ ...inv, keys: nextKeys }));
        sceneManagerRef.current?.removeKeyMesh(targetX, targetY);
      }

      // Win Condition Check
      if (isExitPos(currentLevel, newPos)) {
        sound.playWinFanfare();
        setIsWon(true);
        if (!completedLevels.includes(currentLevel.id)) {
          setCompletedLevels((prev) => [...prev, currentLevel.id]);
        }
        return;
      }

      // Legal Moves Check
      const held = [
        ...(inventory.keys.gold > 0 ? ['gold'] : []),
        ...(inventory.keys.cyan > 0 ? ['cyan'] : []),
        ...(inventory.keys.magenta > 0 ? ['magenta'] : []),
      ];
      const legal = getLegalMoves(targetX, targetY, finalPrevPos.x, finalPrevPos.y, currentLevel, held, switchStates);
      setAvailableMovesCount(legal.length);
    },
    [
      inventory,
      playerPos,
      prevPos,
      moveCount,
      collectedKeys,
      gateStates,
      switchStates,
      teleporterUses,
      currentLevel,
      isExitPos,
      completedLevels,
    ]
  );

  // SPECIAL ABILITY 2: PHASE RESTORE (RESTORE UNCOUPLED TILE IMMEDIATELY)
  const handleActivatePhaseRestore = useCallback(() => {
    if (inventory.abilities.phaseRestores <= 0) {
      sound.playAbilityDenied();
      return;
    }
    if (!prevPos) return;

    sound.playPhaseRestore();

    // Snapshot
    const snapshot: GameSnapshot = {
      playerPos: { ...playerPos },
      prevPos: { ...prevPos },
      moveCount,
      inventory: {
        keys: { ...inventory.keys },
        abilities: { ...inventory.abilities },
      },
      collectedKeys: [...collectedKeys],
      gateStates: { ...gateStates },
      switchStates: { ...switchStates },
      teleporterUses: { ...teleporterUses },
      toggledWalls: {},
    };
    setHistory((prev) => [...prev, snapshot]);

    const nextAbilities = {
      ...inventory.abilities,
      phaseRestores: inventory.abilities.phaseRestores - 1,
    };
    setInventory((inv) => ({ ...inv, abilities: nextAbilities }));
    setPrevPos(null);
    setIsTrapped(false);

    sceneManagerRef.current?.updateTileStates(null);

    const held = [
      ...(inventory.keys.gold > 0 ? ['gold'] : []),
      ...(inventory.keys.cyan > 0 ? ['cyan'] : []),
      ...(inventory.keys.magenta > 0 ? ['magenta'] : []),
    ];
    const legal = getLegalMoves(playerPos.x, playerPos.y, -1, -1, currentLevel, held, switchStates);
    setAvailableMovesCount(legal.length);
  }, [inventory, prevPos, playerPos, moveCount, collectedKeys, gateStates, switchStates, teleporterUses, currentLevel]);

  // Undo step
  const handleUndo = useCallback(() => {
    if (history.length === 0) return;

    const previousSnapshot = history[history.length - 1];
    setHistory((prev) => prev.slice(0, prev.length - 1));

    setPlayerPos(previousSnapshot.playerPos);
    setPrevPos(previousSnapshot.prevPos);
    setMoveCount(previousSnapshot.moveCount);
    setInventory(previousSnapshot.inventory);
    setCollectedKeys(previousSnapshot.collectedKeys);
    setGateStates(previousSnapshot.gateStates);
    setSwitchStates(previousSnapshot.switchStates);
    setTeleporterUses(previousSnapshot.teleporterUses);
    setIsTrapped(false);
    setIsWon(false);
    setIsBlinkActive(false);

    if (sceneManagerRef.current) {
      sceneManagerRef.current.setBlinkMode(false);
      sceneManagerRef.current.snapPlayerTo(
        previousSnapshot.playerPos.x,
        previousSnapshot.playerPos.y,
        previousSnapshot.prevPos
      );
      if (currentLevel.switches) {
        for (const sw of currentLevel.switches) {
          sceneManagerRef.current.setSwitchActive(sw.id, previousSnapshot.switchStates[sw.id] ?? false);
        }
      }
    }

    const currentHeldKeys = [
      ...(previousSnapshot.inventory.keys.gold > 0 ? ['gold'] : []),
      ...(previousSnapshot.inventory.keys.cyan > 0 ? ['cyan'] : []),
      ...(previousSnapshot.inventory.keys.magenta > 0 ? ['magenta'] : []),
    ];
    const legal = getLegalMoves(
      previousSnapshot.playerPos.x,
      previousSnapshot.playerPos.y,
      previousSnapshot.prevPos ? previousSnapshot.prevPos.x : -1,
      previousSnapshot.prevPos ? previousSnapshot.prevPos.y : -1,
      currentLevel,
      currentHeldKeys,
      previousSnapshot.switchStates
    );
    setAvailableMovesCount(legal.length);
  }, [history, currentLevel]);

  // Reset current level
  const handleReset = useCallback(() => {
    initLevel(currentLevel);
  }, [initLevel, currentLevel]);

  // CAMERA-RELATIVE SCREEN MOVEMENT DISPATCHER:
  // "When we move the screen, the character should move as well. If we change sides, the character should change sides too."
  const moveScreenDirection = useCallback(
    (screenDir: 'up' | 'down' | 'left' | 'right') => {
      // Calculate azimuth-relative cardinal direction
      const az = cameraAzimuth;
      // Normalize angle to [0, 2PI]
      let angle = ((az % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

      // Quantize azimuth into 4 quadrants to map screen Up/Down/Left/Right to grid vectors
      // Camera looks toward center from (sin(az), cos(az))
      // So looking direction is (-sin(az), -cos(az)) in (X, Z/Y)
      let forwardDx = 0;
      let forwardDy = 0;

      if (angle >= Math.PI * 0.25 && angle < Math.PI * 0.75) {
        // Camera is towards +X: looking -X (Left on grid)
        forwardDx = -1;
        forwardDy = 0;
      } else if (angle >= Math.PI * 0.75 && angle < Math.PI * 1.25) {
        // Camera is towards +Z: looking -Z (Up on grid)
        forwardDx = 0;
        forwardDy = -1;
      } else if (angle >= Math.PI * 1.25 && angle < Math.PI * 1.75) {
        // Camera is towards -X: looking +X (Right on grid)
        forwardDx = 1;
        forwardDy = 0;
      } else {
        // Camera is towards -Z: looking +Z (Down on grid)
        forwardDx = 0;
        forwardDy = 1;
      }

      let rightDx = -forwardDy;
      let rightDy = forwardDx;

      let targetX = playerPos.x;
      let targetY = playerPos.y;

      if (screenDir === 'up') {
        targetX += forwardDx;
        targetY += forwardDy;
      } else if (screenDir === 'down') {
        targetX -= forwardDx;
        targetY -= forwardDy;
      } else if (screenDir === 'right') {
        targetX += rightDx;
        targetY += rightDy;
      } else if (screenDir === 'left') {
        targetX -= rightDx;
        targetY -= rightDy;
      }

      attemptMove(targetX, targetY);
    },
    [cameraAzimuth, playerPos, attemptMove]
  );

  // Keyboard navigation listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Escape') {
        if (isBlinkActive) {
          handleToggleBlinkMode();
          return;
        }
      }

      if (e.key === 'b' || e.key === 'B') {
        handleToggleBlinkMode();
        return;
      }

      if (e.key === 'p' || e.key === 'P') {
        handleActivatePhaseRestore();
        return;
      }

      if (e.key === 'z' || e.key === 'Z') {
        if (history.length > 0) {
          sound.playUndo();
          handleUndo();
        }
        return;
      }

      if (e.key === 'r' || e.key === 'R') {
        sound.playMove();
        handleReset();
        return;
      }

      if (e.key === 'h' || e.key === 'H') {
        sound.playKeyPickup();
        setShowOracle((prev) => !prev);
        return;
      }

      if (e.key === 'm' || e.key === 'M') {
        const nextMute = sound.toggleMute();
        setIsMuted(nextMute);
        return;
      }

      if (e.key === '+' || e.key === '=') {
        sceneManagerRef.current?.zoomIn();
        return;
      }

      if (e.key === '-' || e.key === '_') {
        sceneManagerRef.current?.zoomOut();
        return;
      }

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        setShowHelp((prev) => !prev);
        return;
      }

      if (screen !== 'playing') {
        if (e.key === 'Enter' || e.key === ' ') {
          sound.startBackgroundMusic();
          sound.speakAstronaut('Commander Elena Vance on station. Mission active.');
          sound.playWinFanfare();
          setScreen('playing');
        }
        return;
      }

      // Camera-Relative Screen Movement
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
        moveScreenDirection('up');
      } else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
        moveScreenDirection('down');
      } else if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        moveScreenDirection('left');
      } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
        moveScreenDirection('right');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    screen,
    playerPos,
    moveScreenDirection,
    handleUndo,
    handleReset,
    handleToggleBlinkMode,
    handleActivatePhaseRestore,
    isBlinkActive,
    history.length,
  ]);

  // Mount Three.js SceneManager
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const manager = new ChronoSceneManager(canvasContainerRef.current, {
      onTileClick: (tx, ty) => {
        attemptMove(tx, ty);
      },
      onBlinkTargetSelect: (tx, ty) => {
        handleBlinkTargetSelect(tx, ty);
      },
      onCameraChange: (azimuth) => {
        setCameraAzimuth(azimuth);
      },
    });

    sceneManagerRef.current = manager;
    initLevel(currentLevel);

    return () => {
      manager.dispose();
      sceneManagerRef.current = null;
    };
  }, []);

  const handleNextLevel = () => {
    const currentIndex = HANDCRAFTED_LEVELS.findIndex((l) => l.id === currentLevel.id);
    if (currentIndex >= 0 && currentIndex < HANDCRAFTED_LEVELS.length - 1) {
      const nextLvl = HANDCRAFTED_LEVELS[currentIndex + 1];
      initLevel(nextLvl);
    } else {
      setShowLevelSelect(true);
    }
  };

  const hasNextLevel =
    HANDCRAFTED_LEVELS.findIndex((l) => l.id === currentLevel.id) < HANDCRAFTED_LEVELS.length - 1;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 3D WebGL Canvas Container */}
      <div
        ref={canvasContainerRef}
        className={`absolute inset-0 z-0 w-full h-full ${
          isBlinkActive ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
        }`}
      />

      {/* Screen: Title Screen */}
      {screen === 'title' && (
        <TitleScreen
          onStartGame={() => {
            sound.startBackgroundMusic();
            sound.speakAstronaut('Commander Elena Vance on station. Mission active.');
            setScreen('playing');
            initLevel(currentLevel);
          }}
          onOpenLevelSelect={() => setShowLevelSelect(true)}
          onOpenLevelEditor={() => setShowLevelEditor(true)}
          onOpenHelp={() => setShowHelp(true)}
          isMuted={isMuted}
          onToggleMute={() => {
            const muted = sound.toggleMute();
            setIsMuted(muted);
          }}
        />
      )}

      {/* Screen: Playing Game HUD */}
      {screen === 'playing' && (
        <>
          <GameHud
            level={currentLevel}
            moveCount={moveCount}
            prevPos={prevPos}
            canUndo={history.length > 0}
            onUndo={handleUndo}
            onReset={handleReset}
            onOpenOracle={() => setShowOracle(true)}
            onOpenLevelSelect={() => setShowLevelSelect(true)}
            onOpenHelp={() => setShowHelp(true)}
            onToggleCamera={() => {
              const nextIso = !isIsometric;
              setIsIsometric(nextIso);
              sceneManagerRef.current?.resetCameraView(nextIso);
            }}
            onZoomIn={() => sceneManagerRef.current?.zoomIn()}
            onZoomOut={() => sceneManagerRef.current?.zoomOut()}
            isIsometric={isIsometric}
            isMuted={isMuted}
            onToggleMute={() => {
              const muted = sound.toggleMute();
              setIsMuted(muted);
            }}
            abilities={inventory.abilities}
            onToggleBlinkMode={handleToggleBlinkMode}
            isBlinkActive={isBlinkActive}
            onActivatePhaseRestore={handleActivatePhaseRestore}
            elapsedSeconds={elapsedSeconds}
          />

          {/* On-Screen Touch D-Pad for Mobile / Responsive Touch Screens */}
          <div className="fixed bottom-24 right-6 z-20 hidden sm:flex md:hidden flex-col items-center gap-1 bg-slate-900/80 p-2 rounded-2xl border border-slate-700/80 shadow-2xl pointer-events-auto">
            <button
              onClick={() => moveScreenDirection('up')}
              className="w-10 h-10 rounded-xl bg-slate-800 active:bg-cyan-600 text-white flex items-center justify-center font-bold text-lg cursor-pointer"
            >
              ▲
            </button>
            <div className="flex gap-1">
              <button
                onClick={() => moveScreenDirection('left')}
                className="w-10 h-10 rounded-xl bg-slate-800 active:bg-cyan-600 text-white flex items-center justify-center font-bold text-lg cursor-pointer"
              >
                ◀
              </button>
              <button
                onClick={() => moveScreenDirection('down')}
                className="w-10 h-10 rounded-xl bg-slate-800 active:bg-cyan-600 text-white flex items-center justify-center font-bold text-lg cursor-pointer"
              >
                ▼
              </button>
              <button
                onClick={() => moveScreenDirection('right')}
                className="w-10 h-10 rounded-xl bg-slate-800 active:bg-cyan-600 text-white flex items-center justify-center font-bold text-lg cursor-pointer"
              >
                ▶
              </button>
            </div>
          </div>

          {/* Collapsible Ergonomic Bottom Dock */}
          <CollapsibleDock
            playerPos={playerPos}
            prevPos={prevPos}
            inventory={inventory}
            isSolvable={isSolvable}
            minMoves={minMoves}
            availableMovesCount={availableMovesCount}
            onToggleBlinkMode={handleToggleBlinkMode}
            isBlinkActive={isBlinkActive}
            onActivatePhaseRestore={handleActivatePhaseRestore}
          />
        </>
      )}

      {/* Modals & Dialogs */}
      {isWon && (
        <VictoryModal
          level={currentLevel}
          moveCount={moveCount}
          elapsedSeconds={elapsedSeconds}
          onNextLevel={handleNextLevel}
          onReplay={handleReset}
          onOpenLevelSelect={() => {
            setIsWon(false);
            setShowLevelSelect(true);
          }}
          hasNextLevel={hasNextLevel}
        />
      )}

      {isTrapped && (
        <TrappedModal
          prevPos={prevPos}
          onUndo={handleUndo}
          onReset={handleReset}
        />
      )}

      {showOracle && (
        <OracleModal
          level={currentLevel}
          playerPos={playerPos}
          prevPos={prevPos}
          moveCount={moveCount}
          inventory={inventory}
          onClose={() => setShowOracle(false)}
          onApplyNextMove={(target) => {
            attemptMove(target.x, target.y);
          }}
        />
      )}

      {showLevelSelect && (
        <LevelSelectModal
          currentLevelId={currentLevel.id}
          completedLevelIds={completedLevels}
          onSelectLevel={(lvl) => {
            initLevel(lvl);
            setScreen('playing');
          }}
          onClose={() => setShowLevelSelect(false)}
        />
      )}

      {showLevelEditor && (
        <LevelEditorModal
          onPlayCustomLevel={(customLvl) => {
            initLevel(customLvl);
            setScreen('playing');
          }}
          onClose={() => setShowLevelEditor(false)}
        />
      )}

      {showHelp && (
        <HelpModal onClose={() => setShowHelp(false)} />
      )}
    </div>
  );
}
