# مستشار الدولة — React + Express

## Project Structure
```
mustashar-react/
├── backend/          ← Express.js API server
│   ├── data/chunks.json
│   ├── server.js
│   └── package.json
└── frontend/         ← React + Tailwind CSS
    ├── public/
    │   ├── background.jpg
    │   └── emblem.png
    ├── src/
    │   ├── components/
    │   ├── hooks/useChat.js
    │   ├── utils/markdown.jsx
    │   ├── App.jsx
    │   └── main.jsx
    └── package.json
```

## Run Locally

### 1. Backend
```bash
cd backend
cp .env.example .env      # add your ANTHROPIC_API_KEY
npm install
npm run dev               # runs on http://localhost:3001
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev               # runs on http://localhost:5173
```

## Deploy

### Frontend → Netlify
- Build command: `npm run build`
- Publish directory: `dist`
- Set env variable: `VITE_BACKEND_URL=https://your-backend.com`

### Backend → Railway / Koyeb / Render
- Start command: `node server.js`
- Set env variable: `ANTHROPIC_API_KEY=sk-ant-...`
