import React from "react";
import ReactDOM from "react-dom";

type Board = {
  width: number;
  height: number;
  wallSize: number;
};

type GameState = {
  board: Board;
};

const initialState: GameState = {
  board: {
    width: 400,
    height: 500,
    wallSize: 12,
  },
};

const drawBoard = (context: CanvasRenderingContext2D, { board }: GameState) => {
  context.clearRect(0, 0, board.width, board.height);

  // draw walls
  context.fillStyle = "lightgrey";
  context.fillRect(0, 0, board.width, board.wallSize);
  context.fillRect(0, 0, board.wallSize, board.height);
  context.fillRect(
    board.width - board.wallSize,
    0,
    board.wallSize,
    board.height
  );
};

const startGame = (canvas: HTMLCanvasElement, state: GameState) => {
  const context = canvas.getContext("2d");

  if (context) {
    drawBoard(context, state);
  }
};

export const App: React.FC = () => {
  const { width, height } = initialState.board;
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (canvasRef.current) startGame(canvasRef.current, initialState);
  }, [canvasRef]);

  return <canvas width={width} height={height} ref={canvasRef}></canvas>;
};

ReactDOM.render(<App />, document.querySelector("#root"));
