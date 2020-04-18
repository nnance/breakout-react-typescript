import React from "react";
import ReactDOM from "react-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

type ColorCode = "R" | "O" | "G" | "Y";

enum Actions {
  paddleLeft,
  paddleRight,
  paddleStop,
  togglePause,
  gameLoop,
  resetGame,
}

enum GameStatus {
  initialized,
  running,
  paused,
  ended,
}

type Brick = {
  x: number;
  y: number;
  color: ColorCode;
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

  collision: {
    count: number;
    orangeRow: boolean;
    redRow: boolean;
  };
};

type Bricks = Brick[];

type Score = {
  value: number;
  level: number;
  ballCount: number;
};

type GameState = {
  status: GameStatus;
  bricks: Bricks;
  paddle: Paddle;
  ball: Ball;
  score: Score;
};

type GameTransducer = (state: Readonly<GameState>) => GameState;
type GameReducer = (state: Readonly<GameState>, action: Actions) => GameState;

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

/**
 *
 * HELPERS
 *
 * Utility and helper functions
 *
 */

const transform = (state: GameState, transducer: GameTransducer) =>
  transducer(state);

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
        color: colorCode,
        width: brickWidth,
        height: brickHeight,
      });
    }
  }
  return bricks;
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

const getBrickValue = (brick: Brick): number => {
  return brick.color === "Y"
    ? 1
    : brick.color === "G"
    ? 3
    : brick.color === "O"
    ? 5
    : 7;
};

const newBall = (): Ball => ({
  x: 130,
  y: 260,
  width: 5,
  height: 5,

  // how fast the ball should go in either the x or y direction
  speed: 2,

  // ball velocity
  dx: 0,
  dy: 0,

  // collision state
  collision: {
    count: 0,
    redRow: false,
    orangeRow: false,
  },
});

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
  ball: newBall(),
  score: {
    value: 0,
    level: 1,
    ballCount: 3,
  },
  status: GameStatus.initialized,
};

/**
 *
 * DRAWING
 * Functions for drawing the game board and pieces
 *
 */

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
    context.fillStyle = colorMap[brick.color];
    context.fillRect(brick.x, brick.y, brick.width, brick.height);
  });

  // draw paddle
  context.fillStyle = "cyan";
  context.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
};

const showGameOver = (context: CanvasRenderingContext2D) => {
  context.fillStyle = "black";
  context.globalAlpha = 0.75;
  context.fillRect(0, canvas.height / 2 - 30, canvas.width, 60);

  context.globalAlpha = 1;
  context.fillStyle = "white";
  context.font = "36px monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("GAME OVER!", canvas.width / 2, canvas.height / 2);
};

const updateGame = (context: CanvasRenderingContext2D, state: GameState) => {
  if (state.status == GameStatus.ended) showGameOver(context);
  else drawBoard(context, state);
};

/**
 *
 * TRANSDUCERS
 *
 *
 */

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
  const { ball, score } = state;
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
        score: {
          ...score,
          ballCount: score.ballCount - 1,
        },
      }
    : state;
};

const startRunning: GameTransducer = (state) => ({
  ...state,
  status: GameStatus.running,
});

const flipPause: GameTransducer = (state) => ({
  ...state,
  status:
    state.status === GameStatus.paused ? GameStatus.running : GameStatus.paused,
});

const togglePause: GameTransducer = (state) => {
  const actions =
    state.status === GameStatus.initialized
      ? [startRunning, startBall]
      : [flipPause, startBall];

  return actions.reduce(transform, state);
};

const checkBricks: GameTransducer = (state) => {
  // check to see if ball collides with a brick. if it does, remove the brick
  // and change the ball velocity based on the side the brick was hit on

  const didCollide = (state: GameState, brick: Brick, i: number): GameState => {
    const { ball, bricks, score } = state;

    const speedModifier = (ball: Ball): Ball => {
      const collision =
        brick.color === colorMap.O
          ? { ...ball.collision, orangeRow: true }
          : brick.color === colorMap.R
          ? { ...ball.collision, redRow: true }
          : { ...ball.collision, count: ++ball.collision.count };

      const redModifier = collision.redRow ? 0.25 : 0;
      const orangeModifier = collision.orangeRow ? 0.25 : 0;
      const hitModifier =
        collision.count < 6 ? 0 : collision.count < 14 ? 0.25 : 0.5;

      const speed = 2 + redModifier + orangeModifier + hitModifier;

      return {
        ...ball,
        collision,
        speed,
        dx: ball.dx < 0 ? speed * -1 : speed,
        dy: ball.dy < 0 ? speed * -1 : speed,
      };
    };

    return !collides(ball, brick)
      ? state
      : ball.y + ball.height - ball.speed <= brick.y ||
        ball.y >= brick.y + brick.height - ball.speed
      ? {
          ...state,
          ball: speedModifier({ ...ball, dy: ball.dy * -1 }),
          bricks: [...bricks.slice(0, i), ...bricks.slice(i + 1)],
          score: { ...score, value: score.value + getBrickValue(brick) },
        }
      : {
          ...state,
          ball: speedModifier({ ...ball, dx: ball.dx * -1 }),
          bricks: [...bricks.slice(0, i), ...bricks.slice(i + 1)],
          score: { ...score, value: score.value + getBrickValue(brick) },
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
  return ball.y > canvas.height && state.score.ballCount > 0
    ? {
        ...state,
        ball: newBall(),
        status: GameStatus.paused,
      }
    : ball.y > canvas.height
    ? { ...state, status: GameStatus.ended }
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

const resetGame: GameTransducer = () => initialState;

const gameLoop: GameTransducer = (state) => {
  // execute the following transducers in the order of the array.
  // order matters here as we need to first move the pieces and process checks
  return state.status === GameStatus.paused
    ? state
    : [
        movePaddle,
        moveBall,
        checkWall,
        checkTopWall,
        checkOffScreen,
        checkPaddle,
        checkBricks,
      ].reduce(transform, state);
};

const reducer: GameReducer = (state, action) => {
  return action === Actions.paddleLeft
    ? paddleLeft(state)
    : action === Actions.paddleRight
    ? paddleRight(state)
    : action === Actions.paddleStop
    ? paddleStop(state)
    : action === Actions.togglePause
    ? togglePause(state)
    : action === Actions.gameLoop
    ? gameLoop(state)
    : action === Actions.resetGame
    ? resetGame(state)
    : state;
};

/**
 *
 * REACT
 * ReactJS components for the game
 *
 */

type GameStore = [GameState, React.Dispatch<Actions>];
const GameContext = React.createContext<GameStore>([initialState, () => null]);

const GameProvider: React.FC = ({ children }) => {
  const store = React.useReducer(reducer, initialState);

  return <GameContext.Provider value={store}>{children}</GameContext.Provider>;
};

export const ScoreBoard = () => {
  const [state] = React.useContext(GameContext);
  return (
    <div style={{ float: "right" }}>
      <table>
        <tbody>
          <tr>
            <td>
              <b>Score:</b>
            </td>
            <td>{state.score.value}</td>
          </tr>
          <tr>
            <td>
              <b>Level:</b>
            </td>
            <td>{state.score.level}</td>
          </tr>
          <tr>
            <td>
              <b>Balls:</b>
            </td>
            <td>{state.score.ballCount}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export const Controls = () => {
  const [state] = React.useContext(GameContext);
  return (
    <div>
      <table>
        <tbody>
          <tr>
            <td>
              <b>Space bar</b>
            </td>
          </tr>
          <tr>
            <td>start / pause</td>
          </tr>
          <tr>
            <td>
              <b>R</b>
            </td>
          </tr>
          <tr>
            <td>reset</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export const GameBoard = () => {
  const { width, height } = canvas;
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const frameRef = React.useRef<number>(0);
  const [state, dispatch] = React.useContext(GameContext);

  const loop = () => {
    if (state.status === GameStatus.ended) {
      cancelAnimationFrame(frameRef.current);
    } else {
      frameRef.current = requestAnimationFrame(loop);
      dispatch(Actions.gameLoop);
    }
  };

  const keydownHandler = (e: KeyboardEvent) => {
    // left arrow key
    if (e.key === "ArrowLeft") dispatch(Actions.paddleLeft);
    // right arrow key
    else if (e.key === "ArrowRight") dispatch(Actions.paddleRight);
    // R key
    else if (e.key === "r") dispatch(Actions.resetGame);
    // space key
    else if (e.key === " ") dispatch(Actions.togglePause);
  };

  const keyupHandler = (e: KeyboardEvent) => {
    if (e.which === 37 || e.which === 39) dispatch(Actions.paddleStop);
  };

  React.useEffect(() => {
    // listen to keyboard events to move the paddle
    document.addEventListener("keydown", keydownHandler);
    // listen to keyboard events to stop the paddle if key is released
    document.addEventListener("keyup", keyupHandler);

    frameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameRef.current);
      document.removeEventListener("keydown", keydownHandler);
      document.removeEventListener("keyup", keyupHandler);
    };
  }, [canvasRef]);

  React.useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (context) updateGame(context, state);
  }, [canvasRef, state]);

  return <canvas width={width} height={height} ref={canvasRef}></canvas>;
};

export const App = () => {
  React.useEffect(() => {
    const { style } = document.body;
    style.backgroundColor = "#282c34";
    style.color = "white";
  });

  return (
    <GameProvider>
      <Container style={{ textAlign: "center" }} fluid>
        <h3 className="m-3">Breakout</h3>
        <Row>
          <Col md={4}>
            <Row>
              <Col style={{ marginBottom: "20px" }}>
                <ScoreBoard />
              </Col>
            </Row>
          </Col>
          <Col md={4}>
            <GameBoard />
          </Col>
          <Col md={4}>
            <Row>
              <Col>
                <Controls />
              </Col>
            </Row>
          </Col>
        </Row>
      </Container>
    </GameProvider>
  );
};

ReactDOM.render(<App />, document.querySelector("#root"));
