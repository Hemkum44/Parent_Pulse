// DOM Elements
const ageSlider = document.getElementById('child-age');
const ageDisplay = document.getElementById('age-display');
const childTraits = document.getElementById('child-traits');
const tonePref = document.getElementById('tone-pref');
const inputModeRadios = document.querySelectorAll('input[name="input-mode"]');
const textInputSection = document.getElementById('text-input-section');
const voiceInputSection = document.getElementById('voice-input-section');
const audioInputSection = document.getElementById('audio-input-section');
const userText = document.getElementById('user-text');
const recordBtn = document.getElementById('record-btn');
const recordText = document.getElementById('record-text');
const recordingStatus = document.getElementById('recording-status');
const recordingTime = document.getElementById('recording-time');
const voiceStatus = document.getElementById('voice-status');
const audioFile = document.getElementById('audio-file');
const audioStatus = document.getElementById('audio-status');
const submitBtn = document.getElementById('submit-btn');
const submitText = document.getElementById('submit-text');
const submitSpinner = document.getElementById('submit-spinner');
const results = document.getElementById('results');
const transcriptionResult = document.getElementById('transcription-result');
const transcriptionText = document.getElementById('transcription-text');
const emotionResult = document.getElementById('emotion-result');
const emotionLabel = document.getElementById('emotion-label');
const emotionScore = document.getElementById('emotion-score');
const adviceResult = document.getElementById('advice-result');
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
let initialUserInput = '';
let childProfile = {};
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let recordingStartTime = 0;
let recordingTimer = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
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

    // Audio file upload
    audioFile.addEventListener('change', handleAudioUpload);

    // Voice recording button
    recordBtn.addEventListener('click', toggleRecording);

    // Submit button
    submitBtn.addEventListener('click', handleSubmit);

    // Follow-up button
    followupBtn.addEventListener('click', handleFollowup);

    // Quick follow-up buttons
    quickFollowupBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            followupText.value = this.textContent;
            handleFollowup();
        });
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

function updateInputMode() {
    const selectedMode = document.querySelector('input[name="input-mode"]:checked').value;
    
    textInputSection.classList.add('hidden');
    voiceInputSection.classList.add('hidden');
    audioInputSection.classList.add('hidden');
    
    if (selectedMode === 'text') {
        textInputSection.classList.remove('hidden');
    } else if (selectedMode === 'voice') {
        voiceInputSection.classList.remove('hidden');
    } else if (selectedMode === 'audio') {
        audioInputSection.classList.remove('hidden');
    }
    
    currentTranscription = '';
    hideResults();
}

// Voice Recording Functions
async function toggleRecording() {
    if (isRecording) {
        stopRecording();
    } else {
        await startRecording();
    }
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            await transcribeVoiceRecording(audioBlob);
            
            // Stop all tracks to release microphone
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        isRecording = true;
        recordingStartTime = Date.now();
        
        // Update UI
        recordBtn.classList.remove('bg-red-500', 'hover:bg-red-600');
        recordBtn.classList.add('bg-gray-500', 'hover:bg-gray-600');
        recordText.textContent = 'Stop Recording';
        recordingStatus.classList.remove('hidden');
        
        // Start timer
        recordingTimer = setInterval(updateRecordingTime, 100);
        
        showVoiceStatus('Recording started...', 'info');
        
    } catch (error) {
        console.error('Error accessing microphone:', error);
        showVoiceStatus('Error: Could not access microphone. Please check permissions.', 'error');
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        
        // Update UI
        recordBtn.classList.remove('bg-gray-500', 'hover:bg-gray-600');
        recordBtn.classList.add('bg-red-500', 'hover:bg-red-600');
        recordText.textContent = 'Start Recording';
        recordingStatus.classList.add('hidden');
        
        // Clear timer
        if (recordingTimer) {
            clearInterval(recordingTimer);
            recordingTimer = null;
        }
        
        showVoiceStatus('Processing recording...', 'info');
    }
}

function updateRecordingTime() {
    if (isRecording) {
        const elapsed = Date.now() - recordingStartTime;
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        recordingTime.textContent = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}

async function transcribeVoiceRecording(audioBlob) {
    try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.wav');
        
        const response = await fetch(`${API_BASE}/transcribe`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.transcription && data.transcription.trim()) {
            currentTranscription = data.transcription.trim();
            showVoiceStatus(`✅ Transcribed: "${currentTranscription}"`, 'success');
            
            // Show transcription result
            transcriptionText.textContent = currentTranscription;
            transcriptionResult.classList.remove('hidden');
            results.classList.remove('hidden');
        } else {
            showVoiceStatus('No speech detected. Please try recording again.', 'warning');
        }
        
    } catch (error) {
        console.error('Transcription error:', error);
        showVoiceStatus('Error transcribing audio. Please try again.', 'error');
    }
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

function handleAudioUpload() {
    const file = audioFile.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['audio/mp3', 'audio/wav', 'audio/m4a', 'audio/mpeg'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a)$/i)) {
        showError('Please upload a valid audio file (MP3, WAV, or M4A)');
        return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
        showError('File size must be less than 10MB');
        return;
    }

    showAudioStatus('Audio file selected: ' + file.name, 'success');
    transcribeAudio(file);
}

async function transcribeAudio(file) {
    showAudioStatus('Transcribing audio...', 'loading');
    
    const formData = new FormData();
    formData.append('audio', file);

    try {
        const response = await fetch(`${API_BASE}/transcribe`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Transcription failed');
        }

        currentTranscription = data.transcription;
        showAudioStatus('✅ Transcription complete!', 'success');
        showTranscription(currentTranscription);

    } catch (error) {
        showError('Transcription failed: ' + error.message);
        showAudioStatus('Transcription failed', 'error');
    }
}

function showAudioStatus(message, type) {
    audioStatus.classList.remove('hidden');
    audioStatus.className = 'mt-2 p-2 rounded text-sm';
    
    switch (type) {
        case 'loading':
            audioStatus.classList.add('bg-blue-100', 'text-blue-700');
            break;
        case 'success':
            audioStatus.classList.add('bg-green-100', 'text-green-700');
            break;
        case 'error':
            audioStatus.classList.add('bg-red-100', 'text-red-700');
            break;
    }
    
    audioStatus.textContent = message;
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
    } else if (selectedMode === 'voice' || selectedMode === 'audio') {
        if (!currentTranscription) {
            if (selectedMode === 'voice') {
                showError('Please record your voice first');
            } else {
                showError('Please upload and transcribe an audio file first');
            }
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
        initialUserInput = text;
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

function hideResults() {
    results.classList.add('hidden');
    transcriptionResult.classList.add('hidden');
    emotionResult.classList.add('hidden');
    adviceResult.classList.add('hidden');
    followupSection.classList.add('hidden');
    conversationMessages = [];
    conversationHistory.innerHTML = '';
}
