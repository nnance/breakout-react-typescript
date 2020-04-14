import React from "react";
import ReactDOM from "react-dom";

type ColorCode = "R" | "O" | "G" | "Y";

enum Actions {
  paddleLeft,
  paddleRight,
  paddleStop,
  movePaddle,
  moveBall,
  startBall,
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
type GameDispatcher = (action: Actions | Actions[]) => GameState;

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

// check for collision between two objects using axis-aligned bounding box (AABB)
// @see https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection
function collides(obj1: Ball | Brick | Paddle, obj2: Ball | Brick | Paddle) {
  return (
    obj1.x < obj2.x + obj2.width &&
    obj1.x + obj1.width > obj2.x &&
    obj1.y < obj2.y + obj2.height &&
    obj1.y + obj1.height > obj2.y
  );
}

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

const movePaddle = (state: GameState): GameState => {
  const { paddle } = state;
  // move paddle by it's velocity
  const x = paddle.x + paddle.dx;

  // prevent paddle from going through walls
  return x < wallSize
    ? {
        ...state,
        paddle: { ...paddle, x: wallSize },
      }
    : x + brickWidth > canvas.width - wallSize
    ? {
        ...state,
        paddle: { ...paddle, x: canvas.width - wallSize - brickWidth },
      }
    : {
        ...state,
        paddle: { ...state.paddle, x },
      };
};

const startBall = (state: GameState): GameState => {
  const { ball } = state;
  return ball.dx === 0 && ball.dy === 0
    ? {
        ...state,
        ball: {
          ...ball,
          dx: ball.speed,
          dy: ball.speed,
        },
      }
    : state;
};

const moveBall = (state: GameState): GameState => {
  const { paddle, bricks } = state;

  // move ball by it's velocity
  const ball: Ball = {
    ...state.ball,
    x: state.ball.x + state.ball.dx,
    y: state.ball.y + state.ball.dy,
  };

  // prevent ball from going through walls by changing its velocity
  // left & right walls
  if (ball.x < wallSize) {
    ball.x = wallSize;
    ball.dx *= -1;
  } else if (ball.x + ball.width > canvas.width - wallSize) {
    ball.x = canvas.width - wallSize - ball.width;
    ball.dx *= -1;
  }
  // top wall
  if (ball.y < wallSize) {
    ball.y = wallSize;
    ball.dy *= -1;
  }

  // reset ball if it goes below the screen
  if (ball.y > canvas.height) {
    ball.x = 130;
    ball.y = 260;
    ball.dx = 0;
    ball.dy = 0;
  }

  // check to see if ball collides with paddle. if they do change y velocity
  if (collides(ball, paddle)) {
    ball.dy *= -1;

    // move ball above the paddle otherwise the collision will happen again
    // in the next frame
    ball.y = paddle.y - ball.height;
  }

  // check to see if ball collides with a brick. if it does, remove the brick
  // and change the ball velocity based on the side the brick was hit on
  for (let i = 0; i < bricks.length; i++) {
    const brick = bricks[i];

    if (collides(ball, brick)) {
      // remove brick from the bricks array
      bricks.splice(i, 1);

      // ball is above or below the brick, change y velocity
      // account for the balls speed since it will be inside the brick when it
      // collides
      if (
        ball.y + ball.height - ball.speed <= brick.y ||
        ball.y >= brick.y + brick.height - ball.speed
      ) {
        ball.dy *= -1;
      }
      // ball is on either side of the brick, change x velocity
      else {
        ball.dx *= -1;
      }

      break;
    }
  }

  return {
    ...state,
    ball: { ...ball },
  };
};

const reducer: GameReducer = (state, action) => {
  return action === Actions.paddleLeft
    ? paddleLeft(state)
    : action === Actions.paddleRight
    ? paddleRight(state)
    : action === Actions.paddleStop
    ? paddleStop(state)
    : action === Actions.movePaddle
    ? movePaddle(state)
    : action === Actions.startBall
    ? startBall(state)
    : action === Actions.moveBall
    ? moveBall(state)
    : state;
};

const dispatcher = (reducer: GameReducer, init: GameState): GameDispatcher => {
  let state = init;
  return (action) => {
    state = Array.isArray(action)
      ? action.reduce((prev, cur) => reducer(prev, cur), state)
      : reducer(state, action);
    return state;
  };
};

const startGame = (canvas: HTMLCanvasElement) => {
  const context = canvas.getContext("2d");
  const dispatch = dispatcher(reducer, initialState);

  const loop = () => {
    requestAnimationFrame(loop);
    const state = dispatch([Actions.movePaddle, Actions.moveBall]);
    if (context) drawBoard(context, state);
  };

  // listen to keyboard events to move the paddle
  document.addEventListener("keydown", (e) => {
    // left arrow key
    if (e.which === 37) dispatch(Actions.paddleLeft);
    // right arrow key
    else if (e.which === 39) dispatch(Actions.paddleRight);
    // space key
    // if they ball is not moving, we can launch the ball using the space key. ball
    // will move towards the bottom right to start
    else if (e.which === 32) dispatch(Actions.startBall);
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
