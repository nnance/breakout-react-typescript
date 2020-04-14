import React from "react";
import ReactDOM from "react-dom";

const startGame = (canvas: HTMLCanvasElement) => {
  const wallSize = 12;
  const context = canvas.getContext("2d");

  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);

    // draw walls
    context.fillStyle = "lightgrey";
    context.fillRect(0, 0, canvas.width, wallSize);
    context.fillRect(0, 0, wallSize, canvas.height);
    context.fillRect(canvas.width - wallSize, 0, wallSize, canvas.height);
  }
};

export const App: React.FC = () => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (canvasRef.current) startGame(canvasRef.current)
  }, [canvasRef]);

  return <canvas width="400" height="500" ref={canvasRef}></canvas>;
};

ReactDOM.render(<App />, document.querySelector("#root"));
