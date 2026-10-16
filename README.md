# Insaaf Aasan — AI-Powered Legal Complaint Assistant

**Aapka Haq, Aapki Awaz — Your Right, Your Voice**

Insaaf Aasan is an AI-powered legal complaint assistant designed to make legal information more accessible to people in Pakistan. It helps users describe incidents in Urdu, Roman Urdu, or English and organizes their complaints into a structured format with potentially relevant legal information.

The project combines a React frontend, a Node.js and Express backend, Google's Gemini AI, and Retrieval-Augmented Generation (RAG) to help users navigate legal information more easily.

**GitHub Repository:** [khadija-shafique/insaaf-aasan](https://github.com/khadija-shafique/insaaf-aasan)

## Table of Contents

- [Problem Statement](#problem-statement)
- [Key Features](#key-features)
- [How It Works](#how-it-works)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Deployment](#deployment)
- [Limitations](#limitations)
- [Future Improvements](#future-improvements)
- [Disclaimer](#disclaimer)

## Problem Statement

Understanding legal rights and preparing a clear complaint can be challenging for people unfamiliar with legal terminology. Language barriers and difficulty finding relevant legal information can make the process even harder.

Insaaf Aasan aims to simplify this process by allowing users to explain an incident in their own words and helping them organize their complaint while locating potentially relevant information from a curated knowledge base.

## Key Features

- **Multilingual complaints:** Accepts user input in Urdu, Roman Urdu, and English.
- **Complaint structuring:** Helps transform an unstructured description into a clearer complaint.
- **AI-assisted processing:** Integrates Google Gemini for configured text-generation tasks.
- **RAG-based retrieval:** Searches a curated knowledge base for potentially relevant legal information.
- **Legal information support:** Provides relevant material when suitable knowledge-base content is available.
- **Fallback handling:** Uses alternative response behavior when retrieval confidence is insufficient or AI generation fails.
- **Web-based interface:** Provides a user-friendly way to submit complaints and view results.
- **Modular architecture:** Keeps the frontend, backend, retrieval logic, and AI integration separated.

## How It Works

1. **Complaint submission:** The user describes an incident in Urdu, Roman Urdu, or English.
2. **Backend processing:** The frontend sends the request to the backend API.
3. **Knowledge retrieval:** The RAG component searches the available legal knowledge base.
4. **AI processing:** Gemini assists with configured text-generation or response-polishing tasks.
5. **Fallback handling:** If no sufficiently confident retrieval match is found, or AI generation fails, the application follows its configured fallback behavior.
6. **Response delivery:** The backend returns the processed result for display in the frontend.

The exact response depends on the available source material, retrieval confidence, and the availability of the configured AI service.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React 19 |
| Frontend tooling | Vite |
| Routing | React Router |
| Backend runtime | Node.js |
| Backend framework | Express.js |
| AI integration | Google Gemini API |
| RAG embeddings | Gemini Embedding API |
| Backend configuration | dotenv |
| Cross-origin requests | CORS |
| Testing | Node.js built-in test runner |
| Backend hosting | Render |

## Project Structure

The repository separates the frontend from the current backend implementation.

```text
insaaf-aasan/
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   └── ...                  # Older backend version
│
├── backend1/
│   ├── src/
│   │   ├── server.js
│   │   └── services/
│   │       ├── rag/
│   │       │   └── embedder.js
│   │       └── providers/
│   │           └── gemini.js
│   ├── scripts/
│   │   └── buildIndex.js
│   ├── package.json
│   └── .env.example
│
└── README.md
```

*Note: This is a simplified representation. Some files and directories have been omitted. `backend1` is the updated backend directory used for deployment.*

## Getting Started

### Prerequisites

Install the following before running the project:

- [Node.js](https://nodejs.org/)
- npm, included with Node.js
- [Git](https://git-scm.com/)
- A Google Gemini API key for AI functionality

### 1. Clone the Repository

Open a terminal and run:

```bash
git clone https://github.com/khadija-shafique/insaaf-aasan.git
cd insaaf-aasan
```

### 2. Install Backend Dependencies

Navigate to the updated backend directory:

```bash
cd backend1
npm install
```

Create a `.env` file inside `backend1`, using `.env.example` as a reference if it is available.

Add the required environment variables before starting the server.

### 3. Install Frontend Dependencies

Open a second terminal in the project root and run:

```bash
cd frontend
npm install
```

### 4. Start the Backend

In the terminal opened inside `backend1`, run:

```bash
npm run dev
```

This starts the backend using Node.js watch mode and the `src/server.js` entry point.

For production-style startup, use:

```bash
npm start
```

Do not run both commands against the same port at the same time.

### 5. Start the Frontend

In the second terminal, navigate to `frontend` and run:

```bash
npm run dev
```

Vite will print a local URL in the terminal. Open that URL in your browser.

Ensure the frontend is configured to send API requests to the running backend.

## Environment Variables

The backend uses environment variables for Gemini integration and other runtime configuration.

Example configuration:

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=your_supported_gemini_model
GEMINI_EMBED_MODEL=gemini-embedding-001
```

### Variable Reference

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Authenticates requests to Google Gemini services. |
| `GEMINI_MODEL` | Specifies the configured Gemini text-generation model. |
| `GEMINI_EMBED_MODEL` | Specifies the model used to generate embeddings for retrieval. |

Use the actual supported model names configured for your project. Check `backend1/.env.example` and the source code for required variables and defaults.

**Security guidelines:**

- Never commit `.env` files containing API keys.
- Never expose private API keys in frontend code.
- Store production secrets in the hosting provider's environment settings.
- If an API key becomes public, revoke it and generate a replacement.

## Running the Application

### Frontend Development Server

From the `frontend` directory:

```bash
npm run dev
```

### Frontend Production Build

From the `frontend` directory:

```bash
npm run build
```

Vite generates the production build in the `dist` directory.

### Frontend Preview

After building, you can preview the production build locally:

```bash
npm run preview
```

### Backend Development Server

From the `backend1` directory:

```bash
npm run dev
```

### Backend Production Start

```bash
npm start
```

### Backend Tests

```bash
npm test
```

This executes the tests discovered by Node.js's built-in test runner.

### Build the RAG Index

The backend defines a script for building the RAG index:

```bash
npm run rag:index
```

Run this command when required by your knowledge-base setup or after relevant source data changes. Confirm the expected input files and output locations in `backend1/scripts/buildIndex.js` before using it.

## Deployment

The frontend and backend are deployed as separate application components.

### Backend Deployment on Render

The updated backend uses the `backend1` directory.

Configure the Render service with the following settings:

| Setting | Value |
|---|---|
| Root Directory | `backend1` |
| Build Command | `npm install` |
| Start Command | `npm start` |

Deployment steps:

1. Connect the GitHub repository to Render.
2. Select the backend web service.
3. Set the Root Directory to `backend1`.
4. Configure the build and start commands shown above.
5. Add the required environment variables in Render.
6. Deploy the service.
7. Check the deployment logs to confirm that the server starts successfully.

When updating the backend, ensure Render deploys the latest code from `backend1`, rather than the older `backend` directory.

### Frontend Deployment

Deploy the `frontend` directory using a hosting provider that supports React and Vite.

Before deploying:

- Ensure the production build succeeds.
- Configure the frontend to use the deployed backend API URL.
- Verify that the backend permits requests from the frontend's origin if cross-origin requests are used.
- Confirm that no private credentials are included in the frontend build.

The exact frontend API configuration variable depends on the implementation in the repository.

## Limitations

- The quality of responses depends on the accuracy and coverage of the legal knowledge base.
- Relevant information may not be retrieved for ambiguous or unusual complaints.
- AI-generated explanations can contain errors and should be checked against authoritative sources.
- Gemini availability, rate limits, or temporary service errors may affect AI-powered features.
- Legal information must be maintained as applicable laws and procedures change.
- The application does not replace a lawyer or an official government service.

## Future Improvements

Potential improvements include:

- Expanding and regularly updating the verified legal knowledge base.
- Providing clearer citations and links to authoritative legal sources.
- Improving retrieval accuracy and confidence calibration.
- Strengthening support for Urdu, Roman Urdu, and English.
- Adding automated tests for complaint processing, retrieval, and fallback behavior.
- Improving error reporting and service monitoring.
- Strengthening privacy and security for user-submitted complaints.
- Improving accessibility and usability across desktop and mobile devices.

## Disclaimer

Insaaf Aasan is an AI-assisted legal-information and complaint-structuring project. It is intended to help users organize their concerns and find potentially relevant information.

It does not guarantee the accuracy or completeness of legal information, replace professional legal advice, or represent an official government service. Users should verify important legal matters with authoritative sources or a qualified legal professional.

## Contributing

Contributions that improve usability, accessibility, testing, retrieval quality, and the reliability of legal references are welcome.

Before submitting changes:

1. Test the changes locally.
2. Keep API keys and other secrets out of version control.
3. Document any new environment variables or setup requirements.
4. Ensure the frontend and backend remain compatible.
5. Submit changes through a pull request.

## Project Goal

Insaaf Aasan aims to make legal information easier to approach by helping people express their complaints clearly and discover potentially relevant information in a language they understand.
