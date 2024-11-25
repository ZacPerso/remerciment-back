const express = require("express");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(express.json());

// Secret and Code
const SECRET_KEY = process.env.SECRET_KEY || "supersecret";
const VALID_CODE = process.env.VALID_CODE || "12345";

// Root Route
app.get("/", (req, res) => {
    res.send("Server is running!");
});

// Verify Code and Issue Token
app.post("/api/verify", (req, res) => {
    const { code } = req.body;

    if (code === VALID_CODE) {
        const token = jwt.sign({ access: "granted" }, SECRET_KEY, { expiresIn: "1h" });
        return res.json({ success: true, token });
    }

    res.status(401).json({ success: false, message: "Invalid code" });
});

// Access Video with Token
app.get("/api/video", (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "Authorization token required" });
    }

    const token = authHeader.split(" ")[1];

    try {
        jwt.verify(token, SECRET_KEY);
        res.json({ success: true, videoUrl: "https://your-video-url.com/video.mp4" });
    } catch (err) {
        res.status(403).json({ success: false, message: "Invalid or expired token" });
    }
});

// Export for Vercel
module.exports = app;
