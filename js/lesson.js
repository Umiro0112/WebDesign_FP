import { restaurantLessons } from "./language-data.js";

const STORAGE_KEY = "neighborhood-saved-phrases";
let memoryPhrases = [];

function normalizeAnswer(value) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[.,!?。！？、，]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function readSavedPhrases() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return memoryPhrases;
  }
}

function writeSavedPhrases(phrases) {
  memoryPhrases = phrases;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(phrases));
  } catch {
    // The in-memory copy still keeps the feature usable when storage is blocked.
  }
}

export function initializeLesson(app, { onSaved, onComplete }) {
  const content = app.querySelector("[data-lesson-content]");
  const stepLabel = app.querySelector("[data-lesson-step]");
  const totalLabel = app.querySelector("[data-lesson-total]");
  let language = "Japanese";
  let lesson = restaurantLessons[language];
  let stepIndex = 0;
  let isCorrect = false;
  let selectedAnswer = null;
  let useChoices = false;

  function currentStep() {
    return lesson.steps[stepIndex];
  }

  function isSaved(step) {
    const phrase = step.answers[step.correct];
    return readSavedPhrases().some((item) => item.language === language && item.phrase === phrase);
  }

  function renderChoices(step) {
    return `
      <div class="answer-grid" role="group" aria-label="Answer choices">
        ${step.answers
          .map((answer, index) => {
            const classes = ["answer-option"];
            if (isCorrect && index === step.correct) classes.push("is-correct");
            if (!isCorrect && selectedAnswer === index) classes.push("is-wrong");
            return `<button class="${classes.join(" ")}" type="button" data-lesson-choice="${index}" ${isCorrect ? "disabled" : ""}><span>${answer}</span></button>`;
          })
          .join("")}
      </div>`;
  }

  function renderTyping(step) {
    if (useChoices) return renderChoices(step);
    return `
      <form class="typing-form" data-typing-form>
        <label for="typed-answer">Type your answer in ${language}</label>
        <div class="typing-row">
          <input id="typed-answer" name="answer" autocomplete="off" lang="${lesson.locale}" placeholder="Type your sentence…" required>
          <button class="secondary-button" type="submit">Check</button>
        </div>
      </form>
      <button class="help-answer-button" type="button" data-lesson-show-choices>Need help? Show choices</button>`;
  }

  function render() {
    const step = currentStep();
    stepLabel.textContent = String(stepIndex + 1);
    totalLabel.textContent = String(lesson.steps.length);
    const saved = isSaved(step);

    content.innerHTML = `
      <div class="staff-line">
        <span class="speaker-label">Staff</span>
        <p lang="${lesson.locale}">${step.staff}</p>
        ${step.staffGuide ? `<small>${step.staffGuide}</small>` : ""}
      </div>
      <div class="lesson-goal">
        <p class="eyebrow">Your goal</p>
        <h3>${step.goal}</h3>
      </div>
      ${step.mode === "type" ? renderTyping(step) : renderChoices(step)}
      <p class="answer-feedback ${isCorrect ? "is-success" : selectedAnswer !== null ? "is-error" : ""}" data-answer-feedback role="status">
        ${isCorrect ? "Correct — that sounds natural and polite." : selectedAnswer !== null ? "Not quite. Look at the situation and try again." : "Choose an answer to continue."}
      </p>
      ${
        isCorrect
          ? `<div class="lesson-actions">
              <button class="keep-phrase-button ${saved ? "is-saved" : ""}" type="button" data-lesson-save ${saved ? "disabled" : ""}>${saved ? "✓ Saved to your bag" : "+ Keep this sentence"}</button>
              <button class="primary-button lesson-next" type="button" data-lesson-next>${stepIndex === lesson.steps.length - 1 ? "Finish conversation" : "Next exchange"} <span aria-hidden="true">→</span></button>
            </div>`
          : ""
      }`;
  }

  function markChoice(index) {
    const step = currentStep();
    selectedAnswer = index;
    isCorrect = index === step.correct;
    render();
  }

  function checkTypedAnswer(value) {
    const step = currentStep();
    const answer = normalizeAnswer(value);
    const accepted = step.accepted.map(normalizeAnswer);

    if (accepted.includes(answer)) {
      isCorrect = true;
      render();
      return;
    }

    const input = content.querySelector("#typed-answer");
    const feedback = content.querySelector("[data-answer-feedback]");
    input.setAttribute("aria-invalid", "true");
    feedback.className = "answer-feedback is-error";
    feedback.textContent = "Not quite. Check the wording or use the choices for help.";
  }

  function saveCurrentPhrase() {
    const step = currentStep();
    const phrase = step.answers[step.correct];
    const phrases = readSavedPhrases();
    if (phrases.some((item) => item.language === language && item.phrase === phrase)) return;

    phrases.push({
      id: `${language}-${phrase}`,
      language,
      locale: lesson.locale,
      phrase,
      meaning: step.goal.replace(/^Tell the staff: /, ""),
      guide: step.guide || "",
    });
    writeSavedPhrases(phrases);
    onSaved(phrases);
    render();
  }

  function advance() {
    if (!isCorrect) return;
    if (stepIndex === lesson.steps.length - 1) {
      content.innerHTML = `
        <div class="lesson-complete">
          <span aria-hidden="true">✓</span>
          <p class="eyebrow">Conversation complete</p>
          <h3>You ordered a meal in ${language}.</h3>
          <p>You can review any saved sentences in your bag, or return to the street and choose another encounter.</p>
          <div class="lesson-actions">
            <button class="secondary-button" type="button" data-lesson-restart>Practice again</button>
            <button class="primary-button" type="button" data-lesson-exit>Return to the street <span aria-hidden="true">→</span></button>
          </div>
        </div>`;
      stepLabel.textContent = String(lesson.steps.length);
      onComplete();
      return;
    }

    stepIndex += 1;
    isCorrect = false;
    selectedAnswer = null;
    useChoices = false;
    render();
  }

  content.addEventListener("click", (event) => {
    const choice = event.target.closest("[data-lesson-choice]");
    if (choice) markChoice(Number(choice.dataset.lessonChoice));
    if (event.target.closest("[data-lesson-show-choices]")) {
      useChoices = true;
      render();
    }
    if (event.target.closest("[data-lesson-save]")) saveCurrentPhrase();
    if (event.target.closest("[data-lesson-next]")) advance();
    if (event.target.closest("[data-lesson-restart]")) start(language);
    if (event.target.closest("[data-lesson-exit]")) onComplete(true);
  });

  content.addEventListener("submit", (event) => {
    if (!event.target.matches("[data-typing-form]")) return;
    event.preventDefault();
    checkTypedAnswer(new FormData(event.target).get("answer") || "");
  });

  function start(nextLanguage) {
    language = restaurantLessons[nextLanguage] ? nextLanguage : "Japanese";
    lesson = restaurantLessons[language];
    stepIndex = 0;
    isCorrect = false;
    selectedAnswer = null;
    useChoices = false;
    render();
  }

  return { start };
}
