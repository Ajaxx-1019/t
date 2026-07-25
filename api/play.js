export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {

    const q = (req.query.q || "").trim();

    if (!q) {
      return res.status(400).json({
        status:false,
        message:"Parameter q wajib diisi."
      });
    }

    // Cari lagu
    const search = await fetch(
      `https://api.nexadev.my.id/api/spotifyplay?q=${encodeURIComponent(q)}`
    );

    const json = await search.json();

    if(!json.status){
      return res.status(404).json({
        status:false,
        message:"Lagu tidak ditemukan."
      });
    }

    const url = json.result.download_url;

    // Ambil MP3
    const mp3 = await fetch(url,{
      headers:{
        "User-Agent":"Mozilla/5.0"
      }
    });

    if(!mp3.ok){
      return res.status(500).json({
        status:false,
        message:"Gagal mengambil file MP3."
      });
    }

    res.setHeader("Content-Type","audio/mpeg");
    res.setHeader("Cache-Control","public,max-age=3600");

    const buffer = Buffer.from(await mp3.arrayBuffer());

    return res.status(200).send(buffer);

  } catch(err){

    return res.status(500).json({
      status:false,
      message:err.message
    });

  }

}