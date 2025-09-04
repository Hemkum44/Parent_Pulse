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

// Enhanced emotion analysis using keywords and context
function analyzeEmotion(text) {
  const textLower = text.toLowerCase();
  
  // Expanded emotion keywords with weights
  const emotionPatterns = {
    frustrated: ['frustrated', 'frustrating', 'won\'t listen', 'doesn\'t listen', 'ignore', 'defiant', 'stubborn', 'refuses', 'tantrum', 'meltdown'],
    stressed: ['stressed', 'overwhelmed', 'exhausted', 'tired', 'can\'t handle', 'breaking point', 'at my wit\'s end'],
    worried: ['worried', 'concerned', 'anxious', 'scared', 'afraid', 'nervous', 'what if', 'is this normal'],
    angry: ['angry', 'mad', 'furious', 'rage', 'losing it', 'can\'t take it', 'fed up'],
    sad: ['sad', 'depressed', 'hopeless', 'crying', 'tears', 'heartbroken', 'disappointed'],
    confused: ['confused', 'don\'t know', 'not sure', 'help', 'what should i do', 'how do i'],
    proud: ['proud', 'amazing', 'wonderful', 'great job', 'so happy', 'thrilled'],
    grateful: ['grateful', 'thankful', 'blessed', 'lucky', 'appreciate'],
    calm: ['calm', 'peaceful', 'content', 'relaxed', 'good', 'fine', 'okay']
  };
  
  let emotionScores = {};
  let totalMatches = 0;
  
  // Calculate emotion scores based on pattern matches
  for (const [emotion, patterns] of Object.entries(emotionPatterns)) {
    const matches = patterns.filter(pattern => textLower.includes(pattern)).length;
    if (matches > 0) {
      emotionScores[emotion] = matches;
      totalMatches += matches;
    }
  }
  
  // If no clear emotional indicators, analyze sentence structure and context
  if (totalMatches === 0) {
    // Look for question patterns that indicate confusion/seeking help
    if (textLower.includes('how') || textLower.includes('what') || textLower.includes('why') || textLower.includes('?')) {
      emotionScores.confused = 1;
      totalMatches = 1;
    }
    // Look for problem descriptions
    else if (textLower.includes('problem') || textLower.includes('issue') || textLower.includes('trouble')) {
      emotionScores.worried = 1;
      totalMatches = 1;
    }
  }
  
  if (totalMatches === 0) {
    return { label: 'NEUTRAL', score: 0.6 };
  }
  
  // Find dominant emotion
  const dominantEmotion = Object.keys(emotionScores).reduce((a, b) => 
    emotionScores[a] > emotionScores[b] ? a : b
  );
  
  // Map emotions to broader categories
  const emotionMapping = {
    frustrated: 'FRUSTRATED',
    stressed: 'STRESSED', 
    worried: 'WORRIED',
    angry: 'ANGRY',
    sad: 'SAD',
    confused: 'SEEKING_GUIDANCE',
    proud: 'POSITIVE',
    grateful: 'POSITIVE',
    calm: 'CALM'
  };
  
  const finalEmotion = emotionMapping[dominantEmotion] || 'NEUTRAL';
  const confidence = Math.min(0.65 + (emotionScores[dominantEmotion] * 0.15), 0.95);
  
  return { label: finalEmotion, score: confidence };
}

// Check if input is actually about parenting
function isParentingRelated(text) {
  const textLower = text.toLowerCase();
  
  // Generic greetings and non-parenting content
  const nonParentingPatterns = [
    /^(hi|hello|hey|good morning|good evening|good afternoon)\.?$/,
    /^(how are you|what's up|sup)\.?$/,
    /^(thanks|thank you|bye|goodbye)\.?$/
  ];
  
  // Check for simple greetings
  if (nonParentingPatterns.some(pattern => pattern.test(textLower.trim()))) {
    return false;
  }
  
  // Parenting-related keywords
  const parentingKeywords = [
    'child', 'kid', 'toddler', 'baby', 'son', 'daughter', 'children',
    'parenting', 'parent', 'mom', 'dad', 'mother', 'father',
    'behavior', 'tantrum', 'discipline', 'bedtime', 'school',
    'listen', 'obey', 'rules', 'chores', 'homework',
    'crying', 'screaming', 'fighting', 'sibling'
  ];
  
  // Check if text contains parenting-related content
  return parentingKeywords.some(keyword => textLower.includes(keyword)) || 
         textLower.length > 20; // Longer texts are likely parenting questions
}

// Generate response using Gemini API
async function generateResponse(userText, childProfile, tone, conversationHistory = null) {
  const apiKey = process.env.GEMINI_API_KEY;
  const isParenting = isParentingRelated(userText);
  
  if (!apiKey) {
    console.warn('GEMINI_API_KEY not set, using fallback response');
    if (!isParenting) {
      return `Hello! I'm ParentPulse, your AI parenting coach. I'm here to help you navigate parenting challenges. Feel free to share any situation or question about your child, and I'll provide supportive guidance.`;
    }
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
    // Initial question - check if it's actually about parenting
    if (!isParenting) {
      prompt = `You are ParentPulse, a friendly AI parenting coach. The user said: "${userText}"

This appears to be a greeting or general message, not a specific parenting question. 

Respond warmly and invite them to share any parenting challenges they're facing. Do NOT make assumptions about their child or give specific parenting advice yet. Keep it welcoming and brief.`;
    } else {
      prompt = `You are a calm, supportive parenting coach. A parent just shared:

"${userText}"

Their child is ${childProfile.age} years old, described as: ${childProfile.traits}.
They prefer a ${tone} tone.

Give a short, emotionally validating response followed by one actionable phrase the parent can say right now.`;
    }
  }

  // Retry logic for rate limiting
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
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

      if (response.status === 429) {
        // Rate limited - wait and retry
        retryCount++;
        if (retryCount < maxRetries) {
          const waitTime = Math.pow(2, retryCount) * 1000; // Exponential backoff
          console.log(`Rate limited, waiting ${waitTime}ms before retry ${retryCount}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        throw new Error('Rate limit exceeded after retries');
      }

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
      if (retryCount >= maxRetries - 1) {
        console.error('Gemini API failed after retries:', error);
        // Fallback response
        const emotion = analyzeEmotion(userText);
        if (!isParenting) {
          return `Hello! I'm ParentPulse, your AI parenting coach. I'm here to help you navigate parenting challenges. Feel free to share any situation or question about your child, and I'll provide supportive guidance.`;
        }
        if (conversationHistory && conversationHistory.length > 0) {
          return `I understand your follow-up concern. Based on your ${emotion.label.toLowerCase()} feelings, remember that parenting approaches often need adjustment. Try a different angle or give the previous suggestion more time to work.`;
        } else {
          return `I can sense that you're feeling ${emotion.label.toLowerCase()} right now. Parenting can be challenging, and it's completely normal to feel this way. Take a deep breath and remember that you're doing your best. Try saying to your child: 'I understand this is hard for both of us. Let's figure this out together.'`;
        }
      }
      retryCount++;
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
