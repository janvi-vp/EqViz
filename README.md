
# EqViz

>A Next.js app for visualizing mathematical equations interactively.

🌐 **Live Demo:** [https://eq-viz.vercel.app/](https://eq-viz.vercel.app/)  
📂 **GitHub:** [https://github.com/janvi-vp/EqViz](https://github.com/janvi-vp/EqViz)

## Features

- Add, edit, and delete equations
- Visualize multiple equations on a graph
- Toggle visibility and color for each equation
- Insert math symbols and functions with utility buttons
- Zoom and pan the graph view
- Example equations for quick start
- Responsive, modern UI

## Technologies Used

- Next.js
- React
- TypeScript
- lucide-react (icons)
- mathjs (math parsing)
- Tailwind CSS

## Getting Started

1. Install dependencies:
	```bash
	npm install
	```
2. Start the development server:
	```bash
	npm run dev
	```
3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

- Enter equations using `x` and `y` variables (e.g., `sin(x)`, `x^2 + y^2`)
- Use the symbol buttons to quickly insert math operators and functions
- Click example buttons to add sample equations
- Adjust the graph view range and zoom controls as needed

## Folder Structure

- `src/app/MathVisualizer.tsx` — Main visualizer component
- `public/` — Static assets and SVGs
- `globals.css` — Global styles

## License

MIT
