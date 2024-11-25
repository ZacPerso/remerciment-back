const express = require("express");
const jwt = require("jsonwebtoken");
const app = express();
const path = require("path");

const SECRET_KEY = "supersecretkey";
const VALID_CODE = "12345"; // Code à valider pour générer un token

app.use(express.json());

// Vérifier si le token JWT est valide (optionnel si tu veux protéger l'URL)
const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token manquant" });
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Token invalide ou expiré" });
    }
    next();
  });
};

// Route pour vérifier le code et renvoyer l'URL de la vidéo
app.post("/api/verify", (req, res) => {
  const { code } = req.body;

  // Vérification du code
  if (code === VALID_CODE) {
    // Optionnellement, tu peux ici générer un token JWT
    const token = jwt.sign({ access: "granted" }, SECRET_KEY, { expiresIn: "1h" });

    // Envoie de l'URL de la vidéo (ici c'est un fichier local, mais tu peux le modifier pour pointer vers un serveur CDN)
    const videoUrl = "https://github.com/ZacPerso/remerciment/blob/main/zac.mp4"; // Remplace par ton URL vidéo

    return res.json({
      success: true,
      message: "Code valide",
      videoUrl: videoUrl,
      token: token // Tu peux envoyer le token si tu veux sécuriser l'accès à la vidéo
    });
  }

  return res.status(401).json({ success: false, message: "Code invalide" });
});

// Route pour streamer la vidéo
app.get("/video", verifyToken, (req, res) => {
  const videoPath = path.resolve(__dirname, "zac.mp4");
  res.sendFile(videoPath);
});

// Serve static HTML page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
