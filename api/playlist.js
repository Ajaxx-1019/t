export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const url = (req.query.url || "").trim();

    if (!url) {
      return res.status(400).json({
        status: false,
        message: "Parameter url wajib diisi."
      });
    }

    const api = `https://api.nexadev.my.id/api/spotifypl?url=${encodeURIComponent(url)}`;

    const response = await fetch(api);

    if (!response.ok) {
      return res.status(response.status).json({
        status: false,
        message: "Gagal mengambil data playlist dari Nexa API."
      });
    }

    const json = await response.json();

    if (!json.status || !json.tracks || !json.tracks.length) {
      return res.status(404).json({
        status: false,
        message: "Playlist tidak ditemukan atau kosong."
      });
    }

    return res.status(200).json({
      status: true,
      cover: json.data?.cover || "",
      title: json.data?.title || "Playlist",
      total: json.tracks.length,
      tracks: json.tracks.map((t) => ({
        cover: t.cover,
        title: t.title,
        artist: t.artists,
        album: t.album,
        duration: t.duration,
        spotify_url: t.url,
        // "query" is what we feed into the existing /api/spotify and
        // /api/play endpoints (they search by title text, not by URL)
        query: t.title
      }))
    });

  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message
    });
  }
}
