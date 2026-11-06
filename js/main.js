import { initializeUI } from "./ui.js";

const app = document.querySelector("#app");

if (app) {
  initializeUI(app);
  app.dataset.status = "ready";
}
