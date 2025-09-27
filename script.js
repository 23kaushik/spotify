// ===============================
// Spotify Clone with Jamendo API
// ===============================

let currentSong = new Audio();
let songs = [];
let currentIndex = 0;
let currentTrack = null;
let client_id = "81d5ae70"; // 🔑 Put your Jamendo API key here

// Utility: Format time
function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

// Fetch songs from Jamendo API
async function getSongsFromJamendo(limit = 20) {
    let url = `https://api.jamendo.com/v3.0/tracks/?client_id=${client_id}&format=json&limit=${limit}&include=musicinfo`;
    let res = await fetch(url);
    let data = await res.json();
    songs = data.results;
    renderSongList();
    return songs;
}

// Render song list in sidebar
function renderSongList() {
    let songul = document.querySelector(".songlist ul");
    songul.innerHTML = "";
    for (const song of songs) {
        let li = document.createElement("li");
        li.setAttribute("data-song", song.id);
        li.innerHTML = `
            <img class="invert" src="${song.album_image}" alt="cover" width="40" height="40">
            <div class="info">
                <div>${song.name}</div>
                <div>${song.artist_name}</div>
            </div>
            <div class="playnow">
                <span>Play</span>
                <img class="invert play-icon" src="img/play.svg" alt="">
            </div>
        `;
        li.style.cursor = "pointer";
        li.addEventListener("click", () => {
            playMusic(song);
        });
        songul.appendChild(li);
    }
}

// Play music
const playMusic = (track, pause = false) => {
    console.log("Playing:", track.name);
    currentTrack = track;
    currentIndex = songs.indexOf(track);

    if (!pause) {
        currentSong.src = track.audio; // Jamendo stream URL
        currentSong.play().catch(err => {
            console.error("Playback error:", err);
        });
        play.src = "img/pause.svg";
    }

    document.querySelector(".songinfo").innerHTML = `${track.name} - ${track.artist_name}`;
    document.querySelector(".songtime").innerHTML = "00:00 / 00:00";

    // Update UI: Animate current song in sidebar
    document.querySelectorAll(".songlist ul li").forEach((li, index) => {
        const icon = li.querySelector(".play-icon");
        if (songs[index].id === track.id && !pause) {
            icon.src = "img/pause.svg";
            li.classList.add("playing");
        } else {
            icon.src = "img/play.svg";
            li.classList.remove("playing");
        }
    });
};

// Display albums (Jamendo albums are different, we’ll use "playlists" or "featured")
async function displayAlbums() {
    let url = `https://api.jamendo.com/v3.0/albums/?client_id=${client_id}&format=json&limit=10`;
    let res = await fetch(url);
    let data = await res.json();
    let albums = data.results;

    let cardcontainer = document.querySelector(".cardcontainer");
    cardcontainer.innerHTML = "";

    for (let album of albums) {
        let card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <div class="play">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 5L19 12L8 19V5Z" stroke="#141B34" fill="#000" stroke-width="1.5"
                        stroke-linejoin="round" />
                </svg>
            </div>
            <img src="${album.image}" alt="">
            <h2>${album.name}</h2>
            <p>${album.artist_name}</p>
        `;
        cardcontainer.appendChild(card);

        // When album clicked → fetch its songs
        card.addEventListener("click", async () => {
            let url = `https://api.jamendo.com/v3.0/tracks/?client_id=${client_id}&format=json&album_id=${album.id}&limit=20`;
            let res = await fetch(url);
            let data = await res.json();
            songs = data.results;
            renderSongList();
            playMusic(songs[0]);
        });
    }
}

// Main function
async function main() {
    await getSongsFromJamendo(15);
    playMusic(songs[0]);
    displayAlbums();

    // Play/Pause button
    play.addEventListener("click", () => {
        if (!currentTrack) {
            playMusic(songs[0]);
        } else if (currentSong.paused) {
            currentSong.play();
            play.src = "img/pause.svg";
        } else {
            currentSong.pause();
            play.src = "img/play.svg";
        }
    });

    // Next song
    next.addEventListener("click", () => {
        if (currentIndex < songs.length - 1) {
            currentIndex++;
            playMusic(songs[currentIndex]);
        }
    });

    // Previous song
    previous.addEventListener("click", () => {
        if (currentIndex > 0) {
            currentIndex--;
            playMusic(songs[currentIndex]);
        }
    });

    // Time update
    currentSong.addEventListener("timeupdate", () => {
        document.querySelector(".songtime").innerHTML =
            `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`;
        document.querySelector(".circle").style.left =
            (currentSong.currentTime / currentSong.duration) * 100 + "%";
    });

    // Seekbar
    document.querySelector(".seekbar").addEventListener("click", e => {
        let percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100;
        document.querySelector(".circle").style.left = percent + "%";
        currentSong.currentTime = (currentSong.duration * percent) / 100;
    });

    // Sidebar toggle
    document.querySelector(".hamburger").addEventListener("click", () => {
        document.querySelector(".left").style.left = "0";
    });

    document.querySelector(".close").addEventListener("click", () => {
        document.querySelector(".left").style.left = "-120%";
    });

    // Volume control
    document.querySelector(".range input").addEventListener("change", (e) => {
        let vol = parseInt(e.target.value) / 100;
        currentSong.volume = vol;
        if (vol > 0) {
            document.querySelector(".volume>img").src = "img/volume.svg";
        }
    });

    document.querySelector(".volume>img").addEventListener("click", e => {
        if (e.target.src.includes("volume.svg")) {
            e.target.src = "img/mute.svg";
            currentSong.volume = 0;
            document.querySelector(".range input").value = 0;
        } else {
            e.target.src = "img/volume.svg";
            currentSong.volume = 0.1;
            document.querySelector(".range input").value = 10;
        }
    });
}
main();
