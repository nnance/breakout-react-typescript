# breakout-react-typescript

Simple Atari Breakout implemented in React and TypeScript.

## Getting Started

The following steps are how to build and run the development server.

### Building the repo

```
npm run build
```

### Running the development server
To run the development mode in live reload.
```
npm run start
```

## Project Setup
Below are instructions on how to setup a similar project.

### Initialize the project
```
mkdir my-react-app && cd my-react-app
git init && npm init -y
```
### Install dev dependencies
This project only uses npm for development dependencies
```
npm i -D  @types/react @types/react-dom react react-dom typescript parcel-bundler 
```
### Initialize TypeScript
```
tsc --init --jsx react --sourceMap --esModuleInterop --lib es6,dom
```
### Add the following commands to package.json
```json
"start": "parcel index.html",
"build": "parcel build index.html"
```
### Happy coding
See the Getting Started section to start the project in development mode.