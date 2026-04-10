# AI Interview Coach

AI Interview Coach is a practice platform built to feel like a real interview, not a polite chatbot conversation.
Most AI interview tools are overly nice and generic. This product is intentionally more direct, structured, and honest so candidates can improve faster under realistic pressure.

Core interview modes:
- Normal mode: Simulates a standard professional interview flow with clear, relevant questions.
- Harsh mode: Simulates a demanding interviewer who challenges weak logic, asks follow-up pressure questions, and pushes for evidence-based answers.

What makes it different:
- Context-aware interview setup using CV + Job Description.
- Rubric-based scoring (relevance, structure, specificity, clarity, confidence).
- STAR/PAR-oriented feedback with concrete weaknesses and a better answer version.
- Session history for tracking progress across practice rounds.

Live demo (Vercel): https://ai-interview-coach-nine-gamma.vercel.app/

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
