"use client";

import { useEffect, useState } from "react";
import { RotateCcw, X } from "lucide-react";

/**
 * Mini chess vs a small built-in AI — shown while the Verxa Code agent works,
 * so the user has something fun to do. Simplified rules: no castling, no
 * en passant, pawns promote to queens. Check/checkmate/stalemate are detected.
 */

type Board = string[][]; // [row][col], row 0 = rank 8. Uppercase = white (player).
type Pos = [number, number];
type Move = { from: Pos; to: Pos };

const GLYPH: Record<string, string> = {
  K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
  k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟",
};
const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function startBoard(): Board {
  return [
    ["r", "n", "b", "q", "k", "b", "n", "r"],
    ["p", "p", "p", "p", "p", "p", "p", "p"],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["P", "P", "P", "P", "P", "P", "P", "P"],
    ["R", "N", "B", "Q", "K", "B", "N", "R"],
  ];
}

const inBoard = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;
const isWhitePiece = (p: string) => p !== "" && p === p.toUpperCase();

function pseudoMoves(b: Board, r: number, c: number): Pos[] {
  const p = b[r][c];
  if (!p) return [];
  const white = isWhitePiece(p);
  const t = p.toLowerCase();
  const out: Pos[] = [];
  const tryAdd = (rr: number, cc: number): boolean => {
    if (!inBoard(rr, cc)) return false;
    const target = b[rr][cc];
    if (target === "") {
      out.push([rr, cc]);
      return true; // keep sliding
    }
    if (isWhitePiece(target) !== white) out.push([rr, cc]); // capture
    return false; // blocked
  };
  const slide = (dirs: Pos[]) => {
    for (const [dr, dc] of dirs) {
      let rr = r + dr;
      let cc = c + dc;
      while (tryAdd(rr, cc)) {
        rr += dr;
        cc += dc;
      }
    }
  };
  const step = (dirs: Pos[]) => {
    for (const [dr, dc] of dirs) tryAdd(r + dr, c + dc);
  };

  if (t === "p") {
    const dir = white ? -1 : 1;
    const startRow = white ? 6 : 1;
    if (inBoard(r + dir, c) && b[r + dir][c] === "") {
      out.push([r + dir, c]);
      if (r === startRow && b[r + 2 * dir][c] === "") out.push([r + 2 * dir, c]);
    }
    for (const dc of [-1, 1]) {
      const rr = r + dir;
      const cc = c + dc;
      if (inBoard(rr, cc) && b[rr][cc] !== "" && isWhitePiece(b[rr][cc]) !== white) out.push([rr, cc]);
    }
  } else if (t === "n") {
    step([[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]);
  } else if (t === "k") {
    step([[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]);
  } else {
    if (t === "r" || t === "q") slide([[-1, 0], [1, 0], [0, -1], [0, 1]]);
    if (t === "b" || t === "q") slide([[-1, -1], [-1, 1], [1, -1], [1, 1]]);
  }
  return out;
}

function applyMove(b: Board, m: Move): Board {
  const next = b.map((row) => [...row]);
  let piece = next[m.from[0]][m.from[1]];
  next[m.from[0]][m.from[1]] = "";
  if (piece.toLowerCase() === "p" && (m.to[0] === 0 || m.to[0] === 7)) {
    piece = isWhitePiece(piece) ? "Q" : "q"; // auto-promotion
  }
  next[m.to[0]][m.to[1]] = piece;
  return next;
}

function kingPos(b: Board, white: boolean): Pos {
  const k = white ? "K" : "k";
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (b[r][c] === k) return [r, c];
  return [-1, -1];
}

function isAttacked(b: Board, r: number, c: number, byWhite: boolean): boolean {
  for (let rr = 0; rr < 8; rr++) {
    for (let cc = 0; cc < 8; cc++) {
      const p = b[rr][cc];
      if (!p || isWhitePiece(p) !== byWhite) continue;
      if (pseudoMoves(b, rr, cc).some(([tr, tc]) => tr === r && tc === c)) return true;
    }
  }
  return false;
}

function legalMovesFrom(b: Board, r: number, c: number): Pos[] {
  const p = b[r][c];
  if (!p) return [];
  const white = isWhitePiece(p);
  return pseudoMoves(b, r, c).filter((to) => {
    const next = applyMove(b, { from: [r, c], to });
    const [kr, kc] = kingPos(next, white);
    return kr >= 0 && !isAttacked(next, kr, kc, !white);
  });
}

function allLegalMoves(b: Board, white: boolean): Move[] {
  const out: Move[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = b[r][c];
      if (!p || isWhitePiece(p) !== white) continue;
      for (const to of legalMovesFrom(b, r, c)) out.push({ from: [r, c], to });
    }
  }
  return out;
}
/** Greedy AI: biggest capture, then checks, then a bit of randomness. */
function pickAiMove(b: Board): Move | null {
  const moves = allLegalMoves(b, false);
  if (moves.length === 0) return null;
  let best: Move = moves[0];
  let bestScore = -Infinity;
  for (const m of moves) {
    const captured = b[m.to[0]][m.to[1]];
    const score = (captured ? VALUE[captured.toLowerCase()] * 10 : 0) + Math.random() * 2.5 + (givesCheck(b, m) ? 4 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}

function givesCheck(b: Board, m: Move): boolean {
  const next = applyMove(b, m);
  const [kr, kc] = kingPos(next, true);
  return kr >= 0 && isAttacked(next, kr, kc, false);
}

function playerInCheck(b: Board): boolean {
  const [kr, kc] = kingPos(b, true);
  return kr >= 0 && isAttacked(b, kr, kc, false);
}

export default function MiniChess({ onClose }: { onClose: () => void }) {
  const [board, setBoard] = useState<Board>(startBoard);
  const [selected, setSelected] = useState<Pos | null>(null);
  const [targets, setTargets] = useState<Pos[]>([]);
  const [turn, setTurn] = useState<"w" | "b">("w");
  const [note, setNote] = useState("Your move — you are white.");
  const [over, setOver] = useState(false);

  const reset = () => {
    setBoard(startBoard());
    setSelected(null);
    setTargets([]);
    setTurn("w");
    setOver(false);
    setNote("Your move — you are white.");
  };

  // AI (black) replies shortly after the player moves.
  useEffect(() => {
    if (turn !== "b" || over) return;
    const t = window.setTimeout(() => {
      setBoard((prev) => {
        const m = pickAiMove(prev);
        if (!m) {
          setNote(playerInCheck(prev) ? "Stalemate — draw." : "Checkmate — you win! 🎉");
          setOver(true);
          setTurn("w");
          return prev;
        }
        const next = applyMove(prev, m);
        const playerMoves = allLegalMoves(next, true);
        const inCheck = playerInCheck(next);
        if (playerMoves.length === 0) {
          setNote(inCheck ? "Checkmate — Verxa wins." : "Stalemate — draw.");
          setOver(true);
        } else {
          setNote(inCheck ? "Check! Your move." : "Your move.");
        }
        setTurn("w");
        return next;
      });
    }, 500);
    return () => window.clearTimeout(t);
  }, [turn, over]);

  const onSquare = (r: number, c: number) => {
    if (over || turn !== "w") return;
    const p = board[r][c];
    if (selected && targets.some(([tr, tc]) => tr === r && tc === c)) {
      const next = applyMove(board, { from: selected, to: [r, c] });
      setBoard(next);
      setSelected(null);
      setTargets([]);
      if (allLegalMoves(next, false).length === 0) {
        const [kr, kc] = kingPos(next, false);
        setNote(kr >= 0 && isAttacked(next, kr, kc, true) ? "Checkmate — you win! 🎉" : "Stalemate — draw.");
        setOver(true);
        return;
      }
      setNote("Verxa is thinking…");
      setTurn("b");
      return;
    }
    if (p && isWhitePiece(p)) {
      setSelected([r, c]);
      setTargets(legalMovesFrom(board, r, c));
    } else {
      setSelected(null);
      setTargets([]);
    }
  };

  return (
    <div className="w-[264px] overflow-hidden rounded-2xl border border-white/12 bg-[#101018] shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <span className="text-[13px]" aria-hidden>♞</span>
        <span className="text-[12.5px] font-medium text-white/85">Chess vs Verxa</span>
        <button type="button" onClick={reset} aria-label="Restart game" title="Restart" className="ml-auto rounded-md p-1 text-white/50 transition hover:bg-white/[0.08] hover:text-white">
          <RotateCcw size={13} />
        </button>
        <button type="button" onClick={onClose} aria-label="Close chess" title="Close" className="rounded-md p-1 text-white/50 transition hover:bg-white/[0.08] hover:text-white">
          <X size={13} />
        </button>
      </div>
      <div className="grid grid-cols-8 p-2" role="grid" aria-label="Chess board">
        {board.map((row, r) =>
          row.map((piece, c) => {
            const dark = (r + c) % 2 === 1;
            const isSel = selected?.[0] === r && selected?.[1] === c;
            const isTarget = targets.some(([tr, tc]) => tr === r && tc === c);
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                role="gridcell"
                aria-label={`square ${r}-${c}${piece ? ` ${piece}` : ""}`}
                onClick={() => onSquare(r, c)}
                className={`relative flex aspect-square items-center justify-center text-[22px] leading-none transition ${
                  isSel ? "bg-[#f6f669]" : dark ? "bg-[#769656]" : "bg-[#eeeed2]"
                } ${isTarget ? "after:absolute after:h-2.5 after:w-2.5 after:rounded-full after:bg-black/25" : ""}`}
              >
                {piece ? (
                  <span className={isWhitePiece(piece) ? "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]" : "text-black"}>
                    {GLYPH[piece]}
                  </span>
                ) : null}
              </button>
            );
          }),
        )}
      </div>
      <p className="border-t border-white/10 px-3 py-2 text-center text-[11.5px] text-white/55">{note}</p>
    </div>
  );
}

