const MOVE_KEYS = {
  ArrowUp: "up",
  w: "up",
  W: "up",
  ArrowDown: "down",
  s: "down",
  S: "down",
  ArrowLeft: "left",
  a: "left",
  A: "left",
  ArrowRight: "right",
  d: "right",
  D: "right",
};

const VECTORS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const INTERACTION_LABELS = {
  restaurant: "Enter the restaurant",
  market: "Enter the market",
  bookstore: "Enter the bookstore",
  passerby: "Talk to the passerby",
};

export function initializeGame(app, { onEncounter, isPaused }) {
  const world = app.querySelector(".game-world");
  const player = app.querySelector(".player");
  const playerBody = player?.querySelector("span");
  const prompt = app.querySelector(".interaction-prompt");
  const promptLabel = app.querySelector("[data-interaction-label]");
  const status = app.querySelector("[data-map-status]");
  const obstacles = [...app.querySelectorAll("[data-obstacle]")];
  const encounters = [...app.querySelectorAll("[data-encounter]")];
  const pressedDirections = new Set();
  let position = { x: 52, y: 54 };
  let nearbyEncounter = null;
  let animationFrame = null;
  let previousTime = 0;

  if (!world || !player || !playerBody || !prompt || !status) {
    return { interact() {}, reset() {} };
  }

  function renderPosition() {
    player.style.setProperty("--player-x", `${position.x}%`);
    player.style.setProperty("--player-y", `${position.y}%`);
  }

  function getPlayerCenter(nextPosition = position) {
    const worldRect = world.getBoundingClientRect();
    return {
      x: worldRect.left + (nextPosition.x / 100) * worldRect.width,
      y: worldRect.top + (nextPosition.y / 100) * worldRect.height,
      worldRect,
    };
  }

  function isBlocked(nextPosition) {
    const { x, y, worldRect } = getPlayerCenter(nextPosition);
    const halfWidth = playerBody.offsetWidth / 2 + 3;
    const halfHeight = playerBody.offsetHeight / 2 + 3;

    if (
      x - halfWidth < worldRect.left ||
      x + halfWidth > worldRect.right ||
      y - halfHeight < worldRect.top ||
      y + halfHeight > worldRect.bottom
    ) {
      return true;
    }

    return obstacles.some((obstacle) => {
      const rect = obstacle.getBoundingClientRect();
      return (
        x + halfWidth > rect.left &&
        x - halfWidth < rect.right &&
        y + halfHeight > rect.top &&
        y - halfHeight < rect.bottom
      );
    });
  }

  function moveBy(deltaX, deltaY) {
    let moved = false;
    const nextX = { x: position.x + deltaX, y: position.y };
    const nextY = { x: position.x, y: position.y + deltaY };

    if (deltaX && !isBlocked(nextX)) {
      position.x = nextX.x;
      moved = true;
    }

    if (deltaY) {
      nextY.x = position.x;
      if (!isBlocked(nextY)) {
        position.y = nextY.y;
        moved = true;
      }
    }

    renderPosition();
    updateNearbyEncounter();

    if (!moved && (deltaX || deltaY)) {
      status.textContent = "That path is blocked";
    }
  }

  function distanceTo(rect, point) {
    const nearestX = Math.max(rect.left, Math.min(point.x, rect.right));
    const nearestY = Math.max(rect.top, Math.min(point.y, rect.bottom));
    return Math.hypot(point.x - nearestX, point.y - nearestY);
  }

  function updateNearbyEncounter() {
    const center = getPlayerCenter();
    const threshold = Math.max(38, Math.min(center.worldRect.width, center.worldRect.height) * 0.065);
    let closest = null;
    let closestDistance = Infinity;

    encounters.forEach((encounter) => {
      const distance = distanceTo(encounter.getBoundingClientRect(), center);
      if (distance < closestDistance) {
        closest = encounter;
        closestDistance = distance;
      }
    });

    nearbyEncounter = closestDistance <= threshold ? closest : null;
    prompt.hidden = !nearbyEncounter;

    if (nearbyEncounter) {
      const label = INTERACTION_LABELS[nearbyEncounter.dataset.encounter];
      promptLabel.textContent = label;
      status.textContent = `${label} — press E`;
    } else {
      status.textContent = "Explore the neighborhood";
    }
  }

  function interact() {
    if (nearbyEncounter && !isPaused()) {
      onEncounter(nearbyEncounter.dataset.encounter);
    }
  }

  function movementLoop(time) {
    const elapsed = Math.min((time - previousTime) / 1000 || 0, 0.04);
    previousTime = time;

    if (!isPaused() && pressedDirections.size) {
      const vector = [...pressedDirections].reduce(
        (result, direction) => ({
          x: result.x + VECTORS[direction].x,
          y: result.y + VECTORS[direction].y,
        }),
        { x: 0, y: 0 },
      );
      const length = Math.hypot(vector.x, vector.y) || 1;
      const speed = 21;
      moveBy((vector.x / length) * speed * elapsed, (vector.y / length) * speed * elapsed);
    }

    animationFrame = pressedDirections.size ? requestAnimationFrame(movementLoop) : null;
  }

  function beginMoving(direction, moveImmediately = false) {
    if (!VECTORS[direction] || isPaused()) return;
    const wasIdle = pressedDirections.size === 0;
    if (moveImmediately && !pressedDirections.has(direction)) {
      moveBy(VECTORS[direction].x * 1.1, VECTORS[direction].y * 1.1);
    }
    pressedDirections.add(direction);
    if (wasIdle && !animationFrame) {
      previousTime = performance.now();
      animationFrame = requestAnimationFrame(movementLoop);
    }
  }

  function stopMoving(direction) {
    pressedDirections.delete(direction);
  }

  document.addEventListener("keydown", (event) => {
    const direction = MOVE_KEYS[event.key];
    if (direction && !isPaused()) {
      event.preventDefault();
      beginMoving(direction, true);
      return;
    }

    const focusedElement = document.activeElement;
    const focusIsInteractive = focusedElement?.matches("button, a, input, textarea, select");
    if ((event.key === "e" || event.key === "E" || (event.key === "Enter" && !focusIsInteractive)) && !isPaused()) {
      event.preventDefault();
      interact();
    }
  });

  document.addEventListener("keyup", (event) => {
    const direction = MOVE_KEYS[event.key];
    if (direction) stopMoving(direction);
  });

  app.querySelectorAll("[data-direction]").forEach((button) => {
    const direction = button.dataset.direction;
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      moveBy(VECTORS[direction].x * 1.8, VECTORS[direction].y * 1.8);
      beginMoving(direction);
      button.setPointerCapture?.(event.pointerId);
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((eventName) => {
      button.addEventListener(eventName, () => stopMoving(direction));
    });
    button.addEventListener("click", (event) => {
      if (event.detail === 0) moveBy(VECTORS[direction].x * 1.8, VECTORS[direction].y * 1.8);
    });
  });

  window.addEventListener("blur", () => pressedDirections.clear());
  window.addEventListener("resize", () => {
    if (isBlocked(position)) {
      reset();
    } else {
      updateNearbyEncounter();
    }
  });

  function reset() {
    position = { x: 52, y: 54 };
    pressedDirections.clear();
    renderPosition();
    requestAnimationFrame(updateNearbyEncounter);
  }

  renderPosition();
  return { interact, reset, updateNearbyEncounter };
}
