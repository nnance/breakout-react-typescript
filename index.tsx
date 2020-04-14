import React from "react";
import ReactDOM from "react-dom";

type ColorCode = "R" | "O" | "G" | "Y";

enum Actions {
  paddleLeft,
  paddleRight,
  paddleStop,
  movePaddle,
}

type Brick = {
  x: number;
  y: number;
  color: string;
  width: number;
  height: number;
};

type Paddle = {
  x: number;
  y: number;
  width: number;
  height: number;
  dx: number;
};

type Ball = {
  x: number;
  y: number;
  width: number;
  height: number;

  // how fast the ball should go in either the x or y direction
  speed: number;

  // ball velocity
  dx: number;
  dy: number;
};

type Bricks = Brick[];

type GameState = {
  bricks: Bricks;
  paddle: Paddle;
  ball: Ball;
};

type GameReducer = (state: GameState, action: Actions) => GameState;
type GameDispatcher = (action: Actions) => GameState;

// use a 2px gap between each brick
const brickGap = 2;
const brickWidth = 25;
const brickHeight = 12;
const canvas = {
  width: 400,
  height: 500,
};

// the wall width takes up the remaining space of the canvas width. with 14 bricks
// and 13 2px gaps between them, thats: 400 - (14 * 25 + 2 * 13) = 24px. so each
// wall will be 12px
const wallSize = 12;

// each row is 14 bricks long. the level consists of 6 blank rows then 8 rows
// of 4 colors: red, orange, green, and yellow
const level1: ColorCode[][] = [
  [],
  [],
  [],
  [],
  [],
  [],
  ["R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R"],
  ["R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R"],
  ["O", "O", "O", "O", "O", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
  ["O", "O", "O", "O", "O", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
  ["G", "G", "G", "G", "G", "G", "G", "G", "G", "G", "G", "G", "G", "G"],
  ["G", "G", "G", "G", "G", "G", "G", "G", "G", "G", "G", "G", "G", "G"],
  ["Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y"],
  ["Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y"],
];

// create a mapping between color short code (R, O, G, Y) and color name
const colorMap = {
  R: "red",
  O: "orange",
  G: "green",
  Y: "yellow",
};

const getBricks = (): Bricks => {
  const bricks: Bricks = [];

  // create the level by looping over each row and column in the level1 array
  // and creating an object with the bricks position (x, y) and color
  for (let row = 0; row < level1.length; row++) {
    for (let col = 0; col < level1[row].length; col++) {
      const colorCode = level1[row][col];

      bricks.push({
        x: wallSize + (brickWidth + brickGap) * col,
        y: wallSize + (brickHeight + brickGap) * row,
        color: colorMap[colorCode],
        width: brickWidth,
        height: brickHeight,
      });
    }
  }
  return bricks;
};

const initialState: GameState = {
  bricks: getBricks(),
  paddle: {
    // place the paddle horizontally in the middle of the screen
    x: canvas.width / 2 - brickWidth / 2,
    y: 440,
    width: brickWidth,
    height: brickHeight,

    // paddle x velocity
    dx: 0,
  },
  ball: {
    x: 130,
    y: 260,
    width: 5,
    height: 5,

    // how fast the ball should go in either the x or y direction
    speed: 2,

    // ball velocity
    dx: 0,
    dy: 0,
  },
};

const drawBoard = (context: CanvasRenderingContext2D, state: GameState) => {
  const { bricks, paddle, ball } = state;
  context.clearRect(0, 0, canvas.width, canvas.height);

  // draw walls
  context.fillStyle = "lightgrey";
  context.fillRect(0, 0, canvas.width, wallSize);
  context.fillRect(0, 0, wallSize, canvas.height);
  context.fillRect(canvas.width - wallSize, 0, wallSize, canvas.height);

  // draw ball
  context.fillRect(ball.x, ball.y, ball.width, ball.height);

  // draw bricks
  bricks.forEach((brick) => {
    context.fillStyle = brick.color;
    context.fillRect(brick.x, brick.y, brick.width, brick.height);
  });

  // draw paddle
  context.fillStyle = "cyan";
  context.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
};

const paddleRight = (state: GameState): GameState => ({
  ...state,
  paddle: { ...state.paddle, dx: 3 },
});

const paddleLeft = (state: GameState): GameState => ({
  ...state,
  paddle: { ...state.paddle, dx: -3 },
});

const paddleStop = (state: GameState): GameState => ({
  ...state,
  paddle: { ...state.paddle, dx: 0 },
});

const movePaddle = (state: GameState): GameState => ({
  ...state,
  paddle: { ...state.paddle, x: state.paddle.x + state.paddle.dx },
});

const reducer: GameReducer = (state, action) => {
  return action === Actions.paddleLeft
    ? paddleLeft(state)
    : action === Actions.paddleRight
    ? paddleRight(state)
    : action === Actions.paddleStop
    ? paddleStop(state)
    : action === Actions.movePaddle
    ? movePaddle(state)
    : state;
};

const dispatcher = (reducer: GameReducer, init: GameState): GameDispatcher => {
  let state = init;
  return (action: Actions) => {
    state = reducer(state, action);
    return state;
  };
};

const startGame = (canvas: HTMLCanvasElement) => {
  const context = canvas.getContext("2d");
  const dispatch = dispatcher(reducer, initialState);

  const loop = () => {
    requestAnimationFrame(loop);
    const state = dispatch(Actions.movePaddle);
    if (context) drawBoard(context, state);
  };

  // listen to keyboard events to move the paddle
  document.addEventListener("keydown", (e) => {
    // left arrow key
    if (e.which === 37) dispatch(Actions.paddleLeft);
    // right arrow key
    else if (e.which === 39) dispatch(Actions.paddleRight);
  });

  // listen to keyboard events to stop the paddle if key is released
  document.addEventListener("keyup", (e) => {
    if (e.which === 37 || e.which === 39) dispatch(Actions.paddleStop);
  });

  requestAnimationFrame(loop);
};

export const App: React.FC = () => {
  const { width, height } = canvas;
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (canvasRef.current) startGame(canvasRef.current);
  }, [canvasRef]);

  return <canvas width={width} height={height} ref={canvasRef}></canvas>;
};

ReactDOM.render(<App />, document.querySelector("#root"));
