const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

// Load environment variables from the .env file
require('dotenv').config();

if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
  console.error("Missing Mailgun environment variables. Check Vercel configuration.");
  process.exit(1);
}

const app = express();

const VALID_CODE = "143143"; // Code à valider pour générer un accès
const ADMIN_CODE = "599246"; // Code administrateur pour un nombre illimité de vues

const MAX_VIEWS = 2; // Nombre de vues autorisées pour un utilisateur normal
const views = {}; // Compteur de vues basé sur le code

app.use(cors());
app.use(express.json());

// Function to send email via Mailgun API using Axios
const sendEmail = async (code, type) => {
  let subject = "";
  let text = "";

  if (type === "admin") {
    subject = "Code administrateur utilisé";
    text = `Le code administrateur "${code}" a été utilisé. Il n'y a pas de limite de vues.`;
  } else {
    subject = "Code normal utilisé";
    text = `Le code normal "${code}" a été utilisé.`;
  }

  try {
    const response = await axios.post(
      `https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN}/messages`,
      new URLSearchParams({
        from: `Your Name <postmaster@${process.env.MAILGUN_DOMAIN}>`,
        to: process.env.RECIPIENT_EMAIL,
        subject: subject,
        text: text,
      }),
      {
        auth: {
          username: "api",
          password: process.env.MAILGUN_API_KEY,
        },
      }
    );

    console.log("Email sent:", response.data);
  } catch (error) {
    console.error("Error sending email via Mailgun API:", error.response?.data || error.message);
  }
};

// Route to verify code and return the video URL
app.post("/api/verify", (req, res) => {
  const { code } = req.body;

  // Check for admin code
  if (code === ADMIN_CODE) {
    // Admin code: no limit on views
    sendEmail(code, "admin");

    return res.json({
      success: true,
      message: "Code admin valide",
      videoUrl: "https://www.youtube.com/embed/7B-0ZPrkym4?si=su9hVjuDaK0p84bi", // Video URL
    });
  }

  // Check for normal code
  if (code === VALID_CODE) {
    if (!views[code]) {
      views[code] = 0;
    }

    if (views[code] < MAX_VIEWS) {
      // If views are below the max, allow access
      views[code]++;

      // Send email notification for normal code use
      sendEmail(code, "normal");

      return res.json({
        success: true,
        message: "Code valide",
        videoUrl: "https://www.youtube.com/embed/7B-0ZPrkym4?si=su9hVjuDaK0p84bi", // Video URL
      });
    } else {
      // If views limit is reached, deny access
      return res.status(403).json({
        success: false,
        message: "Nombre de vues atteint pour ce code",
      });
    }
  }

  return res.status(401).json({ success: false, message: "Code invalide" });
});

// Route to stream the video
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
