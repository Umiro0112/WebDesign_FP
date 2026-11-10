import { initializeGame } from "./game.js";
import { initializeLesson, readSavedPhrases } from "./lesson.js";

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
  let selectedLanguage = "Japanese";
  let currentScene = "map";

  function renderBag(phrases = readSavedPhrases()) {
    const emptyState = app.querySelector("[data-bag-empty]");
    const list = app.querySelector("[data-bag-list]");
    const count = app.querySelector(".bag-count");
    count.textContent = String(phrases.length);
    emptyState.hidden = phrases.length > 0;
    list.replaceChildren();

    phrases
      .slice()
      .reverse()
      .forEach((item) => {
        const card = document.createElement("article");
        card.className = "phrase-card";

        const language = document.createElement("p");
        language.className = "phrase-language";
        language.textContent = item.language;

        const phrase = document.createElement("h3");
        phrase.lang = item.locale;
        phrase.textContent = item.phrase;

        const guide = document.createElement("p");
        guide.className = "phrase-guide";
        guide.textContent = item.guide;
        guide.hidden = !item.guide;

        const meaning = document.createElement("p");
        meaning.className = "phrase-meaning";
        meaning.textContent = item.meaning;

        card.append(language, phrase, guide, meaning);
        list.append(card);
      });
  }

  function showScene(name) {
    currentScene = name;
    app.querySelectorAll("[data-scene]").forEach((scene) => {
      scene.hidden = scene.dataset.scene !== name;
    });

    const isMap = name === "map";
    app.querySelector("[data-scene-controls]").innerHTML = isMap
      ? "<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or arrow keys to move"
      : "Restaurant lesson";
    app.querySelector("[data-scene-instructions]").textContent = isMap
      ? "Walk up to a person or a door to interact."
      : "Complete each exchange and keep the phrases you need.";
  }

  const lesson = initializeLesson(app, {
    onSaved: renderBag,
    onComplete: (shouldExit = false) => {
      if (shouldExit) showScene("map");
    },
  });

  function openEncounter(name) {
    if (name === "restaurant") {
      closePanel();
      showScene("restaurant");
      lesson.start(selectedLanguage);
      return;
    }

    const encounter = encounters[name];
    if (!encounter) return;

    app.querySelector("[data-dialogue-eyebrow]").textContent = encounter.eyebrow;
    app.querySelector("[data-dialogue-title]").textContent = encounter.title;
    app.querySelector("[data-dialogue-description]").textContent = encounter.description;
    openPanel("dialogue");
  }

  const game = initializeGame(app, {
    onEncounter: openEncounter,
    isPaused: () => activePanel !== null || currentScene !== "map" || !app.querySelector('[data-screen="game"]').classList.contains("is-active"),
  });

  function showScreen(name) {
    if (!screenNames.includes(name)) return;

    app.querySelectorAll("[data-screen]").forEach((screen) => {
      const isActive = screen.dataset.screen === name;
      screen.classList.toggle("is-active", isActive);
      screen.setAttribute("aria-hidden", String(!isActive));
    });

    closePanel();
    if (name !== "game") showScene("map");
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
      selectedLanguage = languageButton.dataset.language;
      app.querySelectorAll("[data-selected-language]").forEach((label) => {
        label.textContent = selectedLanguage;
      });
      showScene("map");
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
      "exit-interior": () => showScene("map"),
    };

    actions[actionButton.dataset.action]?.();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (activePanel) closePanel();
    else if (currentScene !== "map") showScene("map");
  });

  renderBag();
}
