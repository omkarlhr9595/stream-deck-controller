import "./style.css";
import { OBSClient } from "./obs-client";
import { UI } from "./ui";

class App {
  private obsClient: OBSClient;
  private ui: UI;

  constructor() {
    this.obsClient = new OBSClient();
    this.ui = new UI(document.getElementById("app")!);
    this.ui.setOBSClient(this.obsClient);
  }

  async init(): Promise<void> {
    this.ui.render();
    // Don't auto-connect on page load - let user connect manually
  }
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  const app = new App();
  app.init();
});
