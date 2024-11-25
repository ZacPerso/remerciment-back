const express = require("express");
const cors = require("cors");
const app = express();
const fs = require("fs");
const path = require("path");

const VALID_CODE = "12345"; // Code à valider pour générer un accès
const ADMIN_CODE = "admin123"; // Code administrateur pour un nombre illimité de vues

const MAX_VIEWS = 2; // Nombre de vues autorisées pour un utilisateur normal
const views = {}; // Compteur de vues basé sur le code

app.use(cors());
app.use(express.json());

// Route pour vérifier le code et renvoyer l'URL de la vidéo
app.post("/api/verify", (req, res) => {
  const { code } = req.body;

  // Vérification du code
  if (code === ADMIN_CODE) {
    // Code admin : aucune limite de vues
    return res.json({
      success: true,
      message: "Code admin valide",
      videoUrl: "/video" // URL de la vidéo
    });
  }

  if (code === VALID_CODE) {
    // Code normal : vérifier le nombre de vues
    if (!views[code]) {
      views[code] = 0;
    }

    if (views[code] < MAX_VIEWS) {
      // Si le nombre de vues est inférieur au maximum, autoriser l'accès
      views[code]++;
      return res.json({
        success: true,
        message: "Code valide",
        videoUrl: "/video" // URL de la vidéo
      });
    } else {
      // Si le nombre de vues a atteint la limite, refuser l'accès
      return res.status(403).json({
        success: false,
        message: "Nombre de vues atteint pour ce code"
      });
    }
  }

  return res.status(401).json({ success: false, message: "Code invalide" });
});

// Route pour streamer la vidéo
app.get("/video", (req, res) => {
  const videoPath = path.resolve(__dirname, "zac.mp4");
  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    res.status(206);
    res.set("Content-Range", `bytes ${start}-${end}/${fileSize}`);
    res.set("Accept-Ranges", "bytes");
    res.set("Content-Length", end - start + 1);
    res.set("Content-Type", "video/mp4");

    const stream = fs.createReadStream(videoPath, { start, end });
    stream.pipe(res);
  } else {
    res.set("Content-Length", fileSize);
    res.set("Content-Type", "video/mp4");
    fs.createReadStream(videoPath).pipe(res);
  }
});

// Serve static HTML page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
