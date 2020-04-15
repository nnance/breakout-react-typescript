import React from "react";
import ReactDOM from "react-dom";

type ColorCode = "R" | "O" | "G" | "Y";

enum Actions {
  paddleLeft,
  paddleRight,
  paddleStop,
  startBall,
  gameLoop,
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

type GameTransducer = (state: Readonly<GameState>) => GameState;
type GameReducer = (state: Readonly<GameState>, action: Actions) => GameState;
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

const paddleRight: GameTransducer = (state) => ({
  ...state,
  paddle: { ...state.paddle, dx: 3 },
});

const paddleLeft: GameTransducer = (state) => ({
  ...state,
  paddle: { ...state.paddle, dx: -3 },
});

const paddleStop: GameTransducer = (state) => ({
  ...state,
  paddle: { ...state.paddle, dx: 0 },
});

const movePaddle: GameTransducer = (state) => {
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

const startBall: GameTransducer = (state) => {
  const { ball } = state;
  // if they ball is not moving, we can launch the ball. ball
  // will move towards the bottom right to start
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

const checkBricks: GameTransducer = (state) => {
  // check to see if ball collides with a brick. if it does, remove the brick
  // and change the ball velocity based on the side the brick was hit on

  const didCollide = (state: GameState, brick: Brick, i: number): GameState => {
    const { ball, bricks } = state;
    return !collides(ball, brick)
      ? state
      : ball.y + ball.height - ball.speed <= brick.y ||
        ball.y >= brick.y + brick.height - ball.speed
      ? {
          ...state,
          ball: { ...ball, dy: ball.dy * -1 },
          bricks: [...bricks.slice(0, i), ...bricks.slice(i + 1)],
        }
      : {
          ...state,
          ball: { ...ball, dx: ball.dx * -1 },
          bricks: [...bricks.slice(0, i), ...bricks.slice(i + 1)],
        };
  };

  return state.bricks.reduce(
    (prev, brick, i) => didCollide(prev, brick, i),
    state
  );
};

const moveBall: GameTransducer = (state) => {
  const { ball } = state;
  // move ball by it's velocity
  return {
    ...state,
    ball: {
      ...ball,
      x: ball.x + ball.dx,
      y: ball.y + ball.dy,
    },
  };
};

// prevent ball from going through walls by changing its velocity
// left & right walls
const checkWall: GameTransducer = (state) => {
  const { ball } = state;
  return ball.x < wallSize
    ? {
        ...state,
        ball: { ...ball, x: wallSize, dx: ball.dx * -1 },
      }
    : ball.x + ball.width > canvas.width - wallSize
    ? {
        ...state,
        ball: {
          ...ball,
          x: canvas.width - wallSize - ball.width,
          dx: ball.dx * -1,
        },
      }
    : state;
};

// top wall
const checkTopWall: GameTransducer = (state) => {
  const { ball } = state;
  return ball.y < wallSize
    ? {
        ...state,
        ball: { ...ball, y: wallSize, dy: ball.dy * -1 },
      }
    : state;
};

// reset ball if it goes below the screen
const checkOffScreen: GameTransducer = (state) => {
  const { ball } = state;
  return ball.y > canvas.height
    ? {
        ...state,
        ball: { ...ball, x: 130, y: 260, dx: 0, dy: 0 },
      }
    : state;
};

// check to see if ball collides with paddle. if they do change y velocity
const checkPaddle: GameTransducer = (state) => {
  const { ball, paddle } = state;
  // move ball above the paddle otherwise the collision will happen again
  // in the next frame
  return collides(ball, paddle)
    ? {
        ...state,
        ball: { ...ball, dy: ball.dy * -1, y: paddle.y - ball.height },
      }
    : state;
};

const gameLoop: GameTransducer = (state) => {
  // execute the following transducers in the order of the array.
  // order matters here as we need to first move the pieces and process checks
  return [
    movePaddle,
    moveBall,
    checkWall,
    checkTopWall,
    checkOffScreen,
    checkPaddle,
    checkBricks,
  ].reduce((prev, cur) => cur(prev), state);
};

const reducer: GameReducer = (state, action) => {
  return action === Actions.paddleLeft
    ? paddleLeft(state)
    : action === Actions.paddleRight
    ? paddleRight(state)
    : action === Actions.paddleStop
    ? paddleStop(state)
    : action === Actions.startBall
    ? startBall(state)
    : action === Actions.gameLoop
    ? gameLoop(state)
    : state;
};

const startGame = (dispatch: React.Dispatch<Actions>) => {
  const loop = () => {
    requestAnimationFrame(loop);
    dispatch(Actions.gameLoop);
  };

  // listen to keyboard events to move the paddle
  document.addEventListener("keydown", (e) => {
    // left arrow key
    if (e.which === 37) dispatch(Actions.paddleLeft);
    // right arrow key
    else if (e.which === 39) dispatch(Actions.paddleRight);
    // space key
    else if (e.which === 32) dispatch(Actions.startBall);
  });

  // listen to keyboard events to stop the paddle if key is released
  document.addEventListener("keyup", (e) => {
    if (e.which === 37 || e.which === 39) dispatch(Actions.paddleStop);
  });

  requestAnimationFrame(loop);
};

type GameStore = [GameState, React.Dispatch<Actions>];
const GameContext = React.createContext<GameStore>([initialState, () => null]);

const GameProvider: React.FC = ({ children }) => {
  const store = React.useReducer(reducer, initialState);

  return <GameContext.Provider value={store}>{children}</GameContext.Provider>;
};

const useGameContext = (): GameStore => React.useContext(GameContext);

export const GameBoard = () => {
  const { width, height } = canvas;
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [state, dispatch] = useGameContext();

  React.useEffect(() => startGame(dispatch), [canvasRef]);

  React.useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (context) drawBoard(context, state);
  }, [canvasRef, state]);

  return <canvas width={width} height={height} ref={canvasRef}></canvas>;
};

export const App = () => {
  return (
    <GameProvider>
      <GameBoard />
    </GameProvider>
  );
};

ReactDOM.render(<App />, document.querySelector("#root"));
