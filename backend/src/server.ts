import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { OBSClient } from "./obs-client";
import { OBSConnectionConfig, ApiResponse, OBSScene } from "./types";

// Load environment variables
dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || "3001", 10);

// Middleware
app.use(cors());
app.use(express.json());

// OBS Client instance
const obsClient = new OBSClient();

// Auto-connect to OBS on startup
async function autoConnect() {
  const config: OBSConnectionConfig = {
    address: process.env.OBS_ADDRESS || "localhost",
    port: parseInt(process.env.OBS_PORT || "4455", 10),
    password: process.env.OBS_PASSWORD || undefined,
  };

  console.log("🔄 Attempting auto-connection to OBS...");
  try {
    const result = await obsClient.connect(config);
    if (result.connected) {
      console.log("✅ Auto-connected to OBS successfully!");
    } else {
      console.log("❌ Auto-connection failed:", result.error);
    }
  } catch (error) {
    console.log("❌ Auto-connection error:", error);
  }
}

// Start auto-connection after a short delay
setTimeout(autoConnect, 2000);

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

// Connection management - removed since we auto-connect

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

// Microphone controls
app.post("/api/mic/toggle", async (req, res) => {
  try {
    const { sourceName } = req.body;
    if (!sourceName) {
      return res.status(400).json({
        success: false,
        error: "Source name is required",
      });
    }

    const muted = await obsClient.toggleMute(sourceName);
    res.json({
      success: true,
      data: { muted, sourceName },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.post("/api/mic/set", async (req, res) => {
  try {
    const { sourceName, muted } = req.body;
    if (!sourceName || typeof muted !== "boolean") {
      return res.status(400).json({
        success: false,
        error: "Source name and muted status are required",
      });
    }

    await obsClient.setMute(sourceName, muted);
    res.json({
      success: true,
      data: { muted, sourceName },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Camera controls
app.post("/api/camera/toggle", async (req, res) => {
  try {
    const { sourceName } = req.body;
    if (!sourceName) {
      return res.status(400).json({
        success: false,
        error: "Source name is required",
      });
    }

    const enabled = await obsClient.toggleCamera(sourceName);
    res.json({
      success: true,
      data: { enabled, sourceName },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.get("/api/camera/status/:sourceName", async (req, res) => {
  try {
    const { sourceName } = req.params;
    const enabled = await obsClient.getCameraStatus(sourceName);
    res.json({ success: true, data: { enabled, sourceName } });
  } catch (error) {
    console.error("Camera status error:", error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to get camera status" 
    });
  }
});

// Debug endpoint to list all sources in current scene
app.get("/api/debug/scene-sources", async (req, res) => {
  try {
    if (!obsClient.getConnectionStatus().connected) {
      return res.status(400).json({ 
        success: false, 
        error: "Not connected to OBS" 
      });
    }
    
    // Use the existing methods instead of direct obs access
    const scenes = await obsClient.getScenes();
    const currentScene = await obsClient.getCurrentScene();
    
    // We need to add a method to get scene sources
    res.json({ 
      success: true, 
      data: { 
        currentScene,
        message: "Please reconnect to OBS and try the camera toggle again"
      } 
    });
  } catch (error) {
    console.error("Debug scene sources error:", error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to get scene sources" 
    });
  }
});

// Recording controls
app.post("/api/recording/toggle", async (req, res) => {
  try {
    const recording = await obsClient.toggleRecording();
    res.json({
      success: true,
      data: { recording },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.post("/api/recording/start", async (req, res) => {
  try {
    await obsClient.startRecording();
    res.json({
      success: true,
      data: { recording: true },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.post("/api/recording/stop", async (req, res) => {
  try {
    await obsClient.stopRecording();
    res.json({
      success: true,
      data: { recording: false },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Streaming controls
app.post("/api/streaming/toggle", async (req, res) => {
  try {
    const streaming = await obsClient.toggleStreaming();
    res.json({
      success: true,
      data: { streaming },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.post("/api/streaming/start", async (req, res) => {
  try {
    await obsClient.startStreaming();
    res.json({
      success: true,
      data: { streaming: true },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.post("/api/streaming/stop", async (req, res) => {
  try {
    await obsClient.stopStreaming();
    res.json({
      success: true,
      data: { streaming: false },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Status endpoints
app.get("/api/status/recording", async (req, res) => {
  try {
    const recording = await obsClient.getRecordingStatus();
    res.json({
      success: true,
      data: { recording },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.get("/api/status/streaming", async (req, res) => {
  try {
    const streaming = await obsClient.getStreamingStatus();
    res.json({
      success: true,
      data: { streaming },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get available sources
app.get("/api/sources/audio", async (req, res) => {
  try {
    const sources = await obsClient.getAudioSources();
    res.json({
      success: true,
      data: { sources },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.get("/api/sources/video", async (req, res) => {
  try {
    const sources = await obsClient.getVideoSources();
    res.json({
      success: true,
      data: { sources },
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
