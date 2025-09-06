import express from "express";
import cors from "cors";
import { OBSClient } from "./obs-client";
import { OBSConnectionConfig, ApiResponse, OBSScene } from "./types";

const app = express();
const port = parseInt(process.env.PORT || "3001", 10);

// Middleware
app.use(cors());
app.use(express.json());

// OBS Client instance
const obsClient = new OBSClient();

// Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.get("/api/status", (req, res) => {
  console.log("📊 GET /api/status called");
  const status = obsClient.getConnectionStatus();
  console.log("📊 Current status:", status);
  res.json({ success: true, data: status });
});

app.post("/api/connect", async (req, res) => {
  console.log("🌐 POST /api/connect called with body:", req.body);
  try {
    const config: OBSConnectionConfig = req.body;

    if (!config.address || !config.port) {
      console.log("❌ Missing address or port");
      return res.status(400).json({
        success: false,
        error: "Address and port are required",
      });
    }

    console.log("📡 Calling obsClient.connect()...");
    const result = await obsClient.connect(config);

    if (result.connected) {
      console.log("✅ Connection successful, returning success response");
      res.json({ success: true, data: result });
    } else {
      console.log("❌ Connection failed, returning error response");
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.log("💥 Exception in /api/connect:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.post("/api/disconnect", async (req, res) => {
  try {
    await obsClient.disconnect();
    res.json({ success: true, data: { connected: false } });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.get("/api/scenes", async (req, res) => {
  try {
    const scenes = await obsClient.getScenes();
    const currentScene = await obsClient.getCurrentScene();

    res.json({
      success: true,
      data: {
        scenes,
        currentScene,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.post("/api/scenes/switch", async (req, res) => {
  try {
    const { sceneName } = req.body;

    if (!sceneName) {
      return res.status(400).json({
        success: false,
        error: "Scene name is required",
      });
    }

    await obsClient.switchScene(sceneName);

    res.json({
      success: true,
      data: { sceneName },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.post("/api/scenes/refresh", async (req, res) => {
  try {
    await obsClient.refreshScenes();
    const scenes = await obsClient.getScenes();
    const currentScene = await obsClient.getCurrentScene();

    res.json({
      success: true,
      data: {
        scenes,
        currentScene,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Start server
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 OBS Controller Backend running on port ${port}`);
  console.log(`📱 Access from mobile: http://[YOUR_IP]:${port}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down server...");
  await obsClient.disconnect();
  process.exit(0);
});
