const CLIENT_ID = "81d5ae70";

const audio = new Audio();

let songs = [];
let albums = [];
let currentIndex = -1;
let currentTrack = null;
let favorites = JSON.parse(localStorage.getItem("musicFavorites")) || [];
let repeatEnabled = false;
let showingFavorites = false;

const $ = selector => document.querySelector(selector);

const trackList = $("#trackList");
const playlistGrid = $("#playlistGrid");
const artistList = $("#artistList");

const playBtn = $("#play");
const miniPlay = $("#miniPlay");

function escapeHTML(text = "") {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";

  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);

  return `${min}:${String(sec).padStart(2, "0")}`;
}

function toast(message) {
  const element = $("#toast");

  element.textContent = message;
  element.classList.add("show");

  clearTimeout(toast.timer);

  toast.timer = setTimeout(() => {
    element.classList.remove("show");
  }, 1800);
}


async function fetchSongs(limit = 20) {
  try {
    const url =
      `https://api.jamendo.com/v3.0/tracks/?client_id=${CLIENT_ID}` +
      `&format=json&limit=${limit}&include=musicinfo`;

    const response = await fetch(url);
    const data = await response.json();

    songs = data.results || [];

    renderTracks(songs);
    renderArtists(songs);

    if (songs.length) {
      loadTrack(0, false);
    }
  } catch (error) {
    console.error(error);
    trackList.innerHTML = "Could not load music.";
  }
}



async function fetchAlbums() {
  try {
    const url =
      `https://api.jamendo.com/v3.0/albums/?client_id=${CLIENT_ID}` +
      `&format=json&limit=8`;

    const response = await fetch(url);
    const data = await response.json();

    albums = data.results || [];
    renderAlbums();
  } catch (error) {
    console.error(error);
    playlistGrid.innerHTML = "Could not load playlists.";
  }
}

function renderAlbums() {
  playlistGrid.innerHTML = "";

  albums.slice(0, 4).forEach(album => {
    const card = document.createElement("article");
    card.className = "playlist-card";

    card.innerHTML = `
      <div class="playlist-cover">
        <img src="${album.image}" alt="${escapeHTML(album.name)}">
        <button class="playlist-play">▶</button>
      </div>

      <h3>${escapeHTML(album.name)}</h3>
      <p>${escapeHTML(album.artist_name)}</p>
    `;

    card.addEventListener("click", () => loadAlbum(album.id));


    playlistGrid.appendChild(card);
  });
}

async function loadAlbum(id) {
  try {
    const url =
      `https://api.jamendo.com/v3.0/tracks/?client_id=${CLIENT_ID}` +
      `&format=json&album_id=${id}&limit=20`;


    const response = await fetch(url);
    const data = await response.json();

    songs = data.results || [];

    showingFavorites = false;
    renderTracks(songs);
    renderArtists(songs);

    if (songs.length) {
      loadTrack(0, true);
    }
  } catch (error) {
    console.error(error);
    toast("Unable to open album");
  }
}

function renderTracks(list) {
  trackList.innerHTML = "";

  if (!list.length) {
    trackList.innerHTML =
      `<div class="loading">No songs found.</div>`;
    return;
  }

  list.forEach((track, index) => {
    const saved = favorites.some(item => item.id === track.id);

    const row = document.createElement("div");
    row.className = "track-row";
    row.dataset.id = track.id;

    row.innerHTML = `
      <span class="track-number">
        ${String(index + 1).padStart(2, "0")}
      </span>

      <div class="track-details">
        <img src="${track.album_image || ""}" alt="">
        <div>
          <strong>${escapeHTML(track.name)}</strong>
          <span>
            ${escapeHTML(track.artist_name)}
            · ${escapeHTML(track.musicinfo?.tags?.genres?.[0] || "Music")}
          </span>
        </div>
      </div>

      <span class="track-duration">
        ${formatTime(Number(track.duration))}
      </span>

      <button class="row-play">▶</button>

      <button class="favorite-track ${saved ? "saved" : ""}">
        ${saved ? "♥" : "♡"}
      </button>
    `;

    
    row.querySelector(".row-play").addEventListener("click", event => {
      event.stopPropagation();
      playFromRenderedList(track);
    });

    row.querySelector(".favorite-track").addEventListener("click", event => {
      event.stopPropagation();
      toggleFavorite(track);
      renderTracks(list);
    });

    row.addEventListener("click", () => playFromRenderedList(track));

    trackList.appendChild(row);
  });

  updatePlayingRow();
}


function playFromRenderedList(track) {
  let index = songs.findIndex(song => song.id === track.id);

  if (index === -1) {
    songs = [track, ...songs];
    index = 0;
  }

  loadTrack(index, true);
}



function renderArtists(source) {
  artistList.innerHTML = "";

  const unique = [];

  source.forEach(track => {
    if (!unique.some(item => item.artist_id === track.artist_id)) {
      unique.push(track);
    }
  });

  unique.slice(0, 3).forEach(track => {
    const artist = document.createElement("div");
    artist.className = "artist-row";

    artist.innerHTML = `
      <img src="${track.album_image || ""}" alt="">
      <div>
        <strong>${escapeHTML(track.artist_name)}</strong>
        <span>Independent Artist · Jamendo</span>
      </div>
    `;






    artist.addEventListener("click", () => {
      $("#searchInput").value = track.artist_name;
      searchTracks(track.artist_name);
    });

    artistList.appendChild(artist);
  });
}

function loadTrack(index, autoplay = true) {
  if (!songs[index]) return;

  currentIndex = index;
  currentTrack = songs[index];

  audio.src = currentTrack.audio;

  updatePlayer();

  if (autoplay) {
    audio.play()
      .then(setPlayingState)
      .catch(console.error);
  } else {
    setPausedState();
  }
}

function updatePlayer() {
  const image = currentTrack.album_image || "";

  $("#nowTitle").textContent = currentTrack.name;
  $("#nowArtist").textContent = currentTrack.artist_name;

  $("#miniTitle").textContent = currentTrack.name;
  $("#miniArtist").textContent = currentTrack.artist_name;

  if (image) {
    $("#nowCover").src = image;
    $("#nowCover").style.display = "block";
    $("#coverPlaceholder").style.display = "none";

    $("#miniImage").src = image;
  }

  $("#duration").textContent =
    formatTime(Number(currentTrack.duration));

  updateFavoriteButton();
  updatePlayingRow();
}

function togglePlayback() {
  if (!currentTrack) {
    if (songs.length) loadTrack(0, true);
    return;
  }

  if (audio.paused) {
    audio.play()
      .then(setPlayingState)
      .catch(console.error);
  } else {
    audio.pause();
    setPausedState();
  }
}

function setPlayingState() {
  playBtn.textContent = "❚❚";
  miniPlay.textContent = "❚❚";
  $("#visualizer").classList.add("playing");
  updatePlayingRow();
}

function setPausedState() {
  playBtn.textContent = "▶";
  miniPlay.textContent = "▶";

  $("#visualizer").classList.remove("playing");
  updatePlayingRow();
}

function nextTrack() {
  if (!songs.length) return;

  currentIndex = (currentIndex + 1) % songs.length;
  loadTrack(currentIndex, true);
}

function previousTrack() {
  if (!songs.length) return;

  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }

  currentIndex =
    (currentIndex - 1 + songs.length) % songs.length;

  loadTrack(currentIndex, true);
}

function updatePlayingRow() {
  document.querySelectorAll(".track-row").forEach(row => {
    const active =
      currentTrack &&
      String(currentTrack.id) === row.dataset.id;

    row.classList.toggle("playing", active);

    const button = row.querySelector(".row-play");

    if (button) {
      button.textContent =
        active && !audio.paused ? "❚❚" : "▶";
    }
  });
}

function toggleFavorite(track) {
  const exists = favorites.some(item => item.id === track.id);

  if (exists) {
    favorites = favorites.filter(item => item.id !== track.id);
    toast("Removed from favourites");
  } else {
    favorites.push(track);
    toast("Added to favourites");
  }

  localStorage.setItem(
    "musicFavorites",
    JSON.stringify(favorites)
  );

  updateFavoriteButton();
}

function updateFavoriteButton() {
  if (!currentTrack) return;

  const saved =
    favorites.some(item => item.id === currentTrack.id);

  $("#favoriteCurrent").textContent =
    saved ? "♥" : "♡";

  $("#favoriteCurrent").classList.toggle("saved", saved);
}

function showFavorites() {
  showingFavorites = true;

  $("#pageTitle").textContent = "Favourites";

  renderTracks(favorites);
}

function searchTracks(value) {
  const query = value.trim().toLowerCase();

  if (!query) {
    showingFavorites = false;
    renderTracks(songs);
    return;

}

  const results = songs.filter(track =>
    track.name.toLowerCase().includes(query) ||
    track.artist_name.toLowerCase().includes(query)
  );

  renderTracks(results);
}

/* PLAYER EVENTS */

playBtn.addEventListener("click", togglePlayback);

miniPlay.addEventListener("click", togglePlayback);

$("#next").addEventListener("click", nextTrack);
$("#miniNext").addEventListener("click", nextTrack);

$("#previous").addEventListener("click", previousTrack);
$("#miniPrevious").addEventListener("click", previousTrack);

audio.addEventListener("play", setPlayingState);
audio.addEventListener("pause", setPausedState);


audio.addEventListener("timeupdate", () => {
  $("#currentTime").textContent =
    formatTime(audio.currentTime);

  if (!Number.isFinite(audio.duration)) return;

  const percentage =
    (audio.currentTime / audio.duration) * 100;

  $("#progressFill").style.width =
    `${percentage}%`;

  $("#progressDot").style.left =
    `${percentage}%`;
});

audio.addEventListener("ended", () => {
  if (repeatEnabled) {
    audio.currentTime = 0;
    audio.play();
  } else {
    nextTrack();
  }

});

$("#progress").addEventListener("click", event => {
  if (!Number.isFinite(audio.duration)) return;

  const rect =
    event.currentTarget.getBoundingClientRect();

  const percentage =
    (event.clientX - rect.left) / rect.width;

  audio.currentTime =
    percentage * audio.duration;


});

/* VOLUME */

audio.volume = .7;

$("#volumeSlider").addEventListener("input", event => {
  audio.volume = Number(event.target.value) / 100;

  $("#muteBtn").textContent =
    audio.volume === 0 ? "🔇" : "🔊";
});

$("#muteBtn").addEventListener("click", () => {
  if (audio.volume > 0) {
    audio.dataset.previousVolume = audio.volume;
    audio.volume = 0;
    $("#volumeSlider").value = 0;
    $("#muteBtn").textContent = "🔇";
  } else {
    audio.volume =
      Number(audio.dataset.previousVolume) || .7;

    $("#volumeSlider").value =
      audio.volume * 100;

    $("#muteBtn").textContent = "🔊";
  }
});


/* FAVORITES */

$("#favoriteCurrent").addEventListener("click", () => {
  if (currentTrack) toggleFavorite(currentTrack);
});

$("#favoritesBtn").addEventListener("click", showFavorites);

/* REPEAT */


$("#repeat").addEventListener("click", event => {
  repeatEnabled = !repeatEnabled;

  event.currentTarget.style.color =
    repeatEnabled ? "#df91ff" : "white";

  toast(
    repeatEnabled
      ? "Repeat enabled"
      : "Repeat disabled"
  );
});


/* SEARCH */


$("#searchInput").addEventListener("input", event => {
  searchTracks(event.target.value);
});



/* HERO */


$("#heroButton").addEventListener("click", () => {
  document
    .querySelector(".content-section")
    .scrollIntoView({ behavior: "smooth" });
});



/* SIDEBAR */



$("#hamburger").addEventListener("click", () => {
  $("#sidebar").classList.add("open");
});

$("#mobileClose").addEventListener("click", () => {
  $("#sidebar").classList.remove("open");
});

document.querySelectorAll(".side-item[data-page]")
  .forEach(button => {
    button.addEventListener("click", () => {
      document
        .querySelectorAll(".side-item")
        .forEach(item => item.classList.remove("active"));

      button.classList.add("active");

      $("#pageTitle").textContent =
        button.textContent.trim();

      $("#sidebar").classList.remove("open");
    });
  });









/* OTHER BUTTONS */

$("#seeAllSongs").addEventListener("click", () => {
  renderTracks(songs);
  toast("Showing all tracks");
});

$("#seeAllAlbums").addEventListener("click", () => {
  playlistGrid.innerHTML = "";

  albums.forEach(album => {
    const card = document.createElement("article");
    card.className = "playlist-card";

    card.innerHTML = `
      <div class="playlist-cover">
        <img src="${album.image}" alt="">
        <button class="playlist-play">▶</button>
      </div>
      <h3>${escapeHTML(album.name)}</h3>
      <p>${escapeHTML(album.artist_name)}</p>
    `;

    card.addEventListener("click", () => loadAlbum(album.id));

    playlistGrid.appendChild(card);
  });
});

$("#popularBtn").addEventListener("click", () => {
  $("#pageTitle").textContent = "Popular";
  renderTracks(songs);
});

$("#myMusicBtn").addEventListener("click", () => {
  showFavorites();
});

$("#notificationBtn").addEventListener("click", () => {
  toast("You're all caught up!");
});

$("#seeMoreArtists").addEventListener("click", () => {
  renderArtists(songs.slice(0, 10));
  toast("More artists loaded");
});

/* KEYBOARD */

document.addEventListener("keydown", event => {
  if (
    event.code === "Space" &&
    document.activeElement.tagName !== "INPUT"
  ) {
    event.preventDefault();
    togglePlayback();
  }
});

/* START */

async function init() {
  await Promise.all([
    fetchSongs(25),
    fetchAlbums()
  ]);
}

init();