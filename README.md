# smart-period-tracker

Full-stack starter project with:

- **Frontend:** React + Vite + Tailwind CSS (`/client`)
- **Backend:** Node.js + Express (`/server`)

## Project Structure

```
smart-period-tracker/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .gitignore
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/
│   ├── .gitignore
│   ├── index.js
│   └── package.json
├── .gitignore
└── README.md
```

## Setup

### 1) Install dependencies

```bash
cd client && npm install
cd ../server && npm install
```

### 2) Run backend

```bash
cd server
npm run dev
```

Server runs on `http://localhost:5000`.

### 3) Run frontend

```bash
cd client
npm run dev
```

Frontend runs on Vite dev server (default: `http://localhost:5173`).
