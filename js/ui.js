import { initializeGame } from "./game.js";

const screenNames = ["welcome", "language", "game"];

const encounters = {
  restaurant: {
    eyebrow: "Restaurant encounter",
    title: "Order something you want.",
    description: "Practice a useful ordering conversation with the restaurant staff.",
  },
  market: {
    eyebrow: "Market encounter",
    title: "Find an item in the market.",
    description: "Ask where something is, understand the answer, and continue shopping.",
  },
  bookstore: {
    eyebrow: "Bookstore encounter",
    title: "Ask for a recommendation.",
    description: "Describe what you like and practice asking a bookseller for help.",
  },
  passerby: {
    eyebrow: "Street encounter",
    title: "Ask a local for directions.",
    description: "Start a short, practical conversation with someone in the neighborhood.",
  },
};

export function initializeUI(app) {
  const backdrop = app.querySelector(".backdrop");
  let activePanel = null;

  function openEncounter(name) {
    const encounter = encounters[name];
    if (!encounter) return;

    app.querySelector("[data-dialogue-eyebrow]").textContent = encounter.eyebrow;
    app.querySelector("[data-dialogue-title]").textContent = encounter.title;
    app.querySelector("[data-dialogue-description]").textContent = encounter.description;
    openPanel("dialogue");
  }

  const game = initializeGame(app, {
    onEncounter: openEncounter,
    isPaused: () => activePanel !== null || !app.querySelector('[data-screen="game"]').classList.contains("is-active"),
  });

  function showScreen(name) {
    if (!screenNames.includes(name)) return;

    app.querySelectorAll("[data-screen]").forEach((screen) => {
      const isActive = screen.dataset.screen === name;
      screen.classList.toggle("is-active", isActive);
      screen.setAttribute("aria-hidden", String(!isActive));
    });

    closePanel();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openPanel(name) {
    closePanel();
    const panel = app.querySelector(`[data-panel="${name}"]`);
    if (!panel) return;

    activePanel = panel;
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    backdrop.hidden = false;

    app.querySelectorAll(`[data-panel-target="${name}"]`).forEach((button) => {
      button.setAttribute("aria-expanded", "true");
    });
  }

  function closePanel() {
    if (activePanel) {
      activePanel.classList.remove("is-open");
      activePanel.setAttribute("aria-hidden", "true");
    }

    app.querySelectorAll("[data-panel-target]").forEach((button) => {
      button.setAttribute("aria-expanded", "false");
    });

    backdrop.hidden = true;
    activePanel = null;
  }

  app.addEventListener("click", (event) => {
    const languageButton = event.target.closest("[data-language]");
    const encounterButton = event.target.closest("[data-encounter]");
    const panelButton = event.target.closest("[data-panel-target]");
    const actionButton = event.target.closest("[data-action]");

    if (languageButton) {
      app.querySelectorAll("[data-selected-language]").forEach((label) => {
        label.textContent = languageButton.dataset.language;
      });
      showScreen("game");
      game.reset();
      return;
    }

    if (encounterButton) {
      openEncounter(encounterButton.dataset.encounter);
      return;
    }

    if (panelButton) {
      openPanel(panelButton.dataset.panelTarget);
      return;
    }

    if (!actionButton) return;

    const actions = {
      "choose-language": () => showScreen("language"),
      "go-home": () => showScreen("welcome"),
      "close-panel": closePanel,
      "game-interact": game.interact,
    };

    actions[actionButton.dataset.action]?.();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePanel();
  });
}
