import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  addRandomTile,
  createInitialBoard,
  hasAvailableMove,
  moveBoard,
  type Board,
  type Direction,
} from "./game";
import { initializeAdMob, showInterstitial } from "./admob";

import "./menu.css";

import eggImg from "./assets/dino/oeuf.png";
import dodoImg from "./assets/dino/dodo.png";
import compsoImg from "./assets/dino/compso.png";
import raptorImg from "./assets/dino/raptor.png";
import pachyImg from "./assets/dino/pachy.png";
import ankyImg from "./assets/dino/anky.png";
import paraImg from "./assets/dino/para.png";
import triceImg from "./assets/dino/trice.png";
import stegoImg from "./assets/dino/stego.png";
import diploImg from "./assets/dino/diplo.png";
import trexImg from "./assets/dino/trex.png";

import supportScoreImg from "./assets/ui/supportscore.png";
import foliageSideImg from "./assets/ui/feuillage-cote.png";

import menuVideo from "./assets/video/VideoMenu.mp4";
import menuTitleImg from "./assets/ui/menu/titre.png";
import playButtonImg from "./assets/ui/menu/bt_normal.png";
import playButtonPressedImg from "./assets/ui/menu/btpressed.png";

import gameOverBgImg from "./assets/ui/menu/GameOverBG.png";
import replayButtonImg from "./assets/ui/menu/Rejouer.png";
import replayButtonPressedImg from "./assets/ui/menu/Rejouer-clicked.png";

import musicAudio from "./assets/sound/musique.mp3";
import clickAudio from "./assets/sound/click.mp3";
import swooshAudio from "./assets/sound/swoosh.mp3";
import fusionAudio from "./assets/sound/fusion.mp3";

import loomStudioImg from './assets/ui/menu/loomstudio.png';

const BEST_SCORE_KEY = "merge2048-best-score";
const CURRENT_GAME_KEY = "dinomerge-current-game";
const TUTORIAL_DONE_KEY = "dinomerge-tutorial-done";
const GAME_OVER_AD_COUNT_KEY = "dinomerge-game-over-ad-count";
const AD_EVERY_N_GAMES = 3;
const SWIPE_THRESHOLD = 35;
const WIN_VALUE = 2048;
const SLIDE_ANIMATION_DURATION = 165;
const SLIDE_COMMIT_DELAY = 195;
const MERGE_BUMP_DURATION = 240;
const STUDIO_SPLASH_DURATION = 2800;

const MUSIC_VOLUME = 0.32;
const CLICK_VOLUME = 0.65;
const SWOOSH_VOLUME = 0.2;
const FUSION_VOLUME = 0.2;

type Screen = "studio" | "menu" | "game";
type TutorialStep = 0 | 1 | 2;

interface GameState {
  board: Board;
  score: number;
  bestScore: number;
  gameOver: boolean;
  hasWon: boolean;
  keepPlaying: boolean;
}

interface TileMovement {
  value: number;
  fromRow: number;
  fromColumn: number;
  toRow: number;
  toColumn: number;
}

interface SlideTile extends TileMovement {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  deltaX: number;
  deltaY: number;
}

type SlideTileStyle = CSSProperties & {
  "--slide-x": string;
  "--slide-y": string;
  "--slide-duration": string;
};

function getLinePositions(
  direction: Direction,
  lineIndex: number,
): Array<{ row: number; column: number }> {
  if (direction === "left") {
    return Array.from({ length: 4 }, (_, column) => ({
      row: lineIndex,
      column,
    }));
  }

  if (direction === "right") {
    return Array.from({ length: 4 }, (_, index) => ({
      row: lineIndex,
      column: 3 - index,
    }));
  }

  if (direction === "up") {
    return Array.from({ length: 4 }, (_, row) => ({
      row,
      column: lineIndex,
    }));
  }

  return Array.from({ length: 4 }, (_, index) => ({
    row: 3 - index,
    column: lineIndex,
  }));
}

/**
 * Reproduit le déplacement 2048 ligne par ligne afin de savoir
 * précisément de quelle case vers quelle case chaque tuile doit glisser.
 */
function calculateTileMovements(
  board: Board,
  direction: Direction,
): TileMovement[] {
  const movements: TileMovement[] = [];

  for (let lineIndex = 0; lineIndex < 4; lineIndex += 1) {
    const positions = getLinePositions(direction, lineIndex);

    const sourceTiles = positions
      .map((position) => ({
        ...position,
        value: board[position.row][position.column],
      }))
      .filter((tile) => tile.value !== 0);

    let sourceIndex = 0;
    let targetIndex = 0;

    while (sourceIndex < sourceTiles.length) {
      const current = sourceTiles[sourceIndex];
      const next = sourceTiles[sourceIndex + 1];
      const destination = positions[targetIndex];

      movements.push({
        value: current.value,
        fromRow: current.row,
        fromColumn: current.column,
        toRow: destination.row,
        toColumn: destination.column,
      });

      if (next && next.value === current.value) {
        movements.push({
          value: next.value,
          fromRow: next.row,
          fromColumn: next.column,
          toRow: destination.row,
          toColumn: destination.column,
        });

        sourceIndex += 2;
      } else {
        sourceIndex += 1;
      }

      targetIndex += 1;
    }
  }

  return movements;
}

function readTutorialDone(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_DONE_KEY) === "1";
  } catch {
    return false;
  }
}

function saveTutorialDone(): void {
  try {
    localStorage.setItem(TUTORIAL_DONE_KEY, "1");
  } catch {
    // Le tutoriel reste utilisable même si le stockage est indisponible.
  }
}

function readBestScore(): number {
  try {
    const value = Number(localStorage.getItem(BEST_SCORE_KEY) ?? 0);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function saveBestScore(score: number): void {
  try {
    localStorage.setItem(BEST_SCORE_KEY, String(score));
  } catch {
    // Le jeu reste fonctionnel même si le stockage local est indisponible.
  }
}

function readSavedGame(): GameState | null {
  try {
    const savedGame = localStorage.getItem(CURRENT_GAME_KEY);

    if (!savedGame) {
      return null;
    }

    const parsed = JSON.parse(savedGame) as GameState;

    const validBoard =
      Array.isArray(parsed.board) &&
      parsed.board.length === 4 &&
      parsed.board.every((row) => Array.isArray(row) && row.length === 4);

    if (!validBoard) {
      return null;
    }

    return {
      board: parsed.board,
      score: Number(parsed.score) || 0,
      bestScore: Math.max(Number(parsed.bestScore) || 0, readBestScore()),
      gameOver: Boolean(parsed.gameOver),
      hasWon: Boolean(parsed.hasWon),
      keepPlaying: Boolean(parsed.keepPlaying),
    };
  } catch {
    return null;
  }
}

function saveCurrentGame(game: GameState): void {
  try {
    localStorage.setItem(CURRENT_GAME_KEY, JSON.stringify(game));
  } catch {
    // Le jeu reste fonctionnel même si la sauvegarde est indisponible.
  }
}

function readGameOverAdCount(): number {
  try {
    const value = Number(localStorage.getItem(GAME_OVER_AD_COUNT_KEY) ?? 0);

    if (!Number.isFinite(value) || value < 0) {
      return 0;
    }

    return Math.min(Math.floor(value), AD_EVERY_N_GAMES - 1);
  } catch {
    return 0;
  }
}

function saveGameOverAdCount(count: number): void {
  try {
    localStorage.setItem(
      GAME_OVER_AD_COUNT_KEY,
      String(Math.max(0, Math.floor(count))),
    );
  } catch {
    // Une erreur de stockage ne doit jamais empêcher de rejouer.
  }
}

const TILE_DATA: Record<number, { name: string; image: string }> = {
  2: { name: "Œuf", image: eggImg },
  4: { name: "Dodo", image: dodoImg },
  8: { name: "Compsognatus", image: compsoImg },
  16: { name: "Raptor", image: raptorImg },
  32: { name: "Pachysaurus", image: pachyImg },
  64: { name: "Ankylosaure", image: ankyImg },
  128: { name: "Parasaurolophus", image: paraImg },
  256: { name: "Tricératops", image: triceImg },
  512: { name: "Stégosaure", image: stegoImg },
  1024: { name: "Diplodocus", image: diploImg },
  2048: { name: "T-Rex", image: trexImg },
};

function tileClass(value: number): string {
  return value === 0 ? "tile tile-empty" : "tile tile-dino";
}

function renderTileContent(value: number) {
  if (value === 0) {
    return null;
  }

  const info = TILE_DATA[value];

  if (!info) {
    return <span>{value}</span>;
  }

  return (
    <>
      <div className="tile-value">{value}</div>
      <img
        src={info.image}
        alt={info.name}
        className="tile-image"
        draggable={false}
      />
      <div className="tile-name">{info.name}</div>
    </>
  );
}

function App() {
  const [screen, setScreen] = useState<Screen>("studio");
  const [tutorialDone, setTutorialDone] = useState<boolean>(() =>
    readTutorialDone(),
  );
  const [tutorialStep, setTutorialStep] = useState<TutorialStep>(0);

  const tutorialVisible = screen === "game" && !tutorialDone;

  const [game, setGame] = useState<GameState>(() => {
    const savedGame = readSavedGame();

    if (savedGame) {
      return savedGame;
    }

    return {
      board: createInitialBoard(),
      score: 0,
      bestScore: readBestScore(),
      gameOver: false,
      hasWon: false,
      keepPlaying: false,
    };
  });

  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const musicRef = useRef<HTMLAudioElement | null>(null);
  const clickSoundRef = useRef<HTMLAudioElement | null>(null);
  const swooshSoundRef = useRef<HTMLAudioElement | null>(null);
  const fusionSoundRef = useRef<HTMLAudioElement | null>(null);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const animationTimerRef = useRef<number | null>(null);
  const mergeBumpTimerRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);

  const [isAnimating, setIsAnimating] = useState(false);
  const [slideTiles, setSlideTiles] = useState<SlideTile[]>([]);
  const [hiddenSourceCells, setHiddenSourceCells] = useState<Set<string>>(
    () => new Set(),
  );
  const [mergedCells, setMergedCells] = useState<Set<string>>(() => new Set());
  const [isShowingAd, setIsShowingAd] = useState(false);
  const adInProgressRef = useRef(false);

  const playSound = useCallback(
    (audioRef: React.RefObject<HTMLAudioElement | null>) => {
      const audio = audioRef.current;

      if (!audio) {
        return;
      }

      audio.currentTime = 0;
      void audio.play().catch(() => {
        // Certains navigateurs bloquent le son avant la première interaction.
      });
    },
    [],
  );

  const startMusic = useCallback(() => {
    const music = musicRef.current;

    if (!music || !music.paused) {
      return;
    }

    void music.play().catch(() => {
      // La musique démarrera à la première interaction autorisée.
    });
  }, []);

  const playClickSound = useCallback(() => {
    startMusic();
    playSound(clickSoundRef);
  }, [playSound, startMusic]);

  const stopSlideAnimation = useCallback(() => {
    if (animationTimerRef.current !== null) {
      window.clearTimeout(animationTimerRef.current);
      animationTimerRef.current = null;
    }

    if (mergeBumpTimerRef.current !== null) {
      window.clearTimeout(mergeBumpTimerRef.current);
      mergeBumpTimerRef.current = null;
    }

    isAnimatingRef.current = false;
    setIsAnimating(false);
    setSlideTiles([]);
    setHiddenSourceCells(new Set());
    setMergedCells(new Set());
  }, []);

  const performMove = useCallback(
    (direction: Direction) => {
      if (
        !tutorialDone ||
        isAnimatingRef.current ||
        game.gameOver ||
        (game.hasWon && !game.keepPlaying)
      ) {
        return;
      }

      const move = moveBoard(game.board, direction);

      if (!move.changed) {
        return;
      }

      startMusic();
      playSound(swooshSoundRef);

      if (mergeBumpTimerRef.current !== null) {
        window.clearTimeout(mergeBumpTimerRef.current);
        mergeBumpTimerRef.current = null;
        setMergedCells(new Set());
      }

      const boardElement = boardRef.current;

      if (!boardElement) {
        return;
      }

      const boardRect = boardElement.getBoundingClientRect();

      /*
       * .slide-layer commence à l'intérieur de la bordure du plateau.
       * On prend donc clientLeft/clientTop en compte afin que la copie
       * animée et la vraie tuile aient exactement la même position.
       */
      const boardContentLeft = boardRect.left + boardElement.clientLeft;
      const boardContentTop = boardRect.top + boardElement.clientTop;

      const movements = calculateTileMovements(game.board, direction);

      /*
       * Une destination qui reçoit deux tuiles correspond à une fusion.
       * On mémorise uniquement ces cases pour leur appliquer le bump.
       */
      const destinationCounts = new Map<string, number>();

      movements.forEach((movement) => {
        const key = `${movement.toRow}-${movement.toColumn}`;
        destinationCounts.set(key, (destinationCounts.get(key) ?? 0) + 1);
      });

      const mergedDestinationKeys = new Set(
        [...destinationCounts.entries()]
          .filter(([, count]) => count === 2)
          .map(([key]) => key),
      );

      /*
       * On n'anime pas les tuiles immobiles qui ne fusionnent pas.
       * Elles restent affichées normalement, ce qui évite le petit
       * clignotement/saut visible à la fin du déplacement.
       *
       * Une tuile immobile qui participe à une fusion reste animée :
       * elle doit converger avec l'autre tuile vers la même destination.
       */
      const animatedMovements = movements.filter((movement) => {
        const moved =
          movement.fromRow !== movement.toRow ||
          movement.fromColumn !== movement.toColumn;

        const destinationKey = `${movement.toRow}-${movement.toColumn}`;

        return moved || mergedDestinationKeys.has(destinationKey);
      });

      const hiddenSources = new Set(
        animatedMovements.map(
          (movement) => `${movement.fromRow}-${movement.fromColumn}`,
        ),
      );

      const measuredSlideTiles = animatedMovements.flatMap(
        (movement, index) => {
          const sourceElement = boardElement.querySelector<HTMLElement>(
            `[data-row="${movement.fromRow}"][data-column="${movement.fromColumn}"]`,
          );

          const targetElement = boardElement.querySelector<HTMLElement>(
            `[data-row="${movement.toRow}"][data-column="${movement.toColumn}"]`,
          );

          if (!sourceElement || !targetElement) {
            return [];
          }

          const sourceRect = sourceElement.getBoundingClientRect();
          const targetRect = targetElement.getBoundingClientRect();

          return [
            {
              ...movement,
              id: `${movement.fromRow}-${movement.fromColumn}-${index}`,
              left: sourceRect.left - boardContentLeft,
              top: sourceRect.top - boardContentTop,
              width: sourceRect.width,
              height: sourceRect.height,
              deltaX: targetRect.left - sourceRect.left,
              deltaY: targetRect.top - sourceRect.top,
            },
          ];
        },
      );

      isAnimatingRef.current = true;
      setIsAnimating(true);
      setSlideTiles(measuredSlideTiles);
      setHiddenSourceCells(hiddenSources);

      animationTimerRef.current = window.setTimeout(() => {
        const nextBoard = addRandomTile(move.board);
        const nextScore = game.score + move.gained;
        const nextBestScore = Math.max(game.bestScore, nextScore);

        const hasWon =
          game.hasWon ||
          nextBoard.some((row) => row.some((value) => value >= WIN_VALUE));

        const gameOver = !hasAvailableMove(nextBoard);

        if (nextBestScore !== game.bestScore) {
          saveBestScore(nextBestScore);
        }

        setGame({
          board: nextBoard,
          score: nextScore,
          bestScore: nextBestScore,
          gameOver,
          hasWon,
          keepPlaying: game.keepPlaying,
        });

        if (mergedDestinationKeys.size > 0) {
          playSound(fusionSoundRef);
          setMergedCells(mergedDestinationKeys);

          mergeBumpTimerRef.current = window.setTimeout(() => {
            setMergedCells(new Set());
            mergeBumpTimerRef.current = null;
          }, MERGE_BUMP_DURATION);
        }

        animationTimerRef.current = null;
        isAnimatingRef.current = false;
        setIsAnimating(false);
        setSlideTiles([]);
        setHiddenSourceCells(new Set());
      }, SLIDE_COMMIT_DELAY);
    },
    [game, playSound, startMusic, tutorialDone],
  );

  const startNewGame = useCallback(() => {
    stopSlideAnimation();

    setGame((currentGame) => ({
      board: createInitialBoard(),
      score: 0,
      bestScore: currentGame.bestScore,
      gameOver: false,
      hasWon: false,
      keepPlaying: false,
    }));
  }, [stopSlideAnimation]);

  const playGame = useCallback(() => {
    setGame((currentGame) => {
      if (!currentGame.gameOver) {
        return currentGame;
      }

      return {
        board: createInitialBoard(),
        score: 0,
        bestScore: currentGame.bestScore,
        gameOver: false,
        hasWon: false,
        keepPlaying: false,
      };
    });

    setScreen("game");
  }, []);

  const continueGame = useCallback(() => {
    setGame((currentGame) => ({
      ...currentGame,
      keepPlaying: true,
    }));
  }, []);

  const nextTutorialStep = useCallback(() => {
    setTutorialStep((currentStep) => {
      if (currentStep >= 2) {
        return currentStep;
      }

      return (currentStep + 1) as TutorialStep;
    });
  }, []);

  const finishTutorial = useCallback(() => {
    saveTutorialDone();
    setTutorialDone(true);
    setTutorialStep(0);
  }, []);

  const replayAfterGameOver = useCallback(async () => {
    if (adInProgressRef.current) {
      return;
    }

    adInProgressRef.current = true;
    playClickSound();

    const nextAdCount = readGameOverAdCount() + 1;

    if (nextAdCount < AD_EVERY_N_GAMES) {
      saveGameOverAdCount(nextAdCount);
      adInProgressRef.current = false;
      startNewGame();
      return;
    }

    setIsShowingAd(true);

    const music = musicRef.current;
    const shouldResumeMusic = Boolean(music && !music.paused);
    music?.pause();

    try {
      const adWasShown = await showInterstitial();

      /*
       * Si la publicité n'était pas encore prête, on réessaiera dès la
       * prochaine fin de partie au lieu de repartir de zéro.
       */
      saveGameOverAdCount(adWasShown ? 0 : AD_EVERY_N_GAMES - 1);
    } finally {
      setIsShowingAd(false);
      adInProgressRef.current = false;
      startNewGame();

      if (shouldResumeMusic) {
        startMusic();
      }
    }
  }, [playClickSound, startMusic, startNewGame]);

  useEffect(() => {
    if (screen !== "studio") {
      return;
    }

    const timer = window.setTimeout(() => {
      setScreen("menu");
    }, STUDIO_SPLASH_DURATION);

    return () => {
      window.clearTimeout(timer);
    };
  }, [screen]);

  useEffect(() => {
    void initializeAdMob();
  }, []);

  useEffect(() => {
    const music = new Audio(musicAudio);
    music.loop = true;
    music.volume = MUSIC_VOLUME;
    music.preload = "auto";

    const click = new Audio(clickAudio);
    click.volume = CLICK_VOLUME;
    click.preload = "auto";

    const swoosh = new Audio(swooshAudio);
    swoosh.volume = SWOOSH_VOLUME;
    swoosh.preload = "auto";

    const fusion = new Audio(fusionAudio);
    fusion.volume = FUSION_VOLUME;
    fusion.preload = "auto";

    musicRef.current = music;
    clickSoundRef.current = click;
    swooshSoundRef.current = swoosh;
    fusionSoundRef.current = fusion;

    /*
     * Les navigateurs mobiles interdisent souvent la lecture automatique.
     * La première pression ou touche déverrouille donc la musique.
     */
    const unlockAudio = () => {
      void music.play().catch(() => {
        // La prochaine interaction réessaiera si nécessaire.
      });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        music.pause();
        return;
      }

      void music.play().catch(() => {
        // Rien à faire si le navigateur attend encore une interaction.
      });
    };

    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      music.pause();
      click.pause();
      swoosh.pause();
      fusion.pause();

      musicRef.current = null;
      clickSoundRef.current = null;
      swooshSoundRef.current = null;
      fusionSoundRef.current = null;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (screen !== "game") {
        return;
      }

      const directions: Record<string, Direction | undefined> = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
        a: "left",
        d: "right",
        w: "up",
        s: "down",
      };

      const direction = directions[event.key];

      if (direction) {
        event.preventDefault();
        performMove(direction);
      }
    };

    window.addEventListener("keydown", handleKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [performMove, screen]);

  useEffect(() => {
    saveCurrentGame(game);
  }, [game]);

  useEffect(() => {
    return () => {
      if (animationTimerRef.current !== null) {
        window.clearTimeout(animationTimerRef.current);
      }

      if (mergeBumpTimerRef.current !== null) {
        window.clearTimeout(mergeBumpTimerRef.current);
      }
    };
  }, []);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStart.current) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    touchStart.current = null;

    if (
      Math.abs(deltaX) < SWIPE_THRESHOLD &&
      Math.abs(deltaY) < SWIPE_THRESHOLD
    ) {
      return;
    }

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      performMove(deltaX > 0 ? "right" : "left");
    } else {
      performMove(deltaY > 0 ? "down" : "up");
    }
  };

  if (screen === "studio") {
    return (
      <main className="studio-splash" aria-label="LoomStudio">
        <img
          src={loomStudioImg}
          alt="LoomStudio"
          className="studio-splash-image"
          draggable={false}
        />
      </main>
    );
  }

  if (screen === "menu") {
    return (
      <main className="menu-screen">
        <video
          className="menu-video"
          src={menuVideo}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
        />

        <div className="menu-overlay">
          <img
            src={menuTitleImg}
            alt="DinoMerge"
            className="menu-title"
            draggable={false}
          />

          <div className="menu-best-score">
            Meilleur score : {game.bestScore}
          </div>

          <button
            type="button"
            className="menu-play-button"
            onClick={() => {
              playClickSound();
              playGame();
            }}
            aria-label="Jouer"
          >
            <img
              src={playButtonImg}
              alt=""
              aria-hidden="true"
              className="menu-play-normal"
              draggable={false}
            />
            <img
              src={playButtonPressedImg}
              alt=""
              aria-hidden="true"
              className="menu-play-pressed"
              draggable={false}
            />
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <img
        src={foliageSideImg}
        alt=""
        aria-hidden="true"
        className="scene-fern fern-top-left1"
        draggable={false}
      />
      <img
        src={foliageSideImg}
        alt=""
        aria-hidden="true"
        className="scene-fern fern-top-left2"
        draggable={false}
      />
      <img
        src={foliageSideImg}
        alt=""
        aria-hidden="true"
        className="scene-fern fern-top-right"
        draggable={false}
      />
      <img
        src={foliageSideImg}
        alt=""
        aria-hidden="true"
        className="scene-fern fern-mid-right"
        draggable={false}
      />
      <img
        src={foliageSideImg}
        alt=""
        aria-hidden="true"
        className="scene-fern fern-bottom-left"
        draggable={false}
      />
      <img
        src={foliageSideImg}
        alt=""
        aria-hidden="true"
        className="scene-fern fern-bottom-right1"
        draggable={false}
      />
      <img
        src={foliageSideImg}
        alt=""
        aria-hidden="true"
        className="scene-fern fern-bottom-right2"
        draggable={false}
      />
      <img
        src={foliageSideImg}
        alt=""
        aria-hidden="true"
        className="scene-fern fern-bottom-right3"
        draggable={false}
      />

      <section className="game">
        <header className="game-hud">
          <h1 className="sr-only">Dino Merge</h1>

          <div
            className="score-banner"
            style={{ backgroundImage: `url(${supportScoreImg})` }}
          >
            <div className="score-banner-content">
              <div className="banner-score">
                <span>Score</span>
                <strong>{game.score}</strong>
              </div>

              <div className="score-separator" />

              <div className="banner-score">
                <span>Record</span>
                <strong>{game.bestScore}</strong>
              </div>
            </div>
          </div>
        </header>

        <div
          className={`board-wrapper${tutorialVisible ? " tutorial-blocked" : ""}`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          aria-label="Plateau de jeu Dino Merge"
        >
          <button
            type="button"
            className="new-game-button"
            onClick={() => {
              playClickSound();
              startNewGame();
            }}
          >
            Nouvelle partie
          </button>

          <div
            ref={boardRef}
            className={`board${isAnimating ? " is-animating" : ""}`}
          >
            {game.board.flatMap((row, rowIndex) =>
              row.map((value, columnIndex) => {
                const cellKey = `${rowIndex}-${columnIndex}`;
                const mergedClass = mergedCells.has(cellKey)
                  ? " tile-merged"
                  : "";

                const hiddenSourceClass = hiddenSourceCells.has(cellKey)
                  ? " tile-source-hidden"
                  : "";

                return (
                  <div
                    className={
                      `${tileClass(value)}` +
                      `${mergedClass}` +
                      `${hiddenSourceClass}`
                    }
                    key={`${rowIndex}-${columnIndex}-${value}`}
                    data-row={rowIndex}
                    data-column={columnIndex}
                    aria-label={value === 0 ? "Case vide" : `Case ${value}`}
                  >
                    {renderTileContent(value)}
                  </div>
                );
              }),
            )}

            {isAnimating && (
              <div className="slide-layer" aria-hidden="true">
                {slideTiles.map((tile) => {
                  const style: SlideTileStyle = {
                    left: tile.left,
                    top: tile.top,
                    width: tile.width,
                    height: tile.height,
                    "--slide-x": `${tile.deltaX}px`,
                    "--slide-y": `${tile.deltaY}px`,
                    "--slide-duration": `${SLIDE_ANIMATION_DURATION}ms`,
                  };

                  return (
                    <div
                      key={tile.id}
                      className="tile tile-dino slide-tile"
                      style={style}
                    >
                      {renderTileContent(tile.value)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {game.hasWon && !game.keepPlaying && (
            <div
              className="game-over victory-screen"
              role="dialog"
              aria-modal="true"
            >
              <div>
                <h2>Tu as créé le T-Rex !</h2>
                <p>Félicitations ! Tu peux continuer pour battre ton record.</p>

                <img
                  src={trexImg}
                  alt="T-Rex"
                  className="victory-dino"
                  draggable={false}
                />

                <div className="victory-actions">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      continueGame();
                    }}
                  >
                    Continuer
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      startNewGame();
                    }}
                  >
                    Nouvelle partie
                  </button>
                </div>
              </div>
            </div>
          )}

          {game.gameOver && (!game.hasWon || game.keepPlaying) && (
            <div
              className="game-over-overlay"
              role="dialog"
              aria-modal="true"
              aria-label="Partie terminée"
            >
              <div
                className="game-over-card"
                style={{ backgroundImage: `url(${gameOverBgImg})` }}
              >
                <div className="game-over-content">
                  <div className="game-over-score">
                    <span>Meilleur score</span>
                    <strong>{game.bestScore}</strong>
                  </div>

                  <div className="game-over-score">
                    <span>Score réalisé</span>
                    <strong>{game.score}</strong>
                  </div>

                  <button
                    type="button"
                    className="game-over-replay-button"
                    onClick={() => {
                      void replayAfterGameOver();
                    }}
                    disabled={isShowingAd}
                    aria-label={
                      isShowingAd ? "Chargement de la publicité" : "Rejouer"
                    }
                  >
                    <img
                      src={replayButtonImg}
                      alt=""
                      aria-hidden="true"
                      className="replay-normal"
                      draggable={false}
                    />

                    <img
                      src={replayButtonPressedImg}
                      alt=""
                      aria-hidden="true"
                      className="replay-pressed"
                      draggable={false}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {tutorialVisible && (
        <div
          className="tutorial-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Tutoriel DinoMerge"
        >
          <div className="tutorial-card">
            <button
              type="button"
              className="tutorial-skip"
              onClick={() => {
                playClickSound();
                finishTutorial();
              }}
            >
              Passer
            </button>

            <div className="tutorial-progress" aria-hidden="true">
              {[0, 1, 2].map((step) => (
                <span
                  key={step}
                  className={
                    step === tutorialStep
                      ? "tutorial-dot tutorial-dot-active"
                      : "tutorial-dot"
                  }
                />
              ))}
            </div>

            {tutorialStep === 0 && (
              <div className="tutorial-step">
                <h2>Fais glisser les dinos !</h2>

                <div className="tutorial-swipe-demo" aria-hidden="true">
                  <div className="tutorial-swipe-track">
                    <img
                      src={eggImg}
                      alt=""
                      className="tutorial-moving-egg"
                      draggable={false}
                    />
                  </div>

                  <div className="tutorial-swipe-arrows">
                    <span>←</span>
                    <span>↑</span>
                    <span>↓</span>
                    <span>→</span>
                  </div>
                </div>

                <p>
                  Glisse ton doigt dans une direction pour déplacer toutes les
                  cases du plateau.
                </p>
              </div>
            )}

            {tutorialStep === 1 && (
              <div className="tutorial-step">
                <h2>Fusionne les mêmes dinos</h2>

                <div className="tutorial-merge-demo" aria-hidden="true">
                  <img src={eggImg} alt="" draggable={false} />
                  <span>+</span>
                  <img src={eggImg} alt="" draggable={false} />
                  <span>=</span>
                  <img src={dodoImg} alt="" draggable={false} />
                </div>

                <p>
                  Deux dinosaures identiques qui se touchent fusionnent pour
                  créer l'évolution suivante.
                </p>
              </div>
            )}

            {tutorialStep === 2 && (
              <div className="tutorial-step">
                <h2>Crée le T-Rex !</h2>

                <img
                  src={trexImg}
                  alt="T-Rex"
                  className="tutorial-trex"
                  draggable={false}
                />

                <p>
                  Continue les fusions jusqu'au T-Rex. Ensuite, tu peux
                  continuer à jouer pour battre ton meilleur score.
                </p>
              </div>
            )}

            <button
              type="button"
              className="tutorial-next-button"
              onClick={() => {
                playClickSound();

                if (tutorialStep < 2) {
                  nextTutorialStep();
                } else {
                  finishTutorial();
                }
              }}
            >
              {tutorialStep < 2 ? "Suivant" : "C'est parti !"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
