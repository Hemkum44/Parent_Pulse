// DOM Elements
const ageSlider = document.getElementById('child-age');
const ageDisplay = document.getElementById('age-display');
const childTraits = document.getElementById('child-traits');
const tonePref = document.getElementById('tone-pref');
const inputModeRadios = document.querySelectorAll('input[name="input-mode"]');
const textInputSection = document.getElementById('text-input-section');
const voiceInputSection = document.getElementById('voice-input-section');
const userText = document.getElementById('user-text');
const recordBtn = document.getElementById('record-btn');
const recordText = document.getElementById('record-text');
const voiceStatus = document.getElementById('voice-status');
const submitBtn = document.getElementById('submit-btn');
const submitText = document.getElementById('submit-text');
const submitSpinner = document.getElementById('submit-spinner');
const results = document.getElementById('results');
const transcriptionResult = document.getElementById('transcription-result');
const transcriptionText = document.getElementById('transcription-text');
const emotionResult = document.getElementById('emotion-result');
const emotionLabel = document.getElementById('emotion-label');
const emotionScore = document.getElementById('emotion-score');
const adviceResult = document.getElementById('advice-section');
const adviceText = document.getElementById('advice-text');
const followupSection = document.getElementById('followup-section');
const conversationHistory = document.getElementById('conversation-history');
const followupText = document.getElementById('followup-text');
const followupBtn = document.getElementById('followup-btn');
const followupBtnText = document.getElementById('followup-btn-text');
const followupSpinner = document.getElementById('followup-spinner');
const quickFollowupBtns = document.querySelectorAll('.quick-followup-btn');
const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');

// API Base URL
const API_BASE = 'http://localhost:5000/api';

// State
let currentTranscription = '';
let isProcessing = false;
let conversationMessages = [];
let childProfile = {};
let recognition = null;
let isListening = false;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    setupSpeechRecognition();
    updateInputMode();
});

function setupEventListeners() {
    // Age slider
    ageSlider.addEventListener('input', function() {
        ageDisplay.textContent = this.value;
    });

    // Input mode radio buttons
    inputModeRadios.forEach(radio => {
        radio.addEventListener('change', updateInputMode);
    });

    // Voice recording button
    recordBtn.addEventListener('click', toggleSpeechRecognition);

    // Submit button
    submitBtn.addEventListener('click', handleSubmit);

    // Follow-up button
    followupBtn.addEventListener('click', handleFollowup);

    // Quick follow-up buttons (will be dynamically created)
    // Event delegation for dynamic buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('quick-followup-btn')) {
            followupText.value = e.target.textContent;
            handleFollowup();
        }
    });

    // Enter key in text areas
    userText.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            handleSubmit();
        }
    });

    followupText.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            handleFollowup();
        }
    });
}

function setupSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = function() {
            isListening = true;
            recordBtn.classList.remove('bg-gradient-to-r', 'from-red-500', 'to-red-600', 'hover:from-red-600', 'hover:to-red-700');
            recordBtn.classList.add('listening-animation');
            recordText.textContent = 'Stop Listening';
            showVoiceStatus('🎤 Listening... Speak now', 'info');
        };

        recognition.onresult = function(event) {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            if (finalTranscript) {
                currentTranscription = finalTranscript.trim();
                showVoiceStatus(`✅ Transcribed: "${currentTranscription}"`, 'success');
                showTranscription(currentTranscription);
            } else if (interimTranscript) {
                showVoiceStatus(`Listening: "${interimTranscript}"`, 'info');
            }
        };

        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            showVoiceStatus(`Error: ${event.error}. Please try again.`, 'error');
            resetRecordingUI();
        };

        recognition.onend = function() {
            resetRecordingUI();
        };
    } else {
        showVoiceStatus('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.', 'error');
        recordBtn.disabled = true;
    }
}

function updateInputMode() {
    const selectedMode = document.querySelector('input[name="input-mode"]:checked').value;
    
    // Update card styles
    document.querySelectorAll('.input-mode-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    const selectedCard = document.querySelector(`input[value="${selectedMode}"]`).closest('label').querySelector('.input-mode-card');
    selectedCard.classList.add('selected');
    
    textInputSection.classList.add('hidden');
    voiceInputSection.classList.add('hidden');
    
    if (selectedMode === 'text') {
        textInputSection.classList.remove('hidden');
    } else if (selectedMode === 'voice') {
        voiceInputSection.classList.remove('hidden');
    }
    
    currentTranscription = '';
    hideResults();
}

function toggleSpeechRecognition() {
    if (!recognition) {
        showVoiceStatus('Speech recognition not available', 'error');
        return;
    }

    if (isListening) {
        recognition.stop();
    } else {
        recognition.start();
    }
}

function resetRecordingUI() {
    isListening = false;
    recordBtn.classList.remove('listening-animation');
    recordBtn.classList.add('bg-gradient-to-r', 'from-red-500', 'to-red-600', 'hover:from-red-600', 'hover:to-red-700');
    recordText.textContent = 'Start Listening';
}

function showVoiceStatus(message, type) {
    voiceStatus.textContent = message;
    voiceStatus.className = 'mt-2';
    
    if (type === 'error') {
        voiceStatus.classList.add('text-red-600', 'bg-red-50', 'border', 'border-red-200', 'rounded', 'p-2');
    } else if (type === 'success') {
        voiceStatus.classList.add('text-green-600', 'bg-green-50', 'border', 'border-green-200', 'rounded', 'p-2');
    } else if (type === 'warning') {
        voiceStatus.classList.add('text-yellow-600', 'bg-yellow-50', 'border', 'border-yellow-200', 'rounded', 'p-2');
    } else {
        voiceStatus.classList.add('text-blue-600', 'bg-blue-50', 'border', 'border-blue-200', 'rounded', 'p-2');
    }
    
    voiceStatus.classList.remove('hidden');
}

function showTranscription(text) {
    transcriptionText.textContent = text;
    transcriptionResult.classList.remove('hidden');
    results.classList.remove('hidden');
}

async function handleSubmit() {
    if (isProcessing) return;

    const selectedMode = document.querySelector('input[name="input-mode"]:checked').value;
    let inputText = '';

    if (selectedMode === 'text') {
        inputText = userText.value.trim();
        if (!inputText) {
            showError('Please enter some text describing your situation');
            return;
        }
    } else if (selectedMode === 'voice') {
        if (!currentTranscription) {
            showError('Please use voice recognition to capture your question first');
            return;
        }
        inputText = currentTranscription;
    }

    await analyzeInput(inputText);
}

async function analyzeInput(text) {
    setLoading(true);
    hideError();

    // Store initial input and child profile for follow-ups
    if (conversationMessages.length === 0) {
        childProfile = {
            age: parseInt(ageSlider.value),
            traits: childTraits.value.trim() || 'Sensitive, high energy'
        };
    }

    const tone = tonePref.value;

    try {
        const response = await fetch(`${API_BASE}/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                child_profile: childProfile,
                tone: tone,
                conversation_history: conversationMessages.length > 0 ? conversationMessages : null
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Analysis failed');
        }

        showResults(data, text);

    } catch (error) {
        showError('Analysis failed: ' + error.message);
    } finally {
        setLoading(false);
    }
}

function showResults(data, userQuestion) {
    // Show emotion analysis (only for initial questions)
    if (data.emotion.label && data.emotion.score) {
        emotionLabel.textContent = data.emotion.label;
        emotionScore.textContent = data.emotion.score.toFixed(2);
        emotionResult.classList.remove('hidden');
    }

    // Show advice
    adviceText.textContent = data.advice;
    adviceResult.classList.remove('hidden');

    // Add to conversation history
    conversationMessages.push({
        question: userQuestion,
        response: data.advice
    });

    // Update conversation history display
    updateConversationHistory();

    // Generate dynamic follow-up questions
    generateDynamicFollowupQuestions(data.advice, userQuestion);

    // Show follow-up section
    followupSection.classList.remove('hidden');

    // Show results container
    results.classList.remove('hidden');

    // Scroll to results
    results.scrollIntoView({ behavior: 'smooth' });
}

function setLoading(loading) {
    isProcessing = loading;
    
    if (loading) {
        submitText.textContent = 'Processing...';
        submitSpinner.classList.remove('hidden');
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-75', 'cursor-not-allowed');
    } else {
        submitText.textContent = 'Get Parenting Support';
        submitSpinner.classList.add('hidden');
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-75', 'cursor-not-allowed');
    }
}

function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.remove('hidden');
    errorMessage.scrollIntoView({ behavior: 'smooth' });
}

function hideError() {
    errorMessage.classList.add('hidden');
}

async function handleFollowup() {
    const question = followupText.value.trim();
    if (!question) {
        showError('Please enter a follow-up question');
        return;
    }

    setFollowupLoading(true);
    hideError();

    try {
        await analyzeInput(question);
        followupText.value = '';
    } catch (error) {
        showError('Follow-up failed: ' + error.message);
    } finally {
        setFollowupLoading(false);
    }
}

function updateConversationHistory() {
    conversationHistory.innerHTML = '';
    
    conversationMessages.forEach((msg, index) => {
        // User question
        const userDiv = document.createElement('div');
        userDiv.className = 'bg-blue-50 border-l-4 border-blue-400 p-3 rounded';
        userDiv.innerHTML = `<p class="text-sm text-gray-600 mb-1">You asked:</p><p class="text-gray-800">${msg.question}</p>`;
        conversationHistory.appendChild(userDiv);
        
        // AI response
        const aiDiv = document.createElement('div');
        aiDiv.className = 'bg-green-50 border-l-4 border-green-400 p-3 rounded';
        aiDiv.innerHTML = `<p class="text-sm text-gray-600 mb-1">ParentPulse Coach:</p><p class="text-gray-800">${msg.response}</p>`;
        conversationHistory.appendChild(aiDiv);
    });
    
    // Scroll to bottom of conversation
    conversationHistory.scrollTop = conversationHistory.scrollHeight;
}

function setFollowupLoading(loading) {
    if (loading) {
        followupBtnText.textContent = 'Asking...';
        followupSpinner.classList.remove('hidden');
        followupBtn.disabled = true;
        followupBtn.classList.add('opacity-75', 'cursor-not-allowed');
    } else {
        followupBtnText.textContent = 'Ask';
        followupSpinner.classList.add('hidden');
        followupBtn.disabled = false;
        followupBtn.classList.remove('opacity-75', 'cursor-not-allowed');
    }
}

function generateDynamicFollowupQuestions(advice, userQuestion) {
    const followupContainer = document.getElementById('quick-followup-buttons');
    followupContainer.innerHTML = '';
    
    // Analyze the advice content to generate relevant follow-up questions
    const adviceLower = advice.toLowerCase();
    const questionLower = userQuestion.toLowerCase();
    
    let followupQuestions = [];
    
    // Default questions that work for most scenarios
    const defaultQuestions = [
        "What if that doesn't work?",
        "Can you give me another approach?",
        "How do I stay consistent?"
    ];
    
    // Context-specific questions based on advice content
    if (adviceLower.includes('say') || adviceLower.includes('tell') || adviceLower.includes('phrase')) {
        followupQuestions.push("What if they don't respond well to those words?");
        followupQuestions.push("How should I adjust my tone?");
    }
    
    if (adviceLower.includes('routine') || adviceLower.includes('schedule') || adviceLower.includes('consistent')) {
        followupQuestions.push("How long before I see results?");
        followupQuestions.push("What if we miss a day?");
    }
    
    if (adviceLower.includes('timeout') || adviceLower.includes('consequence') || adviceLower.includes('discipline')) {
        followupQuestions.push("How do I handle resistance?");
        followupQuestions.push("What if they escalate?");
    }
    
    if (adviceLower.includes('calm') || adviceLower.includes('breathe') || adviceLower.includes('patience')) {
        followupQuestions.push("What if I lose my temper?");
        followupQuestions.push("How do I reset after a bad moment?");
    }
    
    if (adviceLower.includes('explain') || adviceLower.includes('talk') || adviceLower.includes('discuss')) {
        followupQuestions.push("What if they're too young to understand?");
        followupQuestions.push("How do I simplify this for them?");
    }
    
    if (adviceLower.includes('bedtime') || adviceLower.includes('sleep') || adviceLower.includes('nap')) {
        followupQuestions.push("What about weekend schedules?");
        followupQuestions.push("How do I handle sleep regression?");
    }
    
    if (adviceLower.includes('tantrum') || adviceLower.includes('meltdown') || adviceLower.includes('crying')) {
        followupQuestions.push("What if it happens in public?");
        followupQuestions.push("How long should I wait it out?");
    }
    
    // Age-specific questions
    const childAge = parseInt(ageSlider.value);
    if (childAge <= 3) {
        followupQuestions.push("Is this normal for their age?");
    } else if (childAge >= 4 && childAge <= 8) {
        followupQuestions.push("How do I involve them in the solution?");
    } else if (childAge >= 9) {
        followupQuestions.push("Should I give them more independence?");
    }
    
    // Emotion-based questions
    if (questionLower.includes('frustrated') || questionLower.includes('angry')) {
        followupQuestions.push("How do I manage my own emotions?");
    }
    
    if (questionLower.includes('worried') || questionLower.includes('concerned')) {
        followupQuestions.push("When should I be concerned?");
    }
    
    // Remove duplicates and limit to 3-4 questions
    followupQuestions = [...new Set(followupQuestions)];
    
    // If we don't have enough specific questions, add defaults
    if (followupQuestions.length < 3) {
        defaultQuestions.forEach(q => {
            if (!followupQuestions.includes(q) && followupQuestions.length < 4) {
                followupQuestions.push(q);
            }
        });
    }
    
    // Limit to 4 questions max
    followupQuestions = followupQuestions.slice(0, 4);
    
    // Create buttons
    followupQuestions.forEach(question => {
        const button = document.createElement('button');
        button.className = 'quick-followup-btn bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 px-4 py-2 rounded-full text-sm transition-all duration-200 hover:shadow-md transform hover:scale-105';
        button.textContent = question;
        followupContainer.appendChild(button);
    });
}

function hideResults() {
    results.classList.add('hidden');
    transcriptionResult.classList.add('hidden');
    emotionResult.classList.add('hidden');
    adviceResult.classList.add('hidden');
    followupSection.classList.add('hidden');
    conversationMessages = [];
    conversationHistory.innerHTML = '';
    document.getElementById('quick-followup-buttons').innerHTML = '';
}
