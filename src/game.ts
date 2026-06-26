export type Board = number[][];
export type Direction = 'left' | 'right' | 'up' | 'down';

export interface MoveResult {
  board: Board;
  gained: number;
  changed: boolean;
}

const SIZE = 4;

export function createInitialBoard(): Board {
  let board = createEmptyBoard();
  board = addRandomTile(board);
  board = addRandomTile(board);
  return board;
}

export function addRandomTile(board: Board): Board {
  const emptyCells: Array<[number, number]> = [];

  for (let row = 0; row < SIZE; row += 1) {
    for (let column = 0; column < SIZE; column += 1) {
      if (board[row][column] === 0) {
        emptyCells.push([row, column]);
      }
    }
  }

  if (emptyCells.length === 0) {
    return board.map((row) => [...row]);
  }

  const [row, column] =
    emptyCells[Math.floor(Math.random() * emptyCells.length)];

  const nextBoard = board.map((currentRow) => [...currentRow]);
  nextBoard[row][column] = Math.random() < 0.9 ? 2 : 4;

  return nextBoard;
}

export function moveBoard(board: Board, direction: Direction): MoveResult {
  let workingBoard = board.map((row) => [...row]);

  if (direction === 'right') {
    workingBoard = reverseRows(workingBoard);
  }

  if (direction === 'up') {
    workingBoard = transpose(workingBoard);
  }

  if (direction === 'down') {
    workingBoard = reverseRows(transpose(workingBoard));
  }

  let gained = 0;
  const movedBoard = workingBoard.map((row) => {
    const result = mergeRowLeft(row);
    gained += result.gained;
    return result.row;
  });

  let finalBoard = movedBoard;

  if (direction === 'right') {
    finalBoard = reverseRows(finalBoard);
  }

  if (direction === 'up') {
    finalBoard = transpose(finalBoard);
  }

  if (direction === 'down') {
    finalBoard = transpose(reverseRows(finalBoard));
  }

  return {
    board: finalBoard,
    gained,
    changed: !boardsAreEqual(board, finalBoard),
  };
}

export function hasAvailableMove(board: Board): boolean {
  for (let row = 0; row < SIZE; row += 1) {
    for (let column = 0; column < SIZE; column += 1) {
      if (board[row][column] === 0) {
        return true;
      }

      if (
        column < SIZE - 1 &&
        board[row][column] === board[row][column + 1]
      ) {
        return true;
      }

      if (
        row < SIZE - 1 &&
        board[row][column] === board[row + 1][column]
      ) {
        return true;
      }
    }
  }

  return false;
}

function createEmptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function mergeRowLeft(row: number[]): { row: number[]; gained: number } {
  const compacted = row.filter((value) => value !== 0);
  const merged: number[] = [];
  let gained = 0;

  for (let index = 0; index < compacted.length; index += 1) {
    const current = compacted[index];
    const next = compacted[index + 1];

    if (current === next) {
      const mergedValue = current * 2;
      merged.push(mergedValue);
      gained += mergedValue;
      index += 1;
    } else {
      merged.push(current);
    }
  }

  while (merged.length < SIZE) {
    merged.push(0);
  }

  return { row: merged, gained };
}

function transpose(board: Board): Board {
  return board[0].map((_, column) =>
    board.map((row) => row[column]),
  );
}

function reverseRows(board: Board): Board {
  return board.map((row) => [...row].reverse());
}

function boardsAreEqual(first: Board, second: Board): boolean {
  return first.every((row, rowIndex) =>
    row.every((value, columnIndex) => value === second[rowIndex][columnIndex]),
  );
}
