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
                file: file
            };
            
            imagePreview.innerHTML = `<img src="${uploadedImage.src}" alt="Podgląd przesłanego zdjęcia">`;
            previewContainer.style.display = 'block';
            
            showStatus('Zdjęcie zostało przesłane pomyślnie!', 'success');
            
            if (promptInput.value === '') {
                const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                promptInput.value = `Animacja przedstawiająca ${fileNameWithoutExt.replace(/[_-]/g, ' ')} w ruchu.`;
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
            showStatus('Proszę wpisać prompt opisujący akcję na wideo!', 'error');
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
            showStatus('Wysyłam żądanie do serwera...', 'info');
            
            const videoData = await generateVideoWithAPI(promptInput.value.trim(), uploadedImage.src);
            
            updateProgress(70);
            showStatus('Otrzymano ID wideo, sprawdzam status...', 'info');
            
            // Rozpocznij sprawdzanie statusu
            await pollVideoStatus(videoData.video_id);
            
        } catch (error) {
            console.error('Błąd podczas generowania:', error);
            showStatus(`Błąd: ${error.message}`, 'error');
            resetGenerationState();
        }
    }
    
    // Generuj wideo przez Twój backend
    async function generateVideoWithAPI(prompt, imageData) {
        const requestData = {
            imageData: imageData,
            prompt: prompt,
            duration: parseInt(durationSlider.value),
            motion: parseInt(motionSlider.value),
            style: styleSelect.value
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
            
            const result = await response.json();
            return result;
            
        } catch (error) {
            console.error('Błąd komunikacji z backendem:', error);
            throw new Error('Nie udało się połączyć z serwerem.');
        }
    }
    
    // Sprawdzanie statusu wideo
    async function pollVideoStatus(videoId) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 60; // Maksymalnie 5 minut (60 * 5 sekund)
            
            statusCheckInterval = setInterval(async () => {
                attempts++;
                
                try {
                    const response = await fetch(`${BACKEND_URL}/api/status/${videoId}`);
                    
                    if (!response.ok) {
                        clearInterval(statusCheckInterval);
                        reject(new Error('Błąd sprawdzania statusu.'));
                        return;
                    }
                    
                    const statusData = await response.json();
                    
                    // Aktualizuj postęp na podstawie statusu
                    if (statusData.status === 'processing') {
                        const progress = 70 + Math.min(20, (attempts / maxAttempts) * 20);
                        updateProgress(progress);
                        showStatus(`Przetwarzanie wideo... (próba ${attempts}/${maxAttempts})`, 'info');
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
                            videoId: videoId
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
                        reject(new Error('Generowanie wideo nie powiodło się.'));
                    }
                    
                    // Przekroczono limit prób
                    if (attempts >= maxAttempts) {
                        clearInterval(statusCheckInterval);
                        reject(new Error('Przekroczono czas oczekiwania na wideo.'));
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
                <video controls autoplay style="width:100%; border-radius:10px;">
                    <source src="${videoUrl}" type="video/mp4">
                    Twoja przeglądarka nie obsługuje wideo.
                </video>
                <p style="text-align: center; margin-top: 10px; color: #a5b4fc;">
                    <i class="fas fa-check-circle"></i> Wideo gotowe do pobrania
                </p>
            </div>
        `;
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
            link.download = `ai-wideo-${generatedVideo.id}.mp4`;
            link.target = '_blank';
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
                    text: `Wygenerowano z promptu: ${generatedVideo.prompt.substring(0, 100)}...`,
                    url: generatedVideo.url,
                })
                .then(() => showStatus('Wideo udostępnione pomyślnie!', 'success'))
                .catch(error => showStatus('Udostępnianie nie powiodło się.', 'error'));
            } else {
                navigator.clipboard.writeText(generatedVideo.url)
                    .then(() => showStatus('Link do wideo skopiowany do schowka!', 'success'))
                    .catch(() => showStatus('Nie udało się skopiować linku.', 'error'));
            }
        }
    });
    
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
        
        showStatus('Wprowadź dane i kliknij "Generuj Wideo"', 'info');
        
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
            historyHTML += `
                <div class="history-item">
                    <div class="history-thumbnail">
                        <i class="fas fa-video"></i>
                    </div>
                    <div class="history-details">
                        <h4>${video.prompt.substring(0, 40)}${video.prompt.length > 40 ? '...' : ''}</h4>
                        <p>${video.duration}s • ${video.style} • ${video.timestamp}</p>
                        <p style="color: #4cc9f0; font-size: 0.7rem; margin-top: 3px;">
                            <i class="fas fa-server"></i> HeyGen API
                        </p>
                    </div>
                </div>
            `;
        });
        
        historyList.innerHTML = historyHTML;
    }
    
    // Przykładowe dane historii (do celów demonstracyjnych)
    generationHistory = [
        {
            id: 1,
            prompt: "Postać idzie przez magiczny las",
            duration: "8",
            style: "Fantasy",
            timestamp: "2023-10-15 14:30"
        },
        {
            id: 2,
            prompt: "Animacja kota tańczącego w deszczu",
            duration: "5",
            style: "Animowany",
            timestamp: "2023-10-14 11:22"
        }
    ];
    
    // Inicjalizacja historii
    updateHistoryList();
    
    console.log("AI Video Generator został załadowany. Backend URL:", BACKEND_URL);
});
