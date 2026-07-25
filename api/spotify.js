export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const q = (req.query.q || "").trim();

    if (!q) {
      return res.status(400).json({
        status: false,
        message: "Parameter q wajib diisi."
      });
    }

    const api = `https://api.nexadev.my.id/api/spotifyplay?q=${encodeURIComponent(q)}`;

    const response = await fetch(api);

    if (!response.ok) {
      return res.status(response.status).json({
        status: false,
        message: "Gagal mengambil data dari Nexa API."
      });
    }

    const json = await response.json();

    if (!json.status || !json.result) {
      return res.status(404).json({
        status: false,
        message: "Lagu tidak ditemukan."
      });
    }

    const song = json.result;

    return res.status(200).json({
      status: true,
      title: song.title,
      artist: song.artist,
      album: song.album,
      duration: song.duration,
      thumbnail: song.thumbnail,
      popularity: song.popularity,
      release_at: song.release_at,
      spotify_url: song.url,
      download_url: song.download_url
    });

  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message
    });
  }
}