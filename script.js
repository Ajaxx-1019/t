/* ==================== Global state ==================== */

const audio = document.getElementById("audio");

let queue = [];          // array of track objects currently loaded for playback
let queueIndex = -1;     // index of the track currently playing in `queue`
let shuffleOn = false;
let baseOrder = [];      // the playlist tracks in their original order
let shuffledOrder = [];  // smart-shuffled version of baseOrder

/* ==================== Tabs ==================== */

function switchTab(tab) {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
    document.getElementById("tab-song").classList.toggle("active", tab === "song");
    document.getElementById("tab-playlist").classList.toggle("active", tab === "playlist");
}

/* ==================== Single song search ==================== */

const input = document.getElementById("q");
const result = document.getElementById("result");

async function searchSong() {

    const keyword = input.value.trim();

    if (!keyword) {
        alert("Masukkan judul lagu.");
        return;
    }

    result.innerHTML = "<h3 class='msg'>Mencari...</h3>";

    try {

        const res = await fetch("/api/search?q=" + encodeURIComponent(keyword));
        const data = await res.json();

        if (!data.status) {
            result.innerHTML = "<h3 class='msg'>Lagu tidak ditemukan.</h3>";
            return;
        }

        const track = {
            title: data.title,
            artist: data.artist,
            album: data.album,
            duration: data.duration,
            cover: data.thumbnail,
            query: keyword,
            spotify_url: data.spotify_url
        };

        result.innerHTML = `
        <div class="card">

            <img src="${track.cover}" class="cover">

            <h2>${track.title}</h2>

            <p>${track.artist}</p>

            <p>Album : ${track.album}</p>

            <p>Durasi : ${track.duration}</p>

            <div class="card-actions">
                <button class="btn" onclick='playTrackNow(${JSON.stringify(track)})'>▶ Putar</button>
                <button class="btn" onclick='downloadTrack(${JSON.stringify(track)})'>⬇ Download MP3</button>
                <a class="btn spotify" target="_blank" href="${track.spotify_url}">🎵 Spotify</a>
            </div>

        </div>
        `;

    } catch (err) {
        result.innerHTML = "<h3 class='msg'>" + err.message + "</h3>";
    }
}

function playTrackNow(track) {
    queue = [track];
    queueIndex = 0;
    loadAndPlay();
}

/* ==================== Playlist ==================== */

const plUrlInput = document.getElementById("plUrl");
const playlistHeader = document.getElementById("playlistHeader");
const playlistActions = document.getElementById("playlistActions");
const playlistTracks = document.getElementById("playlistTracks");
const shuffleBtn = document.getElementById("shuffleBtn");

async function searchPlaylist() {

    const url = plUrlInput.value.trim();

    if (!url) {
        alert("Tempel link playlist Spotify dulu.");
        return;
    }

    playlistHeader.innerHTML = "<p class='msg'>Memuat playlist...</p>";
    playlistTracks.innerHTML = "";
    playlistActions.classList.remove("show");

    try {

        const res = await fetch("/api/playlist?url=" + encodeURIComponent(url));
        const data = await res.json();

        if (!data.status) {
            playlistHeader.innerHTML = `<p class="msg">${data.message || "Playlist tidak ditemukan."}</p>`;
            return;
        }

        baseOrder = data.tracks;
        shuffledOrder = smartShuffleOrder(baseOrder);
        shuffleOn = false;
        shuffleBtn.textContent = "🔀 Smart Shuffle: OFF";
        shuffleBtn.classList.remove("on");

        playlistHeader.innerHTML = `
        <div class="playlist-header">
            <img src="${data.cover}">
            <div class="pl-meta">
                <strong>${data.title}</strong>
                <span>${data.total} lagu</span>
            </div>
        </div>
        `;

        playlistActions.classList.add("show");
        renderTrackList();

    } catch (err) {
        playlistHeader.innerHTML = `<p class="msg">${err.message}</p>`;
    }
}

function renderTrackList() {

    const order = shuffleOn ? shuffledOrder : baseOrder;

    playlistTracks.innerHTML = order.map((t, i) => `
        <div class="track-item" data-qidx="${i}" onclick="playFromOrder(${i})">
            <img src="${t.cover}">
            <div class="track-meta">
                <div class="t-title">${t.title}</div>
                <div class="t-sub">${t.artist} · ${t.duration}</div>
            </div>
            <button class="track-dl" title="Unduh MP3" onclick="event.stopPropagation(); downloadTrack(${JSON.stringify(t)})">⬇</button>
        </div>
    `).join("");
}

function playFromOrder(i) {
    queue = shuffleOn ? shuffledOrder : baseOrder;
    queueIndex = i;
    loadAndPlay();
    highlightPlaying();
}

function playAllFromStart() {
    if (!baseOrder.length) {
        alert("Muat playlist dulu.");
        return;
    }
    playFromOrder(0);
}

function toggleShuffle() {
    shuffleOn = !shuffleOn;
    shuffleBtn.textContent = shuffleOn ? "🔀 Smart Shuffle: ON" : "🔀 Smart Shuffle: OFF";
    shuffleBtn.classList.toggle("on", shuffleOn);

    // re-roll a fresh smart shuffle each time it's turned on
    if (shuffleOn) shuffledOrder = smartShuffleOrder(baseOrder);

    // if something from this playlist is currently playing, keep playing
    // the same track but re-point the queue to the new order
    if (queue === baseOrder || queue === shuffledOrder) {
        const currentTrack = queue[queueIndex];
        queue = shuffleOn ? shuffledOrder : baseOrder;
        queueIndex = queue.findIndex(t => t.query === currentTrack?.query);
        if (queueIndex === -1) queueIndex = 0;
    }

    renderTrackList();
    highlightPlaying();
}

/**
 * "Smart" shuffle: a plain random shuffle would happily put the same
 * artist back to back or cluster tracks from the same album. This does
 * a Fisher-Yates shuffle and then repairs the order so consecutive
 * tracks never share the same artist when it's avoidable.
 */
function smartShuffleOrder(tracks) {

    const arr = [...tracks];

    // Fisher-Yates
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    // repair consecutive same-artist collisions
    for (let i = 1; i < arr.length; i++) {
        if (arr[i].artist === arr[i - 1].artist) {
            let swapWith = -1;
            for (let j = i + 1; j < arr.length; j++) {
                const okWithPrev = arr[j].artist !== arr[i - 1].artist;
                const okWithNext = i + 1 >= arr.length || arr[j].artist !== arr[i + 1]?.artist;
                if (okWithPrev && okWithNext) {
                    swapWith = j;
                    break;
                }
            }
            if (swapWith !== -1) {
                [arr[i], arr[swapWith]] = [arr[swapWith], arr[i]];
            }
        }
    }

    return arr;
}

function highlightPlaying() {
    document.querySelectorAll(".track-item").forEach(el => {
        el.classList.toggle("playing", Number(el.dataset.qidx) === queueIndex && (queue === shuffledOrder || queue === baseOrder));
    });
}

/* ==================== Download ==================== */

async function downloadTrack(track) {
    try {
        const res = await fetch("/api/search?q=" + encodeURIComponent(track.query || track.title));
        const data = await res.json();

        if (!data.status || !data.download_url) {
            alert("Gagal mendapatkan link download.");
            return;
        }

        const a = document.createElement("a");
        a.href = data.download_url;
        a.download = `${track.title}.mp3`;
        document.body.appendChild(a);
        a.click();
        a.remove();

    } catch (err) {
        alert("Gagal download: " + err.message);
    }
}

function downloadCurrent() {
    const track = queue[queueIndex];
    if (!track) return;
    downloadTrack(track);
}

/* ==================== Custom player ==================== */

const playerCover = document.getElementById("playerCover");
const playerTitle = document.getElementById("playerTitle");
const playerArtist = document.getElementById("playerArtist");
const playPauseBtn = document.getElementById("playPauseBtn");
const seek = document.getElementById("seek");
const curTime = document.getElementById("curTime");
const durTime = document.getElementById("durTime");

function loadAndPlay() {
    const track = queue[queueIndex];
    if (!track) return;

    playerCover.src = track.cover || "";
    playerTitle.textContent = track.title || "";
    playerArtist.textContent = track.artist || "";
    playPauseBtn.textContent = "⏳";

    audio.src = "/api/play?q=" + encodeURIComponent(track.query || track.title);
    audio.play().catch(() => {});
}

function togglePlay() {
    if (!audio.src) return;
    if (audio.paused) {
        audio.play();
    } else {
        audio.pause();
    }
}

function playNext() {
    if (!queue.length) return;
    queueIndex = (queueIndex + 1) % queue.length;
    loadAndPlay();
    highlightPlaying();
}

function playPrev() {
    if (!queue.length) return;
    queueIndex = (queueIndex - 1 + queue.length) % queue.length;
    loadAndPlay();
    highlightPlaying();
}

function formatTime(sec) {
    if (!isFinite(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

audio.addEventListener("play", () => { playPauseBtn.textContent = "⏸"; });
audio.addEventListener("pause", () => { playPauseBtn.textContent = "▶"; });

audio.addEventListener("loadedmetadata", () => {
    seek.max = Math.floor(audio.duration) || 0;
    durTime.textContent = formatTime(audio.duration);
});

audio.addEventListener("timeupdate", () => {
    seek.value = Math.floor(audio.currentTime);
    curTime.textContent = formatTime(audio.currentTime);
});

audio.addEventListener("ended", () => {
    // auto-advance to the next track in the queue (playlist autoplay)
    if (queue.length > 1) {
        playNext();
    } else {
        playPauseBtn.textContent = "▶";
    }
});

seek.addEventListener("input", () => {
    audio.currentTime = Number(seek.value);
});
