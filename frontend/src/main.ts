import "./style.css";
import { OBSClient } from "./obs-client";
import { UI } from "./ui";

async function init() {
  const app = document.getElementById("app");
  if (!app) {
    console.error("App element not found");
    return;
  }

  // Initialize OBS client and UI
  const obsClient = new OBSClient();
  const ui = new UI(app);
  ui.setOBSClient(obsClient);

  // Render the UI
  ui.render();

  // Show the interface immediately
  ui.showScenesPanel();

  // Check connection status and load data
  try {
    const status = await obsClient.getConnectionStatus();
    ui.updateConnectionStatus(status);
    
    if (status.connected) {
      await ui.loadScenes();
    }
  } catch (error) {
    console.error("Failed to initialize:", error);
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", init);