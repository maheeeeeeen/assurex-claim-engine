# AssureX Claim Engine — Frontend

React single-page application built with Vite, Bootstrap 5, React Router, and Recharts.

## Setup

```bash
npm install
npm run dev
```

Runs at `http://localhost:5173`. Expects the backend API at `http://localhost:8000`.

## Structure

```
src/
├── main.jsx              # React DOM entry point
├── App.jsx               # Router and layout
├── index.css             # Global styles
├── api/                  # Axios client and endpoint wrappers
├── context/              # AuthContext (JWT, user state)
├── pages/                # Route-level page components
├── components/           # Reusable UI components (Navbar, ProfileModal, admin tabs)
└── routes/               # ProtectedRoute (role-based access)
```

## Build

```bash
npm run build
```

Output is written to `dist/`.
