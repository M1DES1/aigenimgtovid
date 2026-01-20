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
    const historyList = document.getElementById('historyList');
    
    // URL Twojego backendu
    const BACKEND_URL = 'https://aigenimgtovid.onrender.com';
    
    // Zmienne stanu
    let uploadedImage = null;
    let generatedVideo = null;
    let generationHistory = [];
    let currentGenerationId = null;
    let statusCheckInterval = null;
    
    // Prawidłowe głosy (muszą się zgadzać z backendem)
    const VOICE_MAP = {
        'realistic': 'female_en',
        'cartoon': 'female_en',
        'anime': 'female_en',
        'fantasy': 'male_en',
        'cyberpunk': 'male_en'
    };
    
    // Inicjalizacja
    initEventListeners();
    showStatus('Aplikacja gotowa. Prześlij zdjęcie i wpisz tekst!', 'info');
    
    function initEventListeners() {
        selectFileBtn.addEventListener('click', () => imageInput.click());
        uploadArea.addEventListener('click', () => imageInput.click());
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#4cc9f0';
            uploadArea.style.background = 'rgba(76, 201, 240, 0.1)';
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = '#4361ee';
            uploadArea.style.background = 'rgba(67, 97, 238, 0.05)';
        });
        
        uploadArea.addEventListener('drop', handleDrop);
        imageInput.addEventListener('change', handleFileSelect);
        durationSlider.addEventListener('input', updateDuration);
        motionSlider.addEventListener('input', updateMotion);
        generateBtn.addEventListener('click', handleGenerate);
        downloadBtn.addEventListener('click', handleDownload);
        shareBtn.addEventListener('click', handleShare);
        newBtn.addEventListener('click', handleNewVideo);
    }
    
    function handleDrop(e) {
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
    }
    
    function handleFileSelect(e) {
        if (e.target.files.length) {
            const file = e.target.files[0];
            handleImageUpload(file);
        }
    }
    
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
                size: (file.size / (1024*1024)).toFixed(2) + ' MB'
            };
            
            imagePreview.innerHTML = `<img src="${uploadedImage.src}" alt="Podgląd">`;
            previewContainer.style.display = 'block';
            
            showStatus('Zdjęcie przesłane!', 'success');
            
            if (promptInput.value === '') {
                const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                promptInput.value = `Cześć! Jestem ${fileNameWithoutExt.replace(/[_-]/g, ' ')}.`;
            }
        };
        reader.readAsDataURL(file);
    }
    
    function updateDuration() {
        durationValue.textContent = `${this.value} s`;
    }
    
    function updateMotion() {
        motionValue.textContent = this.value;
    }
    
    function handleGenerate() {
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
    }
    
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
            showStatus('Rozpoczynam generowanie...', 'info');
            
            // UŻYJ POPRAWNYCH DANYCH DLA BACKENDU
            const videoData = await generateVideoWithAPI(
                promptInput.value.trim(),
                styleSelect.value
            );
            
            updateProgress(40);
            showStatus(`Wideo w kolejce. ID: ${videoData.video_id}`, 'success');
            
            await pollVideoStatus(videoData.video_id);
            
        } catch (error) {
            console.error('Błąd podczas generowania:', error);
            showStatus(`Błąd: ${error.message}`, 'error');
            resetGenerationState();
        }
    }
    
    // POPRAWIONA FUNKCJA - wysyła tylko dane zgodne z backendem
    async function generateVideoWithAPI(prompt, style) {
        // TYLKO dane zgodne z backendem HeyGen
        const requestData = {
            prompt: prompt,
            avatarId: "Abigail_expressive_2024112501", // Użyj stałego awatara
            voiceId: VOICE_MAP[style] || 'female_en',  // Użyj mapowania głosów
            dimension: "portrait"
        };
        
        try {
            const response = await fetch(`${BACKEND_URL}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Błąd serwera: ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('Błąd komunikacji z backendem:', error);
            throw new Error('Nie udało się połączyć z serwerem.');
        }
    }
    
    async function pollVideoStatus(videoId) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 120;
            
            statusCheckInterval = setInterval(async () => {
                attempts++;
                
                try {
                    const response = await fetch(`${BACKEND_URL}/api/status/${videoId}`);
                    
                    if (!response.ok) {
                        throw new Error(`Błąd HTTP: ${response.status}`);
                    }
                    
                    const statusData = await response.json();
                    
                    if (statusData.status === 'processing' || statusData.status === 'pending') {
                        const progress = 40 + Math.min(55, (attempts / maxAttempts) * 55);
                        updateProgress(progress);
                        showStatus(`Przetwarzanie... (${attempts}/${maxAttempts})`, 'info');
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
                        
                        displayGeneratedVideo(statusData.video_url);
                        addToHistory(generatedVideo);
                        
                        downloadBtn.disabled = false;
                        shareBtn.disabled = false;
                        
                        showStatus('Wideo gotowe!', 'success');
                        resolve();
                    }
                    else if (statusData.status === 'failed') {
                        clearInterval(statusCheckInterval);
                        reject(new Error('Generowanie nie powiodło się'));
                    }
                    
                    if (attempts >= maxAttempts) {
                        clearInterval(statusCheckInterval);
                        reject(new Error('Przekroczono czas oczekiwania'));
                    }
                    
                } catch (error) {
                    clearInterval(statusCheckInterval);
                    reject(error);
                }
            }, 5000);
        });
    }
    
    function displayGeneratedVideo(videoUrl) {
        videoOutput.innerHTML = `
            <div class="video-container">
                <video controls autoplay style="width:100%; border-radius:10px; max-height:500px;">
                    <source src="${videoUrl}" type="video/mp4">
                    Twoja przeglądarka nie obsługuje wideo.
                </video>
                <div style="text-align: center; margin-top: 10px; color: #a5b4fc;">
                    <i class="fas fa-check-circle"></i> Wideo gotowe!
                </div>
            </div>
        `;
        
        const videoElement = videoOutput.querySelector('video');
        if (videoElement) {
            videoElement.play().catch(e => console.log('Autoplay blocked'));
        }
    }
    
    function updateProgress(percent) {
        progressBar.style.width = `${percent}%`;
        progressText.textContent = `${Math.round(percent)}%`;
    }
    
    function resetGenerationState() {
        if (statusCheckInterval) clearInterval(statusCheckInterval);
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-magic"></i> Generuj Wideo';
        generateBtn.classList.remove('generating');
        progressContainer.style.display = 'none';
    }
    
    function handleDownload() {
        if (generatedVideo && generatedVideo.url) {
            const link = document.createElement('a');
            link.href = generatedVideo.url;
            link.download = `ai-video-${generatedVideo.id}.mp4`;
            link.target = '_blank';
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showStatus('Pobieranie rozpoczęte!', 'success');
        }
    }
    
    function handleShare() {
        if (generatedVideo && generatedVideo.url) {
            if (navigator.share) {
                navigator.share({
                    title: 'Moje wideo AI',
                    text: generatedVideo.prompt.substring(0, 100),
                    url: generatedVideo.url,
                })
                .then(() => showStatus('Udostępniono!', 'success'))
                .catch(() => copyToClipboard(generatedVideo.url));
            } else {
                copyToClipboard(generatedVideo.url);
            }
        }
    }
    
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text)
            .then(() => showStatus('Link skopiowany!', 'success'))
            .catch(() => {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                showStatus('Link skopiowany!', 'success');
            });
    }
    
    function handleNewVideo() {
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
        
        downloadBtn.disabled = true;
        shareBtn.disabled = true;
        
        showStatus('Gotowy do generowania nowego wideo!', 'info');
        
        document.querySelector('.input-panel').scrollIntoView({ behavior: 'smooth' });
    }
    
    function showStatus(message, type = 'info') {
        let icon = 'info-circle';
        let color = '#4361ee';
        
        switch(type) {
            case 'success': icon = 'check-circle'; color = '#4ade80'; break;
            case 'error': icon = 'exclamation-circle'; color = '#f87171'; break;
            case 'warning': icon = 'exclamation-triangle'; color = '#fbbf24'; break;
        }
        
        statusMessage.innerHTML = `<p><i class="fas fa-${icon}" style="color:${color}; margin-right:8px;"></i> ${message}</p>`;
    }
    
    function addToHistory(video) {
        generationHistory.unshift(video);
        if (generationHistory.length > 5) generationHistory.pop();
        updateHistoryList();
    }
    
    function updateHistoryList() {
        if (generationHistory.length === 0) {
            historyList.innerHTML = '<p class="empty-history">Brak historii</p>';
            return;
        }
        
        let historyHTML = '';
        generationHistory.forEach(video => {
            historyHTML += `
                <div class="history-item" onclick="playHistoryVideo('${video.url}')" style="cursor:pointer;">
                    <div class="history-thumbnail">
                        ${video.thumbnail ? 
                            `<img src="${video.thumbnail}" alt="Miniatura" style="width:100%;height:100%;object-fit:cover;border-radius:5px;">` : 
                            `<i class="fas fa-video"></i>`}
                    </div>
                    <div class="history-details">
                        <h4>${video.prompt.substring(0, 40)}${video.prompt.length > 40 ? '...' : ''}</h4>
                        <p>${video.duration}s • ${video.style} • ${video.timestamp}</p>
                    </div>
                </div>
            `;
        });
        
        historyList.innerHTML = historyHTML;
    }
    
    window.playHistoryVideo = function(url) {
        if (url) {
            videoOutput.innerHTML = `
                <div class="video-container">
                    <video controls autoplay style="width:100%; border-radius:10px; max-height:500px;">
                        <source src="${url}" type="video/mp4">
                    </video>
                </div>
            `;
            showStatus('Odtwarzanie wideo z historii...', 'info');
        }
    };
    
    // Inicjalizacja historii
    generationHistory = [];
    updateHistoryList();
    
    console.log("AI Video Generator załadowany. Backend:", BACKEND_URL);
});
