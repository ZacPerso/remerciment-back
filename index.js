const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

// Load environment variables from the .env file
require('dotenv').config();

const app = express();

const VALID_CODE = "143143"; // Code à valider pour générer un accès
const ADMIN_CODE = "599246"; // Code administrateur pour un nombre illimité de vues

const MAX_VIEWS = 2; // Nombre de vues autorisées pour un utilisateur normal
const views = {}; // Compteur de vues basé sur le code

app.use(cors());
app.use(express.json());

// Configurer Nodemailer avec les variables d'environnement
const transporter = nodemailer.createTransport({
  host: "smtp.mailgun.org",
  port: 587,
  auth: {
    user: `postmaster@${process.env.MAILGUN_DOMAIN}`, // Use environment variable for domain
    pass: process.env.MAILGUN_API_KEY, // Use environment variable for API key
  },
});

// Fonction pour envoyer un email
const sendEmail = (code, type) => {
  let subject = "";
  let text = "";

  if (type === "admin") {
    subject = "Code administrateur utilisé";
    text = `Le code administrateur "${code}" a été utilisé. Il n'y a pas de limite de vues.`;
  } else {
    subject = "Code normal utilisé";
    text = `Le code normal "${code}" a été utilisé.`;
  }

  const mailOptions = {
    from: process.env.SENDER_EMAIL, // Sender email from environment variable
    to: process.env.RECIPIENT_EMAIL, // Recipient email from environment variable
    subject: subject,
    text: text,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Erreur lors de l'envoi de l'email:", error);
    } else {
      console.log("Email envoyé:", info.response);
    }
  });
};

// Route pour vérifier le code et renvoyer l'URL de la vidéo
app.post("/api/verify", (req, res) => {
  const { code } = req.body;

  // Vérification du code
  if (code === ADMIN_CODE) {
    // Code admin : aucune limite de vues

    // Send email notification for admin code
    sendEmail(code, "admin");

    return res.json({
      success: true,
      message: "Code admin valide",
      videoUrl: "https://youtu.be/7B-0ZPrkym4", // URL de la vidéo
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

      // Envoyer un email pour notifier l'utilisation
      sendEmail(code, "normal");

      return res.json({
        success: true,
        message: "Code valide",
        videoUrl: "https://youtu.be/7B-0ZPrkym4", // URL de la vidéo
      });
    } else {
      // Si le nombre de vues a atteint la limite, refuser l'accès
      return res.status(403).json({
        success: false,
        message: "Nombre de vues atteint pour ce code",
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
