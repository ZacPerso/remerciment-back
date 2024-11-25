const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

// Load environment variables from the .env file
require("dotenv").config();

if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN || !process.env.RECIPIENT_EMAIL) {
  console.error("Missing Mailgun environment variables. Check your configuration.");
  process.exit(1);
}

const app = express();

// Constants for the application logic
const VALID_CODE = "143143"; // Code à valider pour générer un accès
const ADMIN_CODE = "599246"; // Code administrateur pour un nombre illimité de vues
const MAX_VIEWS = 2; // Nombre de vues autorisées pour un utilisateur normal
const views = {}; // Compteur de vues basé sur le code

app.use(cors());
app.use(express.json());

// Initialize the Mailgun client with formData and API credentials
const formData = require("form-data");
const Mailgun = require("mailgun.js");
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY, // API key loaded from .env
});

// Utility Function: Send email using Mailgun
const sendEmail = async (code, type) => {
  // Set email content based on the type of code
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
    // Construct email data
    const data = {
      from: `lionsoreky@gmail.com <postmaster@${process.env.MAILGUN_DOMAIN}>`,
      to: process.env.RECIPIENT_EMAIL, // Email recipient loaded from .env
      subject: subject,
      text: text,
      html: `<h1>${text}</h1>`, // Include HTML email body
    };

    // Send email using Mailgun
    const response = await mg.messages.create(process.env.MAILGUN_DOMAIN, data);
    console.log("Email sent successfully:", response);
  } catch (error) {
    // Log detailed error response
    console.error("Error sending email via Mailgun:", error.response?.data || error.message);
  }
};

// Route: Verify code and return the video URL
app.post("/api/verify", async (req, res) => {
  const { code } = req.body;

  if (code === ADMIN_CODE) {
    await sendEmail(code, "admin"); // Assurez-vous que l'email est bien envoyé avant de continuer
    return res.json({
      success: true,
      message: "Code admin valide",
      videoUrl: "https://www.youtube.com/embed/7B-0ZPrkym4?si=su9hVjuDaK0p84bi",
    });
  }

  if (code === VALID_CODE) {
    if (!views[code]) {
      views[code] = 0;
    }

    if (views[code] < MAX_VIEWS) {
      views[code]++;
      await sendEmail(code, "normal"); // Assurez-vous que l'email est bien envoyé avant de continuer
      return res.json({
        success: true,
        message: "Code valide",
        videoUrl: "https://www.youtube.com/embed/7B-0ZPrkym4?si=su9hVjuDaK0p84bi",
      });
    } else {
      return res.status(403).json({
        success: false,
        message: "Nombre de vues atteint pour ce code",
      });
    }
  }

  return res.status(401).json({ success: false, message: "Code invalide" });
});

// Route: Stream the video
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

// Route: Serve static HTML page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
