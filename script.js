document.addEventListener('DOMContentLoaded', function() {
    // Elementy DOM
    const imageInput = document.getElementById('imageInput');
    const selectFileBtn = document.getElementById('selectFileBtn');
    const uploadArea = document.getElementById('uploadArea');
    const imagePreview = document.getElementById('imagePreview');
    const previewContainer = document.getElementById('previewContainer');
    const promptInput = document.getElementById('promptInput');
    const durationSlider = document.getElementById('duration');
    const durationValue = document.getElementById('durationValue');
    const motionSlider = document.getElementById('motion');
    const motionValue = document.getElementById('motionValue');
    const styleSelect = document.getElementById('style');
    const generateBtn = document.getElementById('generateBtn');
    const statusMessage = document.getElementById('statusMessage');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const videoOutput = document.getElementById('videoOutput');
    const videoInfo = document.getElementById('videoInfo');
    const downloadBtn = document.getElementById('downloadBtn');
    const shareBtn = document.getElementById('shareBtn');
    const newBtn = document.getElementById('newBtn');
    const actionButtons = document.getElementById('actionButtons');
    const historyList = document.getElementById('historyList');
    
    // URL Twojego backendu na Render
    const BACKEND_URL = 'https://aigenimgtovid.onrender.com';
    
    // Zmienne stanu aplikacji
    let uploadedImage = null;
    let generatedVideo = null;
    let generationHistory = [];
    let currentGenerationId = null;
    let statusCheckInterval = null;
    
    // Obsługa wybierania pliku
    selectFileBtn.addEventListener('click', () => {
        imageInput.click();
    });
    
    uploadArea.addEventListener('click', () => {
        imageInput.click();
    });
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#4cc9f0';
        uploadArea.style.background = 'rgba(76, 201, 240, 0.1)';
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#4361ee';
        uploadArea.style.background = 'rgba(67, 97, 238, 0.05)';
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#4361ee';
        uploadArea.style.background = 'rgba(67, 97, 238, 0.05)';
        
        if (e.dataTransfer.files.length) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                handleImageUpload(file);
            } else {
                showStatus('Proszę wybrać plik obrazu (JPG, PNG, WebP)', 'error');
            }
        }
    });
    
    imageInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            const file = e.target.files[0];
            handleImageUpload(file);
        }
    });
    
    // Funkcja do obsługi przesłanego obrazu
    function handleImageUpload(file) {
        if (file.size > 5 * 1024 * 1024) {
            showStatus('Plik jest zbyt duży. Maksymalny rozmiar to 5MB.', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            uploadedImage = {
                src: e.target.result,
                name: file.name,
                size: (file.size / (1024*1024)).toFixed(2) + ' MB',
                file: file,
                base64: e.target.result.split(',')[1] // Tylko dane base64 bez nagłówka
            };
            
            imagePreview.innerHTML = `<img src="${uploadedImage.src}" alt="Podgląd przesłanego zdjęcia">`;
            previewContainer.style.display = 'block';
            
            showStatus('Zdjęcie zostało przesłane pomyślnie!', 'success');
            
            if (promptInput.value === '') {
                const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                promptInput.value = `Cześć! Jestem ${fileNameWithoutExt.replace(/[_-]/g, ' ')}.`;
            }
        };
        reader.readAsDataURL(file);
    }
    
    // Aktualizacja wartości suwaków
    durationSlider.addEventListener('input', function() {
        durationValue.textContent = `${this.value} s`;
    });
    
    motionSlider.addEventListener('input', function() {
        motionValue.textContent = this.value;
    });
    
    // Obsługa generowania wideo
    generateBtn.addEventListener('click', function() {
        if (!uploadedImage) {
            showStatus('Proszę najpierw przesłać zdjęcie!', 'error');
            return;
        }
        
        if (!promptInput.value.trim()) {
            showStatus('Proszę wpisać tekst, który ma wypowiedzieć postać!', 'error');
            promptInput.focus();
            return;
        }
        
        startGeneration();
    });
    
    // Funkcja rozpoczynająca generowanie wideo
    async function startGeneration() {
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generowanie...';
        generateBtn.classList.add('generating');
        
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressText.textContent = '0%';
        
        videoOutput.innerHTML = `
            <div class="video-placeholder">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Trwa generowanie wideo...</p>
            </div>
        `;
        
        currentGenerationId = Date.now();
        
        try {
            updateProgress(10);
            showStatus('Rozpoczynam tworzenie awatara...', 'info');
            
            // Sprawdź czy mamy aktywne API HeyGen
            const testResponse = await fetch(`${BACKEND_URL}/api/test`);
            const testData = await testResponse.json();
            
            if (!testData.success) {
                throw new Error('Błąd połączenia z HeyGen API. Sprawdź klucz API.');
            }
            
            updateProgress(20);
            showStatus('Wysyłam żądanie generowania wideo...', 'info');
            
            // 1. SPRÓBUJ UŻYĆ AVATAR Z DODANYCH ZDJĘCIEM
            const videoData = await generateVideoWithCustomAvatar();
            
            if (videoData && videoData.video_id) {
                // Kontynuuj ze sprawdzaniem statusu
                updateProgress(40);
                showStatus('Rozpoczęto generowanie wideo. ID: ' + videoData.video_id, 'success');
                
                // Rozpocznij sprawdzanie statusu
                await pollVideoStatus(videoData.video_id);
            } else {
                // Jeśli nie udało się, użyj DEMO z awatarem
                await useDemoAvatarFallback();
            }
            
        } catch (error) {
            console.error('Błąd podczas generowania:', error);
            
            // Próbuj użyć fallback demo
            try {
                showStatus('Używam awatara demo...', 'warning');
                await useDemoAvatarFallback();
            } catch (fallbackError) {
                showStatus(`Błąd: ${error.message}`, 'error');
                resetGenerationState();
            }
        }
    }
    
    // Opcja 1: Spróbuj użyć awatara z przesłanym zdjęciem
    async function generateVideoWithCustomAvatar() {
        try {
            const requestData = {
                prompt: promptInput.value.trim(),
                // Użyj awatara, który obsługuje zdjęcia (jeśli taki masz)
                avatarId: "video_avatar_001", // To może wymagać specjalnej subskrypcji
                voiceId: getVoiceFromStyle(styleSelect.value),
                dimension: "portrait"
            };
            
            const response = await fetch(`${BACKEND_URL}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                throw new Error(`Błąd serwera: ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.warn('Nie udało się użyć custom avatar:', error.message);
            return null;
        }
    }
    
    // Opcja 2: Użyj gotowego awatara jako fallback
    async function useDemoAvatarFallback() {
        updateProgress(50);
        showStatus('Używam awatara demo Abigail...', 'info');
        
        const requestData = {
            prompt: promptInput.value.trim(),
            avatarId: "Abigail_expressive_2024112501", // Awatar z Twojej listy
            voiceId: getVoiceFromStyle(styleSelect.value),
            dimension: "portrait",
            testMode: true
        };
        
        const response = await fetch(`${BACKEND_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Błąd: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.video_id) {
            updateProgress(70);
            await pollVideoStatus(result.video_id);
        } else {
            throw new Error('Nie otrzymano video_id z serwera');
        }
    }
    
    // Funkcja mapująca styl na głos
    function getVoiceFromStyle(style) {
        const voiceMap = {
            'realistic': 'Rachel',
            'cartoon': 'Sarah',
            'anime': 'Emma',
            'fantasy': 'David',
            'cyberpunk': 'Ethan'
        };
        return voiceMap[style] || 'Rachel';
    }
    
    // Sprawdzanie statusu wideo
    async function pollVideoStatus(videoId) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 120; // Maksymalnie 10 minut (120 * 5 sekund)
            
            statusCheckInterval = setInterval(async () => {
                attempts++;
                
                try {
                    const response = await fetch(`${BACKEND_URL}/api/status/${videoId}`);
                    
                    if (!response.ok) {
                        throw new Error(`Błąd HTTP: ${response.status}`);
                    }
                    
                    const statusData = await response.json();
                    
                    if (!statusData.success && statusData.error) {
                        throw new Error(statusData.error);
                    }
                    
                    // Aktualizuj postęp
                    if (statusData.status === 'processing' || statusData.status === 'pending') {
                        const progress = 70 + Math.min(25, (attempts / maxAttempts) * 25);
                        updateProgress(progress);
                        showStatus(`Przetwarzanie wideo... (${attempts}/${maxAttempts})`, 'info');
                    }
                    else if (statusData.status === 'completed') {
                        clearInterval(statusCheckInterval);
                        updateProgress(100);
                        
                        generatedVideo = {
                            id: currentGenerationId,
                            url: statusData.video_url,
                            prompt: promptInput.value.trim(),
                            duration: durationSlider.value,
                            style: styleSelect.options[styleSelect.selectedIndex].text,
                            timestamp: new Date().toLocaleString(),
                            videoId: videoId,
                            thumbnail: statusData.thumbnail_url
                        };
                        
                        // Wyświetl wideo
                        displayGeneratedVideo(statusData.video_url);
                        
                        // Dodaj do historii
                        addToHistory(generatedVideo);
                        
                        // Aktywuj przyciski
                        downloadBtn.disabled = false;
                        shareBtn.disabled = false;
                        
                        showStatus('Wideo zostało wygenerowane pomyślnie!', 'success');
                        resolve();
                    }
                    else if (statusData.status === 'failed') {
                        clearInterval(statusCheckInterval);
                        reject(new Error('Generowanie wideo nie powiodło się: ' + (statusData.error_message || 'Nieznany błąd')));
                    }
                    
                    // Przekroczono limit prób
                    if (attempts >= maxAttempts) {
                        clearInterval(statusCheckInterval);
                        reject(new Error('Przekroczono czas oczekiwania na wideo. Proszę spróbować ponownie.'));
                    }
                    
                } catch (error) {
                    clearInterval(statusCheckInterval);
                    reject(error);
                }
            }, 5000); // Sprawdzaj co 5 sekund
        });
    }
    
    // Wyświetl wygenerowane wideo
    function displayGeneratedVideo(videoUrl) {
        videoOutput.innerHTML = `
            <div class="video-container">
                <video controls autoplay style="width:100%; border-radius:10px; max-height:500px;">
                    <source src="${videoUrl}" type="video/mp4">
                    Twoja przeglądarka nie obsługuje wideo.
                </video>
                <div style="text-align: center; margin-top: 10px; color: #a5b4fc;">
                    <i class="fas fa-check-circle"></i> Wideo gotowe!
                    <p style="font-size: 0.8rem; margin-top: 5px; color: #94a3b8;">
                        Czas generowania: ${new Date().toLocaleTimeString()}
                    </p>
                </div>
            </div>
        `;
        
        // Automatycznie odtwarzaj wideo
        const videoElement = videoOutput.querySelector('video');
        if (videoElement) {
            videoElement.play().catch(e => console.log('Autoplay blocked:', e));
        }
    }
    
    // Aktualizuj postęp
    function updateProgress(percent) {
        progressBar.style.width = `${percent}%`;
        progressText.textContent = `${Math.round(percent)}%`;
    }
    
    // Resetuj stan generowania
    function resetGenerationState() {
        if (statusCheckInterval) clearInterval(statusCheckInterval);
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-magic"></i> Generuj Wideo';
        generateBtn.classList.remove('generating');
        progressContainer.style.display = 'none';
    }
    
    // Obsługa przycisku pobierania
    downloadBtn.addEventListener('click', function() {
        if (generatedVideo && generatedVideo.url) {
            const link = document.createElement('a');
            link.href = generatedVideo.url;
            link.download = `ai-video-${generatedVideo.id}.mp4`;
            link.target = '_blank';
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showStatus('Rozpoczęto pobieranie wideo!', 'success');
        }
    });
    
    // Obsługa przycisku udostępniania
    shareBtn.addEventListener('click', function() {
        if (generatedVideo && generatedVideo.url) {
            if (navigator.share) {
                navigator.share({
                    title: 'Moje wygenerowane wideo AI',
                    text: `"${generatedVideo.prompt.substring(0, 50)}..."`,
                    url: generatedVideo.url,
                })
                .then(() => showStatus('Wideo udostępnione!', 'success'))
                .catch(error => {
                    console.log('Share failed:', error);
                    copyToClipboard(generatedVideo.url);
                });
            } else {
                copyToClipboard(generatedVideo.url);
            }
        }
    });
    
    // Funkcja kopiowania do schowka
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text)
            .then(() => showStatus('Link skopiowany do schowka!', 'success'))
            .catch(() => {
                // Fallback dla starszych przeglądarek
                const textarea = document.createElement('textarea');
                textarea.value = text;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                showStatus('Link skopiowany!', 'success');
            });
    }
    
    // Obsługa przycisku nowego wideo
    newBtn.addEventListener('click', function() {
        if (statusCheckInterval) clearInterval(statusCheckInterval);
        
        promptInput.value = '';
        durationSlider.value = 10;
        durationValue.textContent = '10 s';
        motionSlider.value = 5;
        motionValue.textContent = '5';
        styleSelect.value = 'realistic';
        
        videoOutput.innerHTML = `
            <div class="video-placeholder">
                <i class="fas fa-video"></i>
                <p>Tutaj pojawi się wygenerowane wideo</p>
            </div>
        `;
        
        videoInfo.innerHTML = `
            <p><i class="fas fa-info-circle"></i> Po wygenerowaniu wideo będziesz mógł je pobrać lub udostępnić</p>
        `;
        
        downloadBtn.disabled = true;
        shareBtn.disabled = true;
        
        showStatus('Gotowy do generowania nowego wideo!', 'info');
        
        document.querySelector('.input-panel').scrollIntoView({ behavior: 'smooth' });
    });
    
    // Funkcja wyświetlania komunikatów statusu
    function showStatus(message, type = 'info') {
        let icon = 'info-circle';
        let color = '#4361ee';
        
        switch(type) {
            case 'success':
                icon = 'check-circle';
                color = '#4ade80';
                break;
            case 'error':
                icon = 'exclamation-circle';
                color = '#f87171';
                break;
            case 'warning':
                icon = 'exclamation-triangle';
                color = '#fbbf24';
                break;
        }
        
        statusMessage.innerHTML = `<p><i class="fas fa-${icon}" style="color:${color}; margin-right:8px;"></i> ${message}</p>`;
    }
    
    // Funkcja dodająca wideo do historii
    function addToHistory(video) {
        generationHistory.unshift(video);
        if (generationHistory.length > 5) {
            generationHistory.pop();
        }
        updateHistoryList();
    }
    
    // Funkcja aktualizująca listę historii
    function updateHistoryList() {
        if (generationHistory.length === 0) {
            historyList.innerHTML = '<p class="empty-history">Brak historii generowań</p>';
            return;
        }
        
        let historyHTML = '';
        generationHistory.forEach(video => {
            const shortPrompt = video.prompt.length > 40 ? 
                video.prompt.substring(0, 40) + '...' : video.prompt;
                
            historyHTML += `
                <div class="history-item" onclick="playHistoryVideo('${video.url}')" style="cursor:pointer;">
                    <div class="history-thumbnail">
                        ${video.thumbnail ? 
                            `<img src="${video.thumbnail}" alt="Miniatura" style="width:100%;height:100%;object-fit:cover;border-radius:5px;">` : 
                            `<i class="fas fa-video"></i>`}
                    </div>
                    <div class="history-details">
                        <h4 title="${video.prompt}">${shortPrompt}</h4>
                        <p>${video.duration}s • ${video.style} • ${video.timestamp}</p>
                        <p style="color: #4cc9f0; font-size: 0.7rem; margin-top: 3px;">
                            <i class="fas fa-server"></i> HeyGen AI
                        </p>
                    </div>
                </div>
            `;
        });
        
        historyList.innerHTML = historyHTML;
    }
    
    // Funkcja do odtwarzania wideo z historii
    window.playHistoryVideo = function(url) {
        if (url) {
            videoOutput.innerHTML = `
                <div class="video-container">
                    <video controls autoplay style="width:100%; border-radius:10px; max-height:500px;">
                        <source src="${url}" type="video/mp4">
                    </video>
                    <div style="text-align:center; margin-top:10px;">
                        <button onclick="location.reload()" class="btn-secondary" style="padding:5px 15px;">
                            <i class="fas fa-arrow-left"></i> Wróć
                        </button>
                    </div>
                </div>
            `;
            showStatus('Odtwarzanie wideo z historii...', 'info');
        }
    };
    
    // Przykładowe dane historii
    generationHistory = [];
    
    // Inicjalizacja
    updateHistoryList();
    showStatus('Aplikacja gotowa. Prześlij zdjęcie i wpisz tekst!', 'info');
    
    console.log("AI Video Generator został załadowany. Backend URL:", BACKEND_URL);
});
