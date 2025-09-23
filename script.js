
let currentSong = new Audio();
let songs = [];
let currfolder = "";
let currentIndex = 0;
let currentTrack = null;

function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

async function getsongs(folder) {
    currfolder = folder;
    let res = await fetch(`/songs/${folder}/`);
    let text = await res.text();
    let div = document.createElement("div");
    div.innerHTML = text;
    let as = div.getElementsByTagName("a");
    songs = [];
    for (let a of as) {
        if (a.href.endsWith(".mp3")) {
            songs.push(decodeURIComponent(a.href.split(`/${folder}/`).pop()));
        }
    }
    renderSongList();
    return songs;
}

function renderSongList() {
    let songul = document.querySelector(".songlist ul");
    songul.innerHTML = "";
    for (const song of songs) {
        let li = document.createElement("li");
        li.setAttribute("data-song", song); // Mark each li with song name
        li.innerHTML = `
            <img class="invert" src="img/music.svg" alt="">
            <div class="info">
                <div>${song}</div>
                <div>Kaushik</div>
            </div>
            <div class="playnow">
                <span>Play Now</span>
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

const playMusic = (track, pause = false) => {
    console.log("Trying to play:", track);
    currentTrack = track;
    currentIndex = songs.indexOf(track);

    if (!pause) {
        currentSong.src = `/songs/${currfolder}/` + track;
        currentSong.play().catch(err => {
            console.error("Playback error:", err);
        });
        play.src = "img/pause.svg";
    }

    document.querySelector(".songinfo").innerHTML = decodeURI(track);
    document.querySelector(".songtime").innerHTML = "00:00 / 00:00";

    // Update UI: Animate current song in sidebar
    document.querySelectorAll(".songlist ul li").forEach((li, index) => {
        const icon = li.querySelector(".play-icon");
        if (songs[index] === track && !pause) {
            icon.src = "img/pause.svg";
            li.classList.add("playing");
        } else {
            icon.src = "img/play.svg";
            li.classList.remove("playing");
        }
    });
};

async function displayAlbums() {
    let a = await fetch(`/songs/`);
    let response = await a.text();
    let div = document.createElement("div");
    div.innerHTML = response;
    let anchors = div.getElementsByTagName("a");
    let cardcontainer = document.querySelector(".cardcontainer");

    for (let e of anchors) {
        if (e.href.includes("/songs/") && !e.href.includes(".htaccess")) {
            let folder = e.href.split("/").filter(Boolean).pop();
            try {
                let meta = await fetch(`/songs/${folder}/info.json`);
                let metadata = await meta.json();

                let card = document.createElement("div");
                card.className = "card";
                card.dataset.folder = folder;
                card.innerHTML = `
                    <div class="play">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                            xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 5L19 12L8 19V5Z" stroke="#141B34" fill="#000" stroke-width="1.5"
                                stroke-linejoin="round" />
                        </svg>
                    </div>
                    <img src="/songs/${folder}/cover.jpg" alt="">
                    <h2>${metadata.title}</h2>
                    <p>${metadata.description}</p>
                `;
                cardcontainer.appendChild(card);

                card.addEventListener("click", async () => {
                    console.log("Fetching Songs for", folder);
                    await getsongs(folder);
                    playMusic(songs[0]);
                });
            } catch (error) {
                console.error(`Failed to fetch info.json for ${folder}`, error);
            }
        }
    }
}

async function main() {
    await getsongs("aa");
    playMusic(songs[0], true);
    displayAlbums();

    // Play/Pause
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

    // Next
    next.addEventListener("click", () => {
        if (currentIndex < songs.length - 1) {
            currentIndex++;
            playMusic(songs[currentIndex]);
        }
    });

    // Previous
    previous.addEventListener("click", () => {
        if (currentIndex > 0) {
            currentIndex--;
            playMusic(songs[currentIndex]);
        }
    });

    // Time Update
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

    // Sidebar
    document.querySelector(".hamburger").addEventListener("click", () => {
        document.querySelector(".left").style.left = "0";
    });

    document.querySelector(".close").addEventListener("click", () => {
        document.querySelector(".left").style.left = "-120%";
    });

    // Volume
    document.querySelector(".range input").addEventListener("change", (e) => {
        let vol = parseInt(e.target.value) / 100;
        currentSong.volume = vol;
        if (vol > 0) {
            document.querySelector(".volume>img").src = document.querySelector(".volume>img").src.replace("img/mute.svg", "img/volume.svg");
        }
    });

    document.querySelector(".volume>img").addEventListener("click", e => {
        if (e.target.src.includes("img/volume.svg")) {
            e.target.src = e.target.src.replace("img/volume.svg", "img/mute.svg");
            currentSong.volume = 0;
            document.querySelector(".range input").value = 0;
        } else {
            e.target.src = e.target.src.replace("img/mute.svg", "img/volume.svg");
            currentSong.volume = 0.1;
            document.querySelector(".range input").value = 10;
        }
    });
}
main();
