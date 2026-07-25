const input = document.getElementById("q");
const result = document.getElementById("result");

async function searchSong(){

    const keyword = input.value.trim();

    if(!keyword){
        alert("Masukkan judul lagu.");
        return;
    }

    result.innerHTML = "<h3>Mencari...</h3>";

    try{

        const res = await fetch("/api/search?q="+encodeURIComponent(keyword));

        const data = await res.json();

        if(!data.status){

            result.innerHTML = "<h3>Lagu tidak ditemukan.</h3>";
            return;

        }

        result.innerHTML = `
        <div class="card">

            <img src="${data.thumbnail}" class="cover">

            <h2>${data.title}</h2>

            <p>${data.artist}</p>

            <p>Album : ${data.album}</p>

            <p>Durasi : ${data.duration}</p>

            <audio controls
            src="/api/play?q=${encodeURIComponent(keyword)}">
            </audio>

            <br><br>

            <a
            class="btn"
            href="${data.download_url}">
            ⬇ Download MP3
            </a>

            <a
            class="btn spotify"
            target="_blank"
            href="${data.spotify_url}">
            🎵 Spotify
            </a>

        </div>
        `;

    }catch(err){

        result.innerHTML =
        "<h3>"+err.message+"</h3>";

    }

}