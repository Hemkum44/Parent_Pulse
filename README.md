# ParentPulse - Real-Time Parenting Support

A modern web application that provides AI-powered parenting advice through text or voice input, built with HTML/Tailwind CSS frontend and Flask API backend.

## Features

- 🎙️ **Voice & Text Input**: Share your parenting situation via text or audio upload
- 🧠 **Emotion Analysis**: AI-powered emotion detection from your input
- 🤖 **Personalized Advice**: Get tailored parenting responses based on your child's profile
- 📱 **Responsive Design**: Beautiful, mobile-friendly interface with Tailwind CSS
- 🔄 **Real-time Processing**: Fast audio transcription and analysis

## Setup Instructions

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 2. Install and Setup Ollama (Optional but Recommended)

For the best AI responses, install Ollama:

```bash
# Install Ollama
brew install ollama

# Pull the Llama3 model
ollama pull llama3

# Start Ollama service (run in separate terminal)
ollama serve
```

If Ollama is not available, the app will use a fallback response system.

### 3. Run the Application

```bash
python api.py
```

The application will be available at: `http://localhost:5000`

## Usage

1. **Set Child Profile**: Configure your child's age, traits, and preferred communication tone
2. **Choose Input Method**: 
   - **Text**: Type your parenting situation directly
   - **Audio**: Upload an MP3, WAV, or M4A file (up to 10MB)
3. **Get Support**: Click "Get Parenting Support" to receive:
   - Emotion analysis of your input
   - Personalized parenting advice and actionable phrases

## API Endpoints

- `GET /` - Serve the main application
- `POST /api/transcribe` - Transcribe audio files
- `POST /api/analyze` - Analyze text and generate parenting advice
- `GET /api/health` - Health check

## Technology Stack

- **Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript
- **Backend**: Flask, Python
- **AI Models**: 
  - OpenAI Whisper (speech-to-text)
  - Transformers (emotion analysis)
  - Ollama/Llama3 (response generation)

## File Structure

```
Parent_Pulse/
├── index.html          # Main frontend interface
├── script.js           # Frontend JavaScript logic
├── api.py             # Flask API backend
├── requirements.txt   # Python dependencies
├── README.md         # This file
└── [legacy files]    # Original Streamlit files (can be removed)
```

## Troubleshooting

- **Audio upload issues**: Ensure file is MP3, WAV, or M4A format under 10MB
- **Slow responses**: Check if Ollama is running (`ollama serve`)
- **CORS errors**: Make sure Flask-CORS is installed and API is running on port 5000
