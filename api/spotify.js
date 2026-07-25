export default async function handler(req, res) {
  try {
    const q = req.query.q || "";

    if (!q) {
      return res.status(400).json({
        status: false,
        message: "Query kosong."
      });
    }

    const response = await fetch(
      `https://api.nexadev.my.id/api/spotifyplay?q=${encodeURIComponent(q)}`
    );

    const data = await response.json();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");

    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message
    });
  }
}