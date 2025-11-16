# Zombie Rail Shooter

A zombie rail shooter game built with Three.js and Vite.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

The game will open in your browser at `http://localhost:3000`.

## Features

- Modern ES6+ JavaScript with Vite bundling
- Three.js 3D scene with moody fog
- Eye-level camera (y=1.6) for first-person perspective
- Ground plane with shadows
- Ambient and directional lighting
- Responsive window handling
- Smooth render loop

## Project Structure

```
.
├── src/
│   └── main.js          # Main game entry point
├── index.html           # HTML entry point
├── package.json         # Dependencies
├── vite.config.js       # Vite configuration
└── README.md           # This file
```

## Building for Production

```bash
npm run build
```

The compiled files will be in the `dist/` directory.

