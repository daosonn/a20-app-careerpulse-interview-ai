# AI Interview Coach (Modular Microservices)

AI Interview Coach is an advanced practice platform designed to simulate realistic, high-pressure professional interviews. Unlike generic chatbots, this system uses a multi-agent microservices architecture to provide structured, context-aware, and challenging interview sessions.

## 🚀 Key Features

- **Multi-Agent Orchestration**: Powered by **LangGraph**, the system coordinates between specialized agents for profiling, interviewing, and evaluation.
- **RAG-Integrated Question Bank**: Uses **ChromaDB** to retrieve relevant interview questions based on extracted skills from the candidate's CV.
- **Microservices Architecture**: Five decoupled services (Profiler, Interviewer, Evaluator, Reporter, Gateway) communicating via REST.
- **Audio Interaction**: Real-time voice interaction using **OpenAI Whisper (STT)** and **OpenAI TTS**.
- **Context-Aware Setup**: Analyzes both **CV (PDF/Docx)** and **Job Description** to tailor the interview.
- **Professional Evaluation**: Rubric-based scoring and STAR/PAR-oriented feedback for every response.
- **Stress-Test Mode**: Intentionally challenging "Harsh" mode to prepare candidates for high-pressure scenarios.

## 🏗️ Architecture

The system is built as a set of modular microservices:

1.  **Gateway Service** (Port 8000): The entry point for the frontend, orchestrating requests and handling audio processing.
2.  **Profiler Service** (Port 8001): Extracts skills from CVs and retrieves relevant questions from the Vector DB.
3.  **Interviewer Service** (Port 8002): Generates dynamic questions based on the current interview phase and context.
4.  **Evaluator Service** (Port 8003): Provides real-time analysis of candidate answers against professional rubrics.
5.  **Reporter Service** (Port 8004): Generates comprehensive end-of-interview feedback and summaries.

## 🛠️ Tech Stack

### Backend (Python)
- **Framework**: FastAPI (Microservices)
- **AI Core**: LangGraph, LangChain, Anthropic Claude API, OpenAI API
- **Vector DB**: ChromaDB
- **ORM/DB**: SQLAlchemy with SQLite
- **Audio**: OpenAI Whisper (STT), OpenAI TTS-1

### Frontend (React)
- **Core**: React 19, Vite, TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Persistence**: Firebase (Auth & Firestore)

## 🚦 Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+
- API Keys for Anthropic and/or OpenAI

### 1. Backend Setup
```bash
# Clone the repository
git clone <repo-url>
cd <repo-name>

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your API keys
```

### 2. Frontend Setup
```bash
# From the project root
npm install
```

### 3. Running the Application
The easiest way to start all backend services is using the main entry script:
```bash
# In one terminal (Backend)
python src/main.py

# In another terminal (Frontend)
npm run dev
```

The application will be available at `http://localhost:3000`.

## 📄 Environment Variables

Required variables in `.env`:
- `ANTHROPIC_API_KEY`: Your Anthropic API key.
- `OPENAI_API_KEY`: Your OpenAI API key (required for Audio & Embeddings).
- `DEFAULT_MODEL`: The LLM to use (e.g., `claude-3-5-sonnet-20240620`).

## 🤝 Rules for Contributors

If you are using AI coding agents, please ensure `scripts/setup_hooks.sh` has been run to enable automatic activity logging.
