# RecoverAI — Autonomous Revenue Recovery Agent

RecoverAI is an intelligent, autonomous agent platform designed to recover lost revenue from failed payments, churn, and abandoned checkouts.

## Technology Stack

- **Frontend:** React, Vite, Tailwind CSS, JavaScript (JSX)
- **Backend:** Python, FastAPI, Pydantic, Uvicorn
- **Database:** (To be added in future milestones)
- **AI Agent Framework:** (To be added in future milestones)

---

## Project Structure

```
Recover-AI/
├── frontend/             # React + Vite + Tailwind CSS frontend application
├── backend/              # FastAPI + Python backend application
├── docs/                 # Documentation and architecture specs
├── tests/                # System-level integration and E2E tests
├── .gitignore            # Git ignore configuration
├── README.md             # Project overview and instructions
└── .env.example          # Environment variables template
```

---

## Quick Start Instructions

### 1. Backend Setup & Run

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   # On Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI backend server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
5. Confirm backend health check:
   - Endpoint: `http://localhost:8000/api/health`
   - Interactive API Docs: `http://localhost:8000/docs`

---

### 2. Frontend Setup & Run

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install Node modules:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the web interface at `http://localhost:5173`.

---

## Milestones Roadmap

- [x] **Milestone 1:** Project Foundation & Basic Health Check
- [ ] **Milestone 2:** Database Integration & Schema Definitions
- [ ] **Milestone 3:** Core Domain Models & Services
- [ ] **Milestone 4:** AI Recovery Agent & Tools Integration
- [ ] **Milestone 5:** Merchant Dashboard & Analytics
- [ ] **Milestone 6:** E2E Testing & Hardening
