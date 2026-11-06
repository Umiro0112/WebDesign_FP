const screenNames = ["welcome", "language", "game"];

export function initializeUI(app) {
  const backdrop = app.querySelector(".backdrop");
  let activePanel = null;

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
    const panelButton = event.target.closest("[data-panel-target]");
    const actionButton = event.target.closest("[data-action]");

    if (languageButton) {
      app.querySelectorAll("[data-selected-language]").forEach((label) => {
        label.textContent = languageButton.dataset.language;
      });
      showScreen("game");
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
      "preview-dialogue": () => openPanel("dialogue"),
    };

    actions[actionButton.dataset.action]?.();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePanel();
  });
}
