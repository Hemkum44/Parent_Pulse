const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Configure multer for file uploads (though we won't need it with Web Speech API)
const upload = multer({ 
  dest: 'temp/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Simple emotion analysis using keywords
function analyzeEmotion(text) {
  const textLower = text.toLowerCase();
  
  const negativeWords = ['angry', 'frustrated', 'upset', 'mad', 'annoyed', 'stressed', 'worried', 'anxious', 'sad', 'tired', 'exhausted'];
  const positiveWords = ['happy', 'excited', 'proud', 'grateful', 'calm', 'peaceful', 'content', 'pleased'];
  
  const negativeCount = negativeWords.filter(word => textLower.includes(word)).length;
  const positiveCount = positiveWords.filter(word => textLower.includes(word)).length;
  
  if (negativeCount > positiveCount) {
    return { label: 'NEGATIVE', score: Math.min(0.6 + (negativeCount * 0.1), 0.95) };
  } else if (positiveCount > negativeCount) {
    return { label: 'POSITIVE', score: Math.min(0.6 + (positiveCount * 0.1), 0.95) };
  } else {
    return { label: 'NEUTRAL', score: 0.5 };
  }
}

// Generate response using Gemini API
async function generateResponse(userText, childProfile, tone, conversationHistory = null) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.warn('GEMINI_API_KEY not set, using fallback response');
    const emotion = analyzeEmotion(userText);
    return `I understand your ${emotion.label.toLowerCase()} feelings about this parenting situation. Every parent faces challenges, and it's completely normal to feel this way. Try saying to your child: "I understand this is hard for both of us. Let's figure this out together."`;
  }

  // Build context from conversation history
  let context = "";
  if (conversationHistory && conversationHistory.length > 0) {
    context = "\n\nPrevious conversation:\n";
    conversationHistory.slice(-3).forEach(msg => {
      context += `Parent: ${msg.question || ''}\n`;
      context += `Coach: ${msg.response || ''}\n`;
    });
  }

  let prompt;
  if (conversationHistory && conversationHistory.length > 0) {
    // Follow-up question
    prompt = `You are a calm, supportive parenting coach continuing a conversation with a parent.

${context}

The parent now asks: "${userText}"

Their child is ${childProfile.age} years old, described as: ${childProfile.traits}.
They prefer a ${tone} tone.

Provide a helpful, specific response that builds on your previous advice. Keep it concise and actionable.`;
  } else {
    // Initial question
    prompt = `You are a calm, supportive parenting coach. A parent just shared:

"${userText}"

Their child is ${childProfile.age} years old, described as: ${childProfile.traits}.
They prefer a ${tone} tone.

Give a short, emotionally validating response followed by one actionable phrase the parent can say right now.`;
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      return data.candidates[0].content.parts[0].text.trim();
    } else {
      throw new Error('Invalid response format from Gemini API');
    }
  } catch (error) {
    console.error('Gemini API failed:', error);
    // Fallback response
    const emotion = analyzeEmotion(userText);
    if (conversationHistory && conversationHistory.length > 0) {
      return `I understand your follow-up concern. Based on your ${emotion.label.toLowerCase()} feelings, remember that parenting approaches often need adjustment. Try a different angle or give the previous suggestion more time to work.`;
    } else {
      return `I can sense that you're feeling ${emotion.label.toLowerCase()} right now. Parenting can be challenging, and it's completely normal to feel this way. Take a deep breath and remember that you're doing your best. Try saying to your child: 'I understand this is hard for both of us. Let's figure this out together.'`;
    }
  }
}

// API Routes
app.post('/api/analyze', async (req, res) => {
  try {
    const { text, child_profile, tone, conversation_history } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    const childProfile = child_profile || { age: 5, traits: 'Sensitive, high energy' };
    const preferredTone = tone || 'gentle';

    // Analyze emotion (only for initial questions)
    let emotion = { label: null, score: null };
    if (!conversation_history || conversation_history.length === 0) {
      emotion = analyzeEmotion(text);
    }

    // Generate response
    const advice = await generateResponse(text, childProfile, preferredTone, conversation_history);

    res.json({
      emotion,
      advice
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Analysis failed: ' + error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    message: 'ParentPulse Node.js API is running',
    dependencies: Object.keys(require('./package.json').dependencies).length
  });
});

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/script.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'script.js'));
});

// Clean up temp directory on startup
if (fs.existsSync('temp')) {
  fs.rmSync('temp', { recursive: true, force: true });
}
fs.mkdirSync('temp', { recursive: true });

app.listen(port, () => {
  console.log(`🚀 ParentPulse server running on http://localhost:${port}`);
  console.log(`📦 Dependencies: ${Object.keys(require('./package.json').dependencies).length}`);
  console.log(`🔑 Gemini API: ${process.env.GEMINI_API_KEY ? 'Configured' : 'Not configured (using fallback)'}`);
});
