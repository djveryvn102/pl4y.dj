const STATE = {
    currentTrack: null,
    currentIndex: 0,
    isPlaying: false,
    isShuffled: false,
    repeatMode: 'off',
    currentTab: 'all',
    currentGenre: 'all',
    favorites: JSON.parse(localStorage.getItem('favorites')) || [],
    history: JSON.parse(localStorage.getItem('history')) || [],
    ratings: JSON.parse(localStorage.getItem('ratings')) || {},
    volume: parseInt(localStorage.getItem('volume')) || 70,
    lastPosition: JSON.parse(localStorage.getItem('lastPosition')) || {}
};

const musicData = {
    genres: [
        { id: 'all', name: 'Tất Cả', color: '#ff006e' },
        { id: 'edm', name: 'EDM', color: '#8338ec' },
        { id: 'house', name: 'House', color: '#3a86ff' },
        { id: 'techno', name: 'Techno', color: '#06ffa5' },
        { id: 'remix', name: 'Remix', color: '#fb5607' },
        { id: 'nonstop', name: 'Nonstop', color: '#ff006e' },
        { id: 'vinahouse', name: 'Vinahouse', color: '#e71d36' }
    ],
    defaultImages: {
        'edm': 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=300&h=300&fit=crop',
        'house': 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&h=300&fit=crop',
        'techno': 'https://images.unsplash.com/photo-1598387846055-da11e0d6f491?w=300&h=300&fit=crop',
        'remix': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop',
        'nonstop': 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
        'vinahouse': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop'
    },
    tracks: []
};

// Download queue management
const DOWNLOAD_QUEUE = {
    items: [],
    active: false
};

async function loadMusicData() {
    try {
        const response = await fetch('music-data.json');
        const data = await response.json();
        
        musicData.tracks = data.tracks.map((track, index) => ({
            id: track.id || index + 1,
            title: track.title,
            artist: track.artist,
            genre: track.genre.toLowerCase(),
            duration: track.duration,
            url: track.url,
            image: track.image || musicData.defaultImages[track.genre.toLowerCase()]
        }));

        initializePlayer();
    } catch (error) {
        console.error('Error loading music data:', error);
        showToast('⚠️ Không thể tải dữ liệu nhạc');
    }
}

function initializePlayer() {
    renderGenreButtons();
    renderPlaylist();
    setupEventListeners();
    setupKeyboardShortcuts();
    updatePlaylistCounter();
    
    const audio = document.getElementById('audioPlayer');
    audio.volume = STATE.volume / 100;
    document.getElementById('volumeSlider').value = STATE.volume;
}

function renderGenreButtons() {
    const container = document.getElementById('genreButtons');
    container.innerHTML = musicData.genres.map(genre => {
        const count = genre.id === 'all' 
            ? musicData.tracks.length 
            : musicData.tracks.filter(t => t.genre === genre.id).length;
        return `
            <button class="genre-btn ${genre.id === 'all' ? 'active' : ''}" 
                    data-genre="${genre.id}">
                ${genre.name}
                <span class="genre-count">${count}</span>
            </button>
        `;
    }).join('');

    document.querySelectorAll('.genre-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            STATE.currentGenre = btn.dataset.genre;
            renderPlaylist();
        });
    });
}

function renderPlaylist() {
    let tracks = getFilteredTracks();
    const container = document.getElementById('playlistSection');

    // Update search results info
    updateSearchResultsInfo(tracks.length);

    if (tracks.length === 0) {
        container.innerHTML = `
            <div class="no-tracks">
                <div class="no-tracks-icon">🎵</div>
                <p>Không tìm thấy bài hát nào</p>
            </div>
        `;
        updatePlaylistCounter();
        return;
    }

    container.innerHTML = tracks.map((track, index) => {
        const isActive = STATE.currentTrack && STATE.currentTrack.id === track.id;
        const isFavorited = STATE.favorites.includes(track.id);
        const rating = STATE.ratings[track.id] || 0;
        const genre = musicData.genres.find(g => g.id === track.genre);
        const playCount = STATE.history.filter(h => h.id === track.id).length;

        // Insert ad every 5 tracks on mobile/tablet
        const adInsert = (index > 0 && (index + 1) % 5 === 0) ? `
            <div class="ad-infeed">
                <div class="ad-container">
                    <div class="ad-label">Advertisement</div>
                    <div class="ad-placeholder-text">In-feed Ad 320x100</div>
                </div>
            </div>
        ` : '';

        return `
            ${adInsert}
            <div class="playlist-item ${isActive ? 'active' : ''}" 
                 data-index="${index}" 
                 data-track-id="${track.id}"
                 id="track-${track.id}">
                
                <!-- Hover Preview Tooltip -->
                <div class="track-preview-tooltip">
                    <img src="${track.image}" alt="${track.title}" class="tooltip-cover">
                    <div class="tooltip-title">${track.title}</div>
                    <div class="tooltip-artist">${track.artist}</div>
                    <div class="tooltip-info">
                        <div class="tooltip-info-item">
                            <div class="tooltip-info-label">Thời Gian</div>
                            <div class="tooltip-info-value">${track.duration}</div>
                        </div>
                        <div class="tooltip-info-item">
                            <div class="tooltip-info-label">Đánh Giá</div>
                            <div class="tooltip-info-value">${rating > 0 ? '⭐'.repeat(rating) : '-'}</div>
                        </div>
                        <div class="tooltip-info-item">
                            <div class="tooltip-info-label">Lượt Nghe</div>
                            <div class="tooltip-info-value">${playCount || 0}</div>
                        </div>
                    </div>
                </div>
                
                <div class="track-thumbnail">
                    <img src="${track.image}" alt="${track.title}" loading="lazy">
                </div>
                <div class="track-info">
                    <div class="track-title">${track.title}</div>
                    <div class="track-meta">
                        <div class="track-artist">${track.artist}</div>
                        <span class="track-genre-label" style="background: ${genre?.color}">${genre?.name}</span>
                    </div>
                </div>
                <div class="track-actions">
                    <div class="track-rating" data-track-id="${track.id}">
                        ${[1,2,3,4,5].map(star => 
                            `<span class="star ${star <= rating ? 'filled' : ''}" data-rating="${star}">⭐</span>`
                        ).join('')}
                    </div>
                    <button class="track-btn ${isFavorited ? 'liked' : ''}" 
                            onclick="toggleFavorite(${track.id})" 
                            title="Yêu thích">❤️</button>
                    <span class="track-duration">${track.duration}</span>
                    <button class="download-btn" 
                            onclick="downloadTrack(${track.id}, event)" 
                            data-status="ready"
                            title="Tải về">⬇️</button>
                </div>
            </div>
        `;
    }).join('');

    // Setup event listeners
    document.querySelectorAll('.playlist-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.track-btn') && 
                !e.target.closest('.download-btn') && 
                !e.target.closest('.star')) {
                const index = parseInt(item.dataset.index);
                playTrack(index);
            }
        });
    });

    document.querySelectorAll('.star').forEach(star => {
        star.addEventListener('click', (e) => {
            e.stopPropagation();
            const trackId = parseInt(star.closest('.track-rating').dataset.trackId);
            const rating = parseInt(star.dataset.rating);
            setRating(trackId, rating);
        });
    });

    updatePlaylistCounter();

    // Auto scroll to first search result
    if (document.getElementById('searchInput').value.trim()) {
        scrollToFirstResult();
    }
}

function getFilteredTracks() {
    let tracks = musicData.tracks;

    if (STATE.currentTab === 'favorites') {
        tracks = tracks.filter(t => STATE.favorites.includes(t.id));
    } else if (STATE.currentTab === 'history') {
        const historyIds = STATE.history.map(h => h.id);
        tracks = tracks.filter(t => historyIds.includes(t.id));
        tracks.sort((a, b) => {
            const aTime = STATE.history.find(h => h.id === a.id)?.timestamp || 0;
            const bTime = STATE.history.find(h => h.id === b.id)?.timestamp || 0;
            return bTime - aTime;
        });
    }

    if (STATE.currentGenre !== 'all') {
        tracks = tracks.filter(t => t.genre === STATE.currentGenre);
    }

    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm) {
        tracks = tracks.filter(t => 
            t.title.toLowerCase().includes(searchTerm) ||
            t.artist.toLowerCase().includes(searchTerm) ||
            t.genre.toLowerCase().includes(searchTerm)
        );
    }

    return tracks;
}

function playTrack(index) {
    const tracks = getFilteredTracks();
    if (index < 0 || index >= tracks.length) return;

    STATE.currentTrack = tracks[index];
    STATE.currentIndex = index;

    const audio = document.getElementById('audioPlayer');
    audio.src = STATE.currentTrack.url;

    if (STATE.lastPosition[STATE.currentTrack.id]) {
        audio.currentTime = STATE.lastPosition[STATE.currentTrack.id];
    }

    audio.play();
    STATE.isPlaying = true;

    updateNowPlaying();
    updatePlaylistUI();
    addToHistory(STATE.currentTrack.id);
}

function togglePlay() {
    const audio = document.getElementById('audioPlayer');
    
    if (!STATE.currentTrack) {
        playTrack(0);
        return;
    }

    if (STATE.isPlaying) {
        audio.pause();
        STATE.isPlaying = false;
    } else {
        audio.play();
        STATE.isPlaying = true;
    }

    updatePlayPauseButton();
}

function nextTrack() {
    const tracks = getFilteredTracks();
    let nextIndex;

    if (STATE.isShuffled) {
        nextIndex = Math.floor(Math.random() * tracks.length);
    } else {
        nextIndex = STATE.currentIndex + 1;
        if (nextIndex >= tracks.length) {
            nextIndex = STATE.repeatMode === 'all' ? 0 : STATE.currentIndex;
        }
    }

    if (nextIndex !== STATE.currentIndex || STATE.repeatMode === 'one') {
        playTrack(nextIndex);
    }
}

function prevTrack() {
    const tracks = getFilteredTracks();
    const audio = document.getElementById('audioPlayer');

    if (audio.currentTime > 3) {
        audio.currentTime = 0;
        return;
    }

    let prevIndex = STATE.currentIndex - 1;
    if (prevIndex < 0) {
        prevIndex = tracks.length - 1;
    }

    playTrack(prevIndex);
}

function toggleShuffle() {
    STATE.isShuffled = !STATE.isShuffled;
    const btn = document.getElementById('shuffleBtn');
    btn.classList.toggle('active');
    showToast(STATE.isShuffled ? '🔀 Shuffle Bật' : '🔀 Shuffle Tắt');
}

function toggleRepeat() {
    const modes = ['off', 'all', 'one'];
    const currentIdx = modes.indexOf(STATE.repeatMode);
    STATE.repeatMode = modes[(currentIdx + 1) % modes.length];
    
    const btn = document.getElementById('repeatBtn');
    btn.classList.toggle('active', STATE.repeatMode !== 'off');
    
    const messages = {
        'off': '🔁 Repeat Tắt',
        'all': '🔁 Repeat Tất Cả',
        'one': '🔂 Repeat Một Bài'
    };
    showToast(messages[STATE.repeatMode]);
}

function updateNowPlaying() {
    if (!STATE.currentTrack) return;

    const genre = musicData.genres.find(g => g.id === STATE.currentTrack.genre);
    
    document.getElementById('currentTitle').textContent = STATE.currentTrack.title;
    document.getElementById('currentArtist').textContent = STATE.currentTrack.artist;
    document.getElementById('currentGenreBadge').textContent = genre?.name || STATE.currentTrack.genre;
    document.getElementById('currentGenreBadge').style.background = genre?.color || '#ff006e';

    const albumArt = document.getElementById('albumArt');
    albumArt.innerHTML = `
        <img src="${STATE.currentTrack.image}" alt="${STATE.currentTrack.title}">
        <div class="equalizer">
            <div class="equalizer-bar"></div>
            <div class="equalizer-bar"></div>
            <div class="equalizer-bar"></div>
            <div class="equalizer-bar"></div>
        </div>
    `;

    updateLikeButton();
}

function updatePlayPauseButton() {
    const playBtn = document.getElementById('playBtn');
    const albumArt = document.getElementById('albumArt');
    
    if (STATE.isPlaying) {
        playBtn.innerHTML = '⏸';
        albumArt.classList.add('playing');
    } else {
        playBtn.innerHTML = '►';
        albumArt.classList.remove('playing');
    }
}

function updatePlaylistUI() {
    document.querySelectorAll('.playlist-item').forEach(item => {
        item.classList.remove('active');
        if (STATE.currentTrack && parseInt(item.dataset.trackId) === STATE.currentTrack.id) {
            item.classList.add('active');
            item.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
}

function updatePlaylistCounter() {
    const tracks = getFilteredTracks();
    document.getElementById('trackCounter').textContent = `${tracks.length} bài hát`;
}

function updateLikeButton() {
    const likeBtn = document.getElementById('likeBtn');
    if (STATE.currentTrack && STATE.favorites.includes(STATE.currentTrack.id)) {
        likeBtn.classList.add('active');
    } else {
        likeBtn.classList.remove('active');
    }
}

function toggleFavorite(trackId) {
    const index = STATE.favorites.indexOf(trackId);
    
    if (index === -1) {
        STATE.favorites.push(trackId);
        showToast('❤️ Đã thêm vào yêu thích');
    } else {
        STATE.favorites.splice(index, 1);
        showToast('💔 Đã xóa khỏi yêu thích');
    }

    localStorage.setItem('favorites', JSON.stringify(STATE.favorites));
    renderPlaylist();
    updateLikeButton();
}

function toggleCurrentFavorite() {
    if (STATE.currentTrack) {
        toggleFavorite(STATE.currentTrack.id);
    }
}

function setRating(trackId, rating) {
    STATE.ratings[trackId] = rating;
    localStorage.setItem('ratings', JSON.stringify(STATE.ratings));
    showToast(`⭐ Đánh giá ${rating} sao`);
    renderPlaylist();
}

function addToHistory(trackId) {
    STATE.history = STATE.history.filter(h => h.id !== trackId);
    STATE.history.unshift({ id: trackId, timestamp: Date.now() });
    STATE.history = STATE.history.slice(0, 100);
    localStorage.setItem('history', JSON.stringify(STATE.history));
}

function openShareModal() {
    if (!STATE.currentTrack) {
        showToast('⚠️ Vui lòng chọn bài hát để chia sẻ');
        return;
    }

    const shareUrl = `${window.location.origin}${window.location.pathname}?track=${STATE.currentTrack.id}`;
    document.getElementById('shareLinkInput').value = shareUrl;
    document.getElementById('shareModal').classList.add('active');
}

function closeShareModal() {
    document.getElementById('shareModal').classList.remove('active');
}

function shareToSocial(platform) {
    const track = STATE.currentTrack;
    const shareUrl = document.getElementById('shareLinkInput').value;
    const text = `🎵 ${track.title} - ${track.artist} | DJ Nonstop Mix`;

    let url;
    switch(platform) {
        case 'facebook':
            url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
            break;
        case 'twitter':
            url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
            break;
        case 'telegram':
            url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
            break;
        case 'whatsapp':
            url = `https://wa.me/?text=${encodeURIComponent(text + ' ' + shareUrl)}`;
            break;
    }

    if (url) {
        window.open(url, '_blank', 'width=600,height=400');
    }
}

function copyShareLink() {
    const input = document.getElementById('shareLinkInput');
    input.select();
    document.execCommand('copy');
    showToast('✅ Đã copy link');
}

function exportPlaylist() {
    const data = {
        favorites: STATE.favorites,
        ratings: STATE.ratings,
        exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dj-playlist-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('✅ Đã xuất playlist');
}

function importPlaylist() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                
                if (data.favorites) STATE.favorites = data.favorites;
                if (data.ratings) STATE.ratings = data.ratings;

                localStorage.setItem('favorites', JSON.stringify(STATE.favorites));
                localStorage.setItem('ratings', JSON.stringify(STATE.ratings));

                renderPlaylist();
                showToast('✅ Đã nhập playlist');
            } catch (error) {
                showToast('⚠️ File không hợp lệ');
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

// ============= CHỨC NĂNG TÌM KIẾM CẢI TIẾN =============

function updateSearchResultsInfo(count) {
    const searchTerm = document.getElementById('searchInput').value.trim();
    const infoBar = document.getElementById('searchResultsInfo');
    const infoText = document.getElementById('searchResultsText');

    if (searchTerm) {
        infoText.textContent = `Tìm thấy ${count} kết quả cho "${searchTerm}"`;
        infoBar.classList.add('active');
        document.querySelector('.search-box').classList.add('has-results');
    } else {
        infoBar.classList.remove('active');
        document.querySelector('.search-box').classList.remove('has-results');
    }
}

function scrollToFirstResult() {
    setTimeout(() => {
        const firstItem = document.querySelector('.playlist-item');
        if (firstItem) {
            // Highlight first result
            firstItem.classList.add('search-highlight');
            
            // Scroll to view
            firstItem.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });

            // Remove highlight after animation
            setTimeout(() => {
                firstItem.classList.remove('search-highlight');
            }, 4500);
        }
    }, 100);
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    renderPlaylist();
}

// ============= CHỨC NĂNG TẢI XUỐNG CẢI TIẾN =============

async function downloadTrack(trackId, event) {
    event.stopPropagation();
    
    const track = musicData.tracks.find(t => t.id === trackId);
    if (!track) return;

    const downloadBtn = event.currentTarget;
    
    // Prevent multiple downloads
    if (downloadBtn.dataset.status === 'downloading') {
        showToast('⏳ Bài hát đang tải...');
        return;
    }

    // Update button state
    downloadBtn.dataset.status = 'downloading';
    downloadBtn.innerHTML = '⏳';
    downloadBtn.classList.add('downloading');

    // Add to download queue
    addToDownloadQueue(track);

    try {
        // Fetch the audio file
        const response = await fetch(track.url);
        if (!response.ok) throw new Error('Download failed');

        // Get file size for progress tracking
        const contentLength = response.headers.get('content-length');
        const total = parseInt(contentLength, 10);
        
        const reader = response.body.getReader();
        const chunks = [];
        let received = 0;

        // Read and track progress
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            chunks.push(value);
            received += value.length;
            
            // Update progress
            const progress = (received / total) * 100;
            updateDownloadProgress(trackId, progress);
        }

        // Create blob and download
        const blob = new Blob(chunks, { type: 'audio/mpeg' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${track.artist} - ${track.title}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        // Update button state - success
        downloadBtn.dataset.status = 'completed';
        downloadBtn.innerHTML = '✓';
        downloadBtn.classList.remove('downloading');
        downloadBtn.classList.add('downloaded');

        // Remove from queue
        removeFromDownloadQueue(trackId);

        showToast(`✅ Đã tải: ${track.title}`);

        // Reset button after 3 seconds
        setTimeout(() => {
            downloadBtn.dataset.status = 'ready';
            downloadBtn.innerHTML = '⬇️';
            downloadBtn.classList.remove('downloaded');
        }, 3000);

    } catch (error) {
        console.error('Download error:', error);
        
        // Update button state - error
        downloadBtn.dataset.status = 'ready';
        downloadBtn.innerHTML = '⬇️';
        downloadBtn.classList.remove('downloading');
        
        removeFromDownloadQueue(trackId);
        showToast('❌ Lỗi tải xuống');
    }
}

function addToDownloadQueue(track) {
    DOWNLOAD_QUEUE.items.push({
        id: track.id,
        title: track.title,
        artist: track.artist,
        progress: 0
    });
    
    renderDownloadQueue();
    
    // Show queue if not already visible
    if (!DOWNLOAD_QUEUE.active) {
        document.getElementById('downloadQueue').classList.add('active');
        DOWNLOAD_QUEUE.active = true;
    }
}

function updateDownloadProgress(trackId, progress) {
    const item = DOWNLOAD_QUEUE.items.find(i => i.id === trackId);
    if (item) {
        item.progress = Math.round(progress);
        renderDownloadQueue();
    }
}

function removeFromDownloadQueue(trackId) {
    DOWNLOAD_QUEUE.items = DOWNLOAD_QUEUE.items.filter(i => i.id !== trackId);
    renderDownloadQueue();
    
    // Hide queue if empty
    if (DOWNLOAD_QUEUE.items.length === 0) {
        setTimeout(() => {
            document.getElementById('downloadQueue').classList.remove('active');
            DOWNLOAD_QUEUE.active = false;
        }, 2000);
    }
}

function renderDownloadQueue() {
    const container = document.getElementById('downloadQueueList');
    
    if (DOWNLOAD_QUEUE.items.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--gray-text); padding: 20px;">Không có tải xuống nào</div>';
        return;
    }
    
    container.innerHTML = DOWNLOAD_QUEUE.items.map(item => `
        <div class="download-item">
            <div class="download-item-icon">${item.progress === 100 ? '✓' : '⬇️'}</div>
            <div class="download-item-info">
                <div class="download-item-name">${item.title}</div>
                <div class="download-item-status">${item.artist} • ${item.progress}%</div>
                <div class="download-progress-bar">
                    <div class="download-progress-fill" style="width: ${item.progress}%"></div>
                </div>
            </div>
        </div>
    `).join('');
}

function closeDownloadQueue() {
    document.getElementById('downloadQueue').classList.remove('active');
    DOWNLOAD_QUEUE.active = false;
}

// ============= KEYBOARD SHORTCUTS =============

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;

        switch(e.key.toLowerCase()) {
            case ' ':
                e.preventDefault();
                togglePlay();
                break;
            case 'n':
                nextTrack();
                break;
            case 'p':
                prevTrack();
                break;
            case 'arrowup':
                e.preventDefault();
                changeVolume(5);
                break;
            case 'arrowdown':
                e.preventDefault();
                changeVolume(-5);
                break;
            case 'l':
                toggleCurrentFavorite();
                break;
        }
    });
}

function changeVolume(delta) {
    STATE.volume = Math.max(0, Math.min(100, STATE.volume + delta));
    const audio = document.getElementById('audioPlayer');
    audio.volume = STATE.volume / 100;
    document.getElementById('volumeSlider').value = STATE.volume;
    localStorage.setItem('volume', STATE.volume);
    showToast(`🔊 Volume: ${STATE.volume}%`);
}

// ============= EVENT LISTENERS =============

function setupEventListeners() {
    const audio = document.getElementById('audioPlayer');

    audio.addEventListener('play', () => {
        STATE.isPlaying = true;
        updatePlayPauseButton();
    });

    audio.addEventListener('pause', () => {
        STATE.isPlaying = false;
        updatePlayPauseButton();
    });

    audio.addEventListener('ended', () => {
        if (STATE.repeatMode === 'one') {
            audio.currentTime = 0;
            audio.play();
        } else {
            nextTrack();
        }
    });

    audio.addEventListener('timeupdate', () => {
        const percent = (audio.currentTime / audio.duration) * 100;
        document.getElementById('progressBar').style.width = `${percent}%`;
        document.getElementById('currentTime').textContent = formatTime(audio.currentTime);
    });

    audio.addEventListener('loadedmetadata', () => {
        document.getElementById('totalDuration').textContent = formatTime(audio.duration);
    });

    document.getElementById('playBtn').addEventListener('click', togglePlay);
    document.getElementById('nextBtn').addEventListener('click', nextTrack);
    document.getElementById('prevBtn').addEventListener('click', prevTrack);
    document.getElementById('shuffleBtn').addEventListener('click', toggleShuffle);
    document.getElementById('repeatBtn').addEventListener('click', toggleRepeat);
    document.getElementById('likeBtn').addEventListener('click', toggleCurrentFavorite);
    document.getElementById('shareBtn').addEventListener('click', openShareModal);

    document.getElementById('volumeSlider').addEventListener('input', (e) => {
        STATE.volume = parseInt(e.target.value);
        audio.volume = STATE.volume / 100;
        localStorage.setItem('volume', STATE.volume);
    });

    document.getElementById('progressContainer').addEventListener('click', (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        audio.currentTime = percent * audio.duration;
    });

    // Search with debounce
    let searchTimeout;
    document.getElementById('searchInput').addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            renderPlaylist();
        }, 300);
    });

    // Clear search on ESC
    document.getElementById('searchInput').addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            clearSearch();
        }
    });

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            STATE.currentTab = btn.dataset.tab;
            renderPlaylist();
        });
    });
}

// ============= UTILITY FUNCTIONS =============

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function showShortcuts() {
    document.getElementById('shortcutsHelp').classList.add('active');
}

function hideShortcuts() {
    document.getElementById('shortcutsHelp').classList.remove('active');
}

function toggleMenu() {
    document.getElementById('navLinks').classList.toggle('active');
}

// ============= INITIALIZATION =============

document.addEventListener('DOMContentLoaded', () => {
    loadMusicData();

    const urlParams = new URLSearchParams(window.location.search);
    const trackId = urlParams.get('track');
    if (trackId) {
        setTimeout(() => {
            const track = musicData.tracks.find(t => t.id === parseInt(trackId));
            if (track) {
                const index = musicData.tracks.indexOf(track);
                playTrack(index);
            }
        }, 1000);
    }
});
