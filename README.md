# ParentPulse - AI Parenting Coach

A modern, lightweight AI-powered parenting companion that provides instant, personalized guidance for any parenting challenge. Built with minimal dependencies using Node.js and Web Speech API.

## ✨ Features

- **🎤 Voice Recognition**: Real-time speech-to-text using Web Speech API
- **✍️ Text Input**: Type your parenting questions directly  
- **🤖 AI-Powered Responses**: Personalized advice using Google Gemini AI
- **💭 Emotion Analysis**: Understand the emotional context of your situation
- **💬 Follow-up Conversations**: Continue conversations with contextual responses
- **👶 Child Profiles**: Customize advice based on your child's age and traits
- **🎨 Modern UI**: Beautiful, responsive interface with smooth animations

## 🚀 Technology Stack

- **Backend**: Node.js + Express (ultra-minimal)
- **AI**: Google Gemini API (direct HTTP calls)
- **Speech Recognition**: Web Speech API (browser-native)
- **Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript
- **Dependencies**: Only 4 packages (express, cors, multer, dotenv)

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Hemkum44/Parent_Pulse.git
   cd Parent_Pulse
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=5000
   ```

4. **Get a Gemini API Key**
   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Create a new API key
   - Add it to your `.env` file

5. **Run the application**
   ```bash
   npm start
   ```

6. **Access the app**
   Open `http://localhost:5000` in your browser

## 🎯 Usage

1. **Child Profile** - Set age, personality traits, and coaching style
2. **Input Method** - Choose between typing or voice recognition
3. **Share Challenge** - Describe your parenting situation
4. **Get Guidance** - Receive personalized AI coaching
5. **Follow-up** - Ask additional questions for deeper support

## 🌟 Why This Version?

- **98% smaller** - 50MB vs 2GB+ Python version
- **Faster startup** - Instant vs minutes of model loading
- **Browser-native** - No server-side audio processing
- **Modern UX** - Beautiful, responsive design
- **Privacy-focused** - Minimal data processing

## 🔧 Browser Compatibility

Voice recognition works best in:
- ✅ Chrome (recommended)
- ✅ Microsoft Edge  
- ✅ Safari
- ❌ Firefox (limited support)

## 🚀 Deployment

Ready for deployment on any Node.js hosting platform:
- Vercel
- Netlify
- Railway
- Heroku
- DigitalOcean

## 🔒 Privacy

- Conversations processed securely via HTTPS
- No audio files stored on server
- Voice processing happens in your browser
- API calls encrypted end-to-end

## 🤝 Contributing

Issues and pull requests welcome! This project prioritizes:
- Minimal dependencies
- Fast performance  
- Great user experience
- Privacy protection

## 📄 License

MIT License - feel free to use and modify!
