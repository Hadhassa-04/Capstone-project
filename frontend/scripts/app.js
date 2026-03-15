const API_BASE_URL = 'http://localhost:5000/api';
let currentDocumentId = null;
let token = localStorage.getItem('token') || null;

// Auth DOM Elements
const authModal = document.getElementById('authModal');
const authForm = document.getElementById('authForm');
const authTitle = document.getElementById('authTitle');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authToggleBtn = document.getElementById('authToggleBtn');
const authError = document.getElementById('authError');
const mainAppContainer = document.getElementById('mainAppContainer');
const logoutBtn = document.getElementById('logoutBtn');
let isLoginMode = true;

// Sidebar Elements
const librarySidebar = document.getElementById('librarySidebar');
const documentList = document.getElementById('documentList');
const newDocBtn = document.getElementById('newDocBtn');

// DOM Elements
const uploadPanel = document.getElementById('uploadPanel');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const uploadProgress = document.getElementById('uploadProgress');
const progressBar = document.getElementById('progressBar');
const uploadStatusText = document.getElementById('uploadStatusText');
const dashboard = document.getElementById('dashboard');

// Tabs
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Actions & Content areas
const generateSummaryBtn = document.getElementById('generateSummaryBtn');
const summaryContent = document.getElementById('summaryContent');
const keyTopicsSection = document.getElementById('keyTopicsSection');
const topicsGrid = document.getElementById('topicsGrid');
const copySummaryBtn = document.getElementById('copySummaryBtn');
const downloadSummaryBtn = document.getElementById('downloadSummaryBtn');

const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const chatMessages = document.getElementById('chatMessages');

// Voice Chat Elements
const micBtn = document.getElementById('micBtn');
const toggleTTSBtn = document.getElementById('toggleTTSBtn');
let ttsEnabled = true;

const generateQuizBtn = document.getElementById('generateQuizBtn');
const quizContainer = document.getElementById('quizContainer');

// --- Initialization & Auth ---
function initApp() {
    if (token) {
        authModal.classList.add('hidden');
        mainAppContainer.classList.remove('hidden');
        loadDocuments();
    } else {
        authModal.classList.remove('hidden');
        mainAppContainer.classList.add('hidden');
    }
}

authToggleBtn.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    authTitle.innerText = isLoginMode ? 'Login to Synapse' : 'Sign up for Synapse';
    authSubmitBtn.innerText = isLoginMode ? 'Login' : 'Sign Up';
    authToggleBtn.innerText = isLoginMode ? 'Sign up' : 'Login';
    authError.classList.add('hidden');
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const endpoint = isLoginMode ? '/auth/login' : '/auth/register';

    try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: authEmail.value, password: authPassword.value })
        });

        const data = await res.json();

        if (res.ok) {
            token = data.token;
            localStorage.setItem('token', token);
            authModal.classList.add('hidden');
            mainAppContainer.classList.remove('hidden');
            loadDocuments();
        } else {
            authError.innerText = data.msg || 'Authentication failed';
            authError.classList.remove('hidden');
        }
    } catch (err) {
        authError.innerText = 'Server error. Please try again.';
        authError.classList.remove('hidden');
    }
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    token = null;
    currentDocumentId = null;
    authEmail.value = '';
    authPassword.value = '';

    // Reset UI state
    documentList.innerHTML = '';
    uploadPanel.classList.remove('hidden');
    dashboard.classList.add('hidden');
    librarySidebar.classList.add('hidden');

    authModal.classList.remove('hidden');
    mainAppContainer.classList.add('hidden');
});

// --- Sidebar / Documents ---
async function loadDocuments() {
    try {
        const res = await fetch(`${API_BASE_URL}/documents`, {
            headers: { 'x-auth-token': token }
        });
        const docs = await res.json();

        if (docs.length > 0) {
            librarySidebar.classList.remove('hidden');
            documentList.innerHTML = '';

            docs.forEach(doc => {
                const div = document.createElement('div');
                div.className = `doc-item ${doc._id === currentDocumentId ? 'active' : ''}`;
                div.innerHTML = `<i class="fa-solid fa-file-pdf"></i> <div class="doc-name" title="${doc.originalName}">${doc.originalName}</div>`;
                div.onclick = () => selectDocument(doc._id, div);
                documentList.appendChild(div);
            });

            if (!currentDocumentId) {
                // Auto-select first doc on initial load if none selected
                selectDocument(docs[0]._id, documentList.firstChild);
            }
        } else {
            librarySidebar.classList.add('hidden');
            uploadPanel.classList.remove('hidden');
            dashboard.classList.add('hidden');
        }
    } catch (err) {
        console.error('Failed to load documents', err);
    }
}

function selectDocument(id, element) {
    currentDocumentId = id;

    // Update active UI
    document.querySelectorAll('.doc-item').forEach(el => el.classList.remove('active'));
    if (element) element.classList.add('active');

    // Switch to dashboard view
    uploadPanel.classList.add('hidden');
    dashboard.classList.remove('hidden');

    // Reset contents
    summaryContent.innerHTML = '<div class="placeholder-text"><i class="fa-solid fa-file-waveform"></i><p>Click generate to summarize your notes</p></div>';
    keyTopicsSection.classList.add('hidden');
    copySummaryBtn.classList.add('hidden');
    downloadSummaryBtn.classList.add('hidden');

    chatMessages.innerHTML = `
        <div class="message ai-message">
            <div class="avatar"><i class="fa-solid fa-robot"></i></div>
            <div class="msg-bubble">Hello! I've loaded your document. What would you like to know?</div>
        </div>`;

    quizContainer.innerHTML = '<div class="placeholder-text"><i class="fa-solid fa-graduation-cap"></i><p>Generate a quiz to test your understanding</p></div>';

    // Ensure summary tab is active by default
    document.querySelector('[data-target="summary-view"]').click();
}

newDocBtn.addEventListener('click', () => {
    currentDocumentId = null;
    document.querySelectorAll('.doc-item').forEach(el => el.classList.remove('active'));
    uploadPanel.classList.remove('hidden');
    dashboard.classList.add('hidden');
});

// File Upload Logic
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
        handleFileUpload(e.dataTransfer.files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileUpload(e.target.files[0]);
    }
});

async function handleFileUpload(file) {
    if (file.type !== 'application/pdf') {
        alert('Please upload a PDF file.');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    // Update UI
    dropZone.classList.add('hidden');
    uploadProgress.classList.remove('hidden');
    uploadStatusText.innerText = `Uploading and analyzing: ${file.name}...`;

    try {
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            headers: { 'x-auth-token': token },
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            currentDocumentId = data.documentId;
            uploadStatusText.innerHTML = '<i class="fa-solid fa-check-circle" style="color: #3fb950;"></i> Document ready!';
            progressBar.style.width = '100%';
            progressBar.style.animation = 'none';

            setTimeout(() => {
                uploadPanel.classList.add('hidden');
                dashboard.classList.remove('hidden');
                loadDocuments();
            }, 1000);
        } else {
            throw new Error(data.error || 'Failed to upload');
        }
    } catch (error) {
        console.error(error);
        uploadStatusText.innerText = `Error: ${error.message}`;
        setTimeout(() => {
            uploadProgress.classList.add('hidden');
            dropZone.classList.remove('hidden');
        }, 3000);
    }
}

// Tab Switching Logic
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        // Add to clicked
        btn.classList.add('active');
        document.getElementById(btn.dataset.target).classList.add('active');
    });
});

// Generate Summary
generateSummaryBtn.addEventListener('click', async () => {
    if (!currentDocumentId) return;

    summaryContent.innerHTML = '<div class="placeholder-text"><i class="fa-solid fa-circle-notch fa-spin"></i><p>Generating summary...</p></div>';
    generateSummaryBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/summary/${currentDocumentId}`, {
            headers: { 'x-auth-token': token }
        });
        const data = await response.json();

        if (response.ok) {
            // Convert simple markdown bullet points to HTML lines
            const formattedSummary = data.summary
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/\n\n/g, '<br><br>')
                .replace(/\n- /g, '<br>• ');

            summaryContent.innerHTML = `<div class="summary-text">${formattedSummary}</div>`;

            // Show action buttons
            copySummaryBtn.classList.remove('hidden');
            downloadSummaryBtn.classList.remove('hidden');

            // Render Key Topics if available
            if (data.keyTopics && data.keyTopics.length > 0) {
                keyTopicsSection.classList.remove('hidden');
                topicsGrid.innerHTML = '';
                data.keyTopics.forEach(topic => {
                    topicsGrid.innerHTML += `
                        <div class="topic-card">
                            <h4>${topic.key}</h4>
                            <p>${topic.summary}</p>
                        </div>
                    `;
                });
            } else {
                keyTopicsSection.classList.add('hidden');
            }
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        summaryContent.innerHTML = `<div class="placeholder-text"><i class="fa-solid fa-circle-exclamation" style="color:#f85149;"></i><p>Error: ${error.message}</p></div>`;
    } finally {
        generateSummaryBtn.disabled = false;
        generateSummaryBtn.innerHTML = '<i class="fa-solid fa-check"></i> Generated';
    }
});

// Copy Summary Logic
copySummaryBtn.addEventListener('click', () => {
    const text = summaryContent.innerText;
    navigator.clipboard.writeText(text).then(() => {
        const originalHtml = copySummaryBtn.innerHTML;
        copySummaryBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
        copySummaryBtn.classList.add('success');
        
        setTimeout(() => {
            copySummaryBtn.innerHTML = originalHtml;
            copySummaryBtn.classList.remove('success');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
});

// Download Summary Logic
downloadSummaryBtn.addEventListener('click', () => {
    const text = summaryContent.innerText;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    // Get document name if possible
    const activeDoc = document.querySelector('.doc-item.active .doc-name');
    const fileName = activeDoc ? activeDoc.innerText.replace('.pdf', '') : 'document';
    
    a.href = url;
    a.download = `${fileName}_summary.txt`;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 0);
});

// Chat Logic
function addMessage(text, isUser = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;

    // Format bold markdown
    const formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    msgDiv.innerHTML = `
        <div class="avatar"><i class="fa-solid ${isUser ? 'fa-user' : 'fa-robot'}"></i></div>
        <div class="msg-bubble">${formattedText}</div>
    `;

    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

sendBtn.addEventListener('click', async () => {
    const question = chatInput.value.trim();
    if (!question || !currentDocumentId) return;

    // Add user message to UI
    addMessage(question, true);
    chatInput.value = '';
    chatInput.disabled = true;
    sendBtn.disabled = true;

    // Add loading message
    const loadingId = 'loading-' + Date.now();
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'message ai-message';
    loadingMsg.id = loadingId;
    loadingMsg.innerHTML = `<div class="avatar"><i class="fa-solid fa-robot"></i></div><div class="msg-bubble"><i class="fa-solid fa-ellipsis fa-fade"></i></div>`;
    chatMessages.appendChild(loadingMsg);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        const response = await fetch(`${API_BASE_URL}/chat/${currentDocumentId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify({ question })
        });

        const data = await response.json();

        document.getElementById(loadingId).remove();

        if (response.ok) {
            addMessage(data.answer);
            if (ttsEnabled) {
                speakText(data.answer);
            }
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        document.getElementById(loadingId).remove();
        addMessage(`Error: ${error.message}`);
    } finally {
        chatInput.disabled = false;
        sendBtn.disabled = false;
        chatInput.focus();
    }
});

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendBtn.click();
});

// Voice Logic
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';

    let isRecording = false;

    micBtn.addEventListener('click', () => {
        if (isRecording) {
            recognition.stop();
        } else {
            recognition.start();
        }
    });

    recognition.onstart = () => {
        isRecording = true;
        micBtn.classList.add('recording');
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        chatInput.value = transcript;
        sendBtn.click();
    };

    recognition.onend = () => {
        isRecording = false;
        micBtn.classList.remove('recording');
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        isRecording = false;
        micBtn.classList.remove('recording');
    };
} else {
    micBtn.style.display = 'none'; // Hide if not supported
}

toggleTTSBtn.addEventListener('click', () => {
    ttsEnabled = !ttsEnabled;
    toggleTTSBtn.innerHTML = ttsEnabled ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
    toggleTTSBtn.classList.toggle('active', ttsEnabled);
});

function speakText(text) {
    if ('speechSynthesis' in window) {
        // Strip out markdown bold/italic asterisks before speaking
        const cleanText = text.replace(/[*#]/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        // Optional: Pick a nice voice
        const voices = speechSynthesis.getVoices();
        if (voices.length > 0) {
            utterance.voice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) || voices[0];
        }
        speechSynthesis.speak(utterance);
    }
}

// Quiz Logic
generateQuizBtn.addEventListener('click', async () => {
    if (!currentDocumentId) return;

    quizContainer.innerHTML = '<div class="placeholder-text"><i class="fa-solid fa-circle-notch fa-spin"></i><p>Crafting your quiz...</p></div>';
    generateQuizBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/quiz/${currentDocumentId}`, {
            headers: { 'x-auth-token': token }
        });
        const data = await response.json();

        if (response.ok) {
            renderQuiz(data.quiz);
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        quizContainer.innerHTML = `<div class="placeholder-text"><i class="fa-solid fa-circle-exclamation" style="color:#f85149;"></i><p>Error: ${error.message}</p></div>`;
    } finally {
        generateQuizBtn.disabled = false;
        generateQuizBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Refresh Quiz';
    }
});

function renderQuiz(quizArray) {
    quizContainer.innerHTML = ''; // Clear container

    quizArray.forEach((q, index) => {
        const qDiv = document.createElement('div');
        qDiv.className = 'quiz-question';

        let optionsHtml = '';
        q.options.forEach(opt => {
            optionsHtml += `<button class="option-btn" data-correct="${opt === q.answer}">${opt}</button>`;
        });

        qDiv.innerHTML = `
            <h3>${index + 1}. ${q.question}</h3>
            <div class="options-grid">
                ${optionsHtml}
            </div>
        `;

        quizContainer.appendChild(qDiv);

        // Add event listeners to options for this specific question
        const optionBtns = qDiv.querySelectorAll('.option-btn');
        optionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // If already answered, do nothing
                if (qDiv.classList.contains('answered')) return;

                qDiv.classList.add('answered');
                const isCorrect = btn.dataset.correct === 'true';

                // Highlight clicked button
                btn.classList.add('selected');

                // Show result
                optionBtns.forEach(ob => {
                    if (ob.dataset.correct === 'true') {
                        ob.classList.add('correct');
                    } else if (ob.classList.contains('selected') && !isCorrect) {
                        ob.classList.add('incorrect');
                    }
                });
            });
        });
    });
}

// Start
initApp();
