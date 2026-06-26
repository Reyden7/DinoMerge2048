import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addRandomTile,
  createInitialBoard,
  hasAvailableMove,
  moveBoard,
  type Board,
  type Direction,
} from './game';

import eggImg from './assets/dino/oeuf.png';
import dodoImg from './assets/dino/dodo.png';
import compsoImg from './assets/dino/compso.png';
import raptorImg from './assets/dino/raptor.png';
import pachyImg from './assets/dino/pachy.png';
import ankyImg from './assets/dino/anky.png';
import paraImg from './assets/dino/para.png';
import triceImg from './assets/dino/trice.png';
import stegoImg from './assets/dino/stego.png';
import diploImg from './assets/dino/diplo.png';
import trexImg from './assets/dino/trex.png';

const BEST_SCORE_KEY = 'merge2048-best-score';
const SWIPE_THRESHOLD = 35;
const CURRENT_GAME_KEY = 'dinomerge-current-game';

interface GameState {
  board: Board;
  score: number;
  bestScore: number;
  gameOver: boolean;
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
      parsed.board.every(
        (row) => Array.isArray(row) && row.length === 4,
      );

    if (!validBoard) {
      return null;
    }

    return {
      board: parsed.board,
      score: Number(parsed.score) || 0,
      bestScore: Math.max(
        Number(parsed.bestScore) || 0,
        readBestScore(),
      ),
      gameOver: Boolean(parsed.gameOver),
    };
  } catch {
    return null;
  }
}

function saveCurrentGame(game: GameState): void {
  try {
    localStorage.setItem(CURRENT_GAME_KEY, JSON.stringify(game));
  } catch {
    // Le jeu continue même si la sauvegarde est indisponible.
  }
}

const TILE_DATA: Record<number, { name: string; image: string }> = {
  2: { name: 'Œuf', image: eggImg },
  4: { name: 'Dodo', image: dodoImg },
  8: { name: 'Compsognatus', image: compsoImg },
  16: { name: 'Raptor', image: raptorImg },
  32: { name: 'Pachysaurus', image: pachyImg },
  64: { name: 'Ankylosaure', image: ankyImg },
  128: { name: 'Parasaurolophus', image: paraImg },
  256: { name: 'Tricératops', image: triceImg },
  512: { name: 'Stégosaures', image: stegoImg },
  1024: { name: 'Diplodocus', image: diploImg },
  2048: { name: 'Trex', image: trexImg },
};

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
    // ignore
  }
}

function tileClass(value: number): string {
  if (value === 0) {
    return 'tile tile-empty';
  }

  return 'tile tile-dino';
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
  };
});

  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const performMove = useCallback((direction: Direction) => {
    setGame((currentGame) => {
      if (currentGame.gameOver) {
        return currentGame;
      }

      const move = moveBoard(currentGame.board, direction);

      if (!move.changed) {
        return currentGame;
      }

      const nextBoard = addRandomTile(move.board);
      const nextScore = currentGame.score + move.gained;
      const nextBestScore = Math.max(currentGame.bestScore, nextScore);
      const gameOver = !hasAvailableMove(nextBoard);

      if (nextBestScore !== currentGame.bestScore) {
        saveBestScore(nextBestScore);
      }

      return {
        board: nextBoard,
        score: nextScore,
        bestScore: nextBestScore,
        gameOver,
      };
    });
  }, []);

  const startNewGame = useCallback(() => {
    setGame((currentGame) => ({
      board: createInitialBoard(),
      score: 0,
      bestScore: currentGame.bestScore,
      gameOver: false,
    }));
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const directions: Record<string, Direction | undefined> = {
        ArrowLeft: 'left',
        ArrowRight: 'right',
        ArrowUp: 'up',
        ArrowDown: 'down',
        a: 'left',
        d: 'right',
        w: 'up',
        s: 'down',
      };

      const direction = directions[event.key];

      if (direction) {
        event.preventDefault();
        performMove(direction);
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [performMove]);

  useEffect(() => {
  saveCurrentGame(game);
  }, [game]);
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
      performMove(deltaX > 0 ? 'right' : 'left');
    } else {
      performMove(deltaY > 0 ? 'down' : 'up');
    }
  };

  return (
    <main className="app-shell">
      <section className="game">
        <header className="top-bar">
          <div>
            <h1>Dino Merge</h1>
            <p className="subtitle">Fusionne les dinosaures jusqu’au Trex.</p>
          </div>

          <div className="score-group" aria-label="Scores">
            <div className="score-card">
              <span>Score</span>
              <strong>{game.score}</strong>
            </div>
            <div className="score-card">
              <span>Record</span>
              <strong>{game.bestScore}</strong>
            </div>
          </div>
        </header>

        <div className="actions">
          <p>Glisse dans une direction pour fusionner les dinos.</p>
          <button type="button" onClick={startNewGame}>
            Nouvelle partie
          </button>
        </div>

        <div
          className="board-wrapper"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          aria-label="Plateau de jeu Dino Merge"
        >
          <div className="board">
            {game.board.flatMap((row, rowIndex) =>
              row.map((value, columnIndex) => (
                <div
                  className={tileClass(value)}
                  key={`${rowIndex}-${columnIndex}-${value}`}
                  aria-label={value === 0 ? 'Case vide' : `Case ${value}`}
                >
                  {renderTileContent(value)}
                </div>
              )),
            )}
          </div>

          {game.gameOver && (
            <div className="game-over" role="dialog" aria-modal="true">
              <div>
                <h2>Partie terminée</h2>
                <p>Score final : {game.score}</p>
                <button type="button" onClick={startNewGame}>
                  Rejouer
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;