# CareAI – AI Medical Chatbot

CareAI is an AI-powered medical information chatbot designed to provide users with educational health information through an interactive chat interface. It uses React for the frontend, FastAPI for the backend, and the Groq API for AI-generated responses.

The application also supports PDF document uploads and Retrieval-Augmented Generation (RAG), allowing users to ask questions based on uploaded educational documents.

> **Medical Disclaimer:** CareAI is an educational health-information assistant, not a replacement for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional for medical concerns. In emergencies, contact emergency services immediately.

## Features

- **AI-Powered Chatbot:** Provides conversational health-related information using Groq AI.
- **Interactive Chat Interface:** User-friendly React-based interface.
- **Conversation History:** Maintains recent conversation context.
- **PDF Upload:** Allows users to upload PDF documents.
- **RAG Integration:** Retrieves relevant information from uploaded documents.
- **Source References:** Displays document names, page numbers, and relevant excerpts.
- **Emergency Detection:** Provides emergency warnings for potentially serious situations.
- **Medical Disclaimer:** Includes safety reminders in chatbot responses.
- **FastAPI Backend:** Provides API endpoints for chat and document processing.

## Technologies Used

### Frontend
- React.js
- JavaScript
- HTML5
- CSS3
- Vite

### Backend
- Python
- FastAPI
- Uvicorn

### AI Integration
- Groq API
- LLM-based text generation
- Retrieval-Augmented Generation (RAG)

### Other Tools
- Git and GitHub
- Visual Studio Code
- Python Virtual Environment

## Project Structure

```text
ai-medical-chatbot-starter/
│
├── venv/
│
└── ai-medical-chatbot/
    │
    ├── backend/
    │   ├── app/
    │   │   ├── main.py
    │   │   ├── config.py
    │   │   ├── schemas.py
    │   │   ├── safety.py
    │   │   └── rag.py
    │   │
    │   ├── data/
    │   ├── .env
    │   ├── .env.example
    │   └── requirements.txt
    │
    └── frontend/
        ├── src/
        ├── public/
        ├── package.json
        └── ...
```

## Installation and Setup

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

Navigate to the project directory:

```bash
cd ai-medical-chatbot-starter
```

### 2. Create a Virtual Environment

```bash
python -m venv venv
```

Activate the virtual environment on Windows:

```cmd
venv\Scripts\activate
```

### 3. Install Backend Dependencies

Navigate to the backend directory:

```cmd
cd ai-medical-chatbot\backend
```

Install the dependencies:

```cmd
pip install -r requirements.txt
pip install groq
```

### 4. Configure Environment Variables

Create a `.env` file inside the backend directory.

Add the following configuration:

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-20b
FRONTEND_ORIGIN=http://localhost:5173
MAX_UPLOAD_MB=10
```

Get your API key from:

https://console.groq.com/

**Important:** Never upload your actual `.env` file or API key to GitHub.

### 5. Start the Backend Server

From the backend directory, run:

```cmd
python -m uvicorn app.main:app --reload --reload-dir app
```

Backend server:

http://127.0.0.1:8000

API documentation:

http://127.0.0.1:8000/docs

Health check:

http://127.0.0.1:8000/api/health

### 6. Start the Frontend

Open a second terminal.

Navigate to the frontend directory:

```cmd
cd ai-medical-chatbot\frontend
```

Install frontend dependencies:

```cmd
npm install
```

Start the development server:

```cmd
npm run dev
```

Open the application in your browser:

http://localhost:5173

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Checks backend and AI configuration |
| POST | `/api/chat` | Sends messages to the AI chatbot |
| POST | `/api/documents` | Uploads and indexes PDF documents |

## How CareAI Works

1. The user enters a health-related question in the React interface.
2. The frontend sends the request to the FastAPI backend.
3. The backend checks for emergency-related messages.
4. The RAG module searches uploaded PDF documents for relevant information.
5. Relevant document excerpts are added to the AI prompt.
6. The Groq API generates a response.
7. The backend returns the answer and available document sources.
8. The React frontend displays the response to the user.

## Troubleshooting

**1. API Key Not Configured**

- Check that `.env` exists inside the backend directory.
- Verify that `GROQ_API_KEY` is spelled correctly.
- Restart the backend server after changing `.env`.

**2. Module Not Found Error**

Install the required dependency:

```cmd
pip install groq
```

**3. Failed to Fetch**

- Make sure the FastAPI server is running.
- Check the backend URL.
- Check CORS configuration.
- Check the browser console for errors.

**4. AI Service Error**

- Verify your Groq API key.
- Check the configured model name.
- Check your API usage limits.
- Check the backend terminal for the original error.

**5. PDF Upload Error**

- Upload a valid PDF file.
- Check the configured file-size limit.
- Check the backend terminal for document-processing errors.

## Future Enhancements

- User authentication and registration.
- Chat history storage.
- Improved PDF document management.
- Enhanced RAG-based document retrieval.
- Multilingual chatbot support.
- Voice-based interaction.
- Improved UI and responsive design.
- Deployment to cloud platforms.

## Security and Responsible AI

- API keys are stored in backend environment variables.
- Sensitive credentials should never be committed to GitHub.
- Uploaded documents should be handled securely.
- Users should not submit confidential patient information to third-party AI services without appropriate authorization and safeguards.
- AI responses may contain inaccuracies and should not be treated as professional medical advice.
- Emergency warnings and medical disclaimers should remain enabled.

## Author

**Developed as an AI and Web Development Project.**

## License

A license has not yet been selected for this project. Add an appropriate license before permitting public reuse or redistribution.

---

**CareAI – Making Health Information More Accessible with Artificial Intelligence.**