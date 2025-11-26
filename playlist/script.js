// ==================== STATE & DATA ====================
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
    lastPosition: JSON.parse(localStorage.getItem('lastPosition')) || {},
    playCount: JSON.parse(localStorage.getItem('playCount')) || {},
    downloadCount: JSON.parse(localStorage.getItem('downloadCount')) || {}
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

const DOWNLOAD_QUEUE = {
    items: [],
    active: false
};

// ==================== LOAD DATA ====================
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

// ==================== RENDER ====================
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
        const playCount = STATE.playCount[track.id] || 0;
        const downloadCount = STATE.downloadCount[track.id] || 0;

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
                            <div class="tooltip-info-value">${formatNumber(playCount)}</div>
                        </div>
                        <div class="tooltip-info-item">
                            <div class="tooltip-info-label">Lượt Tải</div>
                            <div class="tooltip-info-value">${formatNumber(downloadCount)}</div>
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
                    
                    <div class="track-stats" style="display: flex; gap: 10px; align-items: center;">
                        <span class="stat-item" title="Lượt nghe">
                            <span style="font-size: 0.9em;">👁️</span>
                            <span style="font-size: 0.85em; color: var(--gray-text);">${formatNumber(playCount)}</span>
                        </span>
                        <span class="stat-item" title="Lượt tải">
                            <span style="font-size: 0.9em;">📥</span>
                            <span style="font-size: 0.85em; color: var(--gray-text);">${formatNumber(downloadCount)}</span>
                        </span>
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

// ==================== PLAYBACK ====================
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

    incrementPlayCount(STATE.currentTrack.id);
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
    const audio = document.getElementById('audioPlayer');

    if (audio.currentTime > 3) {
        audio.currentTime = 0;
        return;
    }

    let prevIndex = STATE.currentIndex - 1;
    if (prevIndex < 0) {
        prevIndex = getFilteredTracks().length - 1;
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
