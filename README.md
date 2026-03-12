# 3D Sales Dashboard

A single-page data visualization widget that renders monthly sales as a 3D bar chart.

## Tech Stack

| Tool | Role |
|---|---|
| React 19 + TypeScript | UI framework |
| Three.js | 3D rendering and scene management |
| Tailwind CSS v4 | Utility styling |
| Vite | Build tool and dev server |
| clsx + tailwind-merge | Class name utilities |

## Features

- **3D bar chart** — 12 monthly bars rendered with Three.js, pivoted at the base
- **Load animation** — bars rise upward with a staggered `easeOutCubic` effect
- **Auto-rotate** — scene rotates slowly on idle; pauses on interaction, resumes after 3s
- **Orbit controls** — drag to rotate, scroll to zoom, with angle/distance limits
- **Hover highlight** — hovered bar darkens and smoothly swells on XZ via `lerp`
- **Tooltip** — shows month name and exact value on hover
- **Stat cards** — total revenue, monthly average, and peak month derived from the dataset
- **Responsive** — canvas resizes via `ResizeObserver`; mobile-friendly layout

## Structure

```
src/
├── components/
│   └── BarChart3D.tsx   # Three.js scene, controls, animation, raycaster
├── lib/
│   └── utils.ts         # cn() helper
├── App.tsx              # Layout, stat cards, widget shell
├── index.css            # Tailwind import + CSS variables (B&W matte theme)
└── main.tsx             # Entry point
```

## Running

```bash
npm install
npm run dev
```
