import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addRandomTile,
  createInitialBoard,
  hasAvailableMove,
  moveBoard,
  type Board,
  type Direction,
} from './game';

const BEST_SCORE_KEY = 'merge2048-best-score';
const SWIPE_THRESHOLD = 35;

interface GameState {
  board: Board;
  score: number;
  bestScore: number;
  gameOver: boolean;
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

function tileClass(value: number): string {
  if (value === 0) {
    return 'tile tile-empty';
  }

  return `tile tile-${Math.min(value, 8192)}`;
}

function App() {
  const [game, setGame] = useState<GameState>(() => ({
    board: createInitialBoard(),
    score: 0,
    bestScore: readBestScore(),
    gameOver: false,
  }));

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
            <h1>Merge</h1>
            <p className="subtitle">Fusionne les nombres jusqu’à 2048.</p>
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
          <p>Glisse dans une direction pour déplacer les cases.</p>
          <button type="button" onClick={startNewGame}>
            Nouvelle partie
          </button>
        </div>

        <div
          className="board-wrapper"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          aria-label="Plateau de jeu 2048"
        >
          <div className="board">
            {game.board.flatMap((row, rowIndex) =>
              row.map((value, columnIndex) => (
                <div
                  className={tileClass(value)}
                  key={`${rowIndex}-${columnIndex}-${value}`}
                  aria-label={value === 0 ? 'Case vide' : `Case ${value}`}
                >
                  {value !== 0 && value}
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

        <div className="mobile-controls" aria-label="Contrôles tactiles">
          <button onClick={() => performMove('up')} aria-label="Haut">↑</button>
          <div>
            <button onClick={() => performMove('left')} aria-label="Gauche">←</button>
            <button onClick={() => performMove('down')} aria-label="Bas">↓</button>
            <button onClick={() => performMove('right')} aria-label="Droite">→</button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
