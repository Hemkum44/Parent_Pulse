from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import whisper
from pydub import AudioSegment
import os
import uuid
import google.generativeai as genai
from transformers import pipeline
import tempfile
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure Gemini API
gemini_api_key = os.getenv('GEMINI_API_KEY')
if gemini_api_key:
    genai.configure(api_key=gemini_api_key)
    gemini_model = genai.GenerativeModel('gemini-1.5-flash')
else:
    print("Warning: GEMINI_API_KEY environment variable not set")
    gemini_model = None

# Load models once at startup
whisper_model = whisper.load_model("base")
sentiment_pipeline = pipeline("sentiment-analysis")

def transcribe_audio_file(file_path):
    """Transcribe audio file using Whisper"""
    try:
        result = whisper_model.transcribe(file_path)
        return result["text"]
    except Exception as e:
        raise Exception(f"Transcription failed: {str(e)}")

def analyze_emotion(text):
    """Analyze emotion using transformers pipeline"""
    try:
        result = sentiment_pipeline(text)[0]
        return result['label'], result['score']
    except Exception as e:
        raise Exception(f"Emotion analysis failed: {str(e)}")

def generate_response(user_text, child_profile, tone, conversation_history=None):
    """Generate parenting advice using Gemini API with fallback"""
    
    print(f"[DEBUG] generate_response called with text: {user_text[:50]}...")
    print(f"[DEBUG] gemini_model is None: {gemini_model is None}")
    print(f"[DEBUG] gemini_api_key set: {gemini_api_key is not None}")
    
    # Build context from conversation history
    context = ""
    if conversation_history:
        context = "\n\nPrevious conversation:\n"
        for msg in conversation_history[-3:]:  # Include last 3 exchanges
            context += f"Parent: {msg.get('question', '')}\n"
            context += f"Coach: {msg.get('response', '')}\n"
    
    if conversation_history:
        # This is a follow-up question
        prompt = f"""
You are a calm, supportive parenting coach continuing a conversation with a parent.

{context}

The parent now asks: "{user_text}"

Their child is {child_profile['age']} years old, described as: {child_profile['traits']}.
They prefer a {tone} tone.

Provide a helpful, specific response that builds on your previous advice. Keep it concise and actionable.
"""
    else:
        # This is the initial question
        prompt = f"""
You are a calm, supportive parenting coach. A parent just shared:

"{user_text}"

Their child is {child_profile['age']} years old, described as: {child_profile['traits']}.
They prefer a {tone} tone.

Give a short, emotionally validating response followed by one actionable phrase the parent can say right now.
"""
    
    try:
        if gemini_model is None:
            raise Exception("Gemini API key not configured")
        
        print("[DEBUG] Calling Gemini API...")
        response = gemini_model.generate_content(prompt)
        print("[DEBUG] Gemini API call successful")
        return response.text.strip()
    except Exception as e:
        print(f"[Warning] Gemini API failed with error: {e}")
        # Fallback response based on emotion analysis
        try:
            label, score = analyze_emotion(user_text)
            if conversation_history:
                fallback_response = f"I understand your follow-up concern. Based on your {label.lower()} feelings, remember that parenting approaches often need adjustment. Try a different angle or give the previous suggestion more time to work."
            else:
                fallback_response = f"I can sense that you're feeling {label.lower()} right now (confidence: {score:.2f}). Parenting can be challenging, and it's completely normal to feel this way. Take a deep breath and remember that you're doing your best. Try saying to your child: 'I understand this is hard for both of us. Let's figure this out together.'"
            return fallback_response
        except:
            return "I understand your concern. Every parenting situation is unique, and it's normal to need clarification or alternative approaches. Trust your instincts and remember that consistency and patience are key."

@app.route('/api/transcribe', methods=['POST'])
def transcribe():
    """Handle audio file transcription"""
    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
            # Convert audio to wav format
            audio = AudioSegment.from_file(audio_file)
            audio.export(temp_file.name, format="wav")
            
            # Transcribe
            transcription = transcribe_audio_file(temp_file.name)
            
            # Clean up
            os.unlink(temp_file.name)
            
            return jsonify({'transcription': transcription})
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyze', methods=['POST'])
def analyze():
    """Handle text analysis and response generation"""
    try:
        data = request.json
        
        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400
        
        user_text = data['text']
        child_profile = data.get('child_profile', {'age': 5, 'traits': 'Sensitive, high energy'})
        tone = data.get('tone', 'gentle')
        conversation_history = data.get('conversation_history', None)
        
        # Analyze emotion (only for initial questions, not follow-ups)
        if not conversation_history:
            emotion_label, emotion_score = analyze_emotion(user_text)
        else:
            emotion_label, emotion_score = None, None
        
        # Generate response
        advice = generate_response(user_text, child_profile, tone, conversation_history)
        
        return jsonify({
            'emotion': {
                'label': emotion_label,
                'score': emotion_score
            },
            'advice': advice
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': 'ParentPulse API is running'})

@app.route('/')
def index():
    """Serve the main HTML page"""
    return send_from_directory('.', 'index.html')

@app.route('/script.js')
def script():
    """Serve the JavaScript file"""
    return send_from_directory('.', 'script.js')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)
