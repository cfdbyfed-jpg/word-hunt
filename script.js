'use strict';

const state = { words: [], level: 'A1', mode: 'hangman', word: null, used: new Set(), mistakes: 0, tries: 0, hintUsed: false, finished: false, round: 1, score: 0, lastWord: '' };
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const el = (id) => document.getElementById(id);

async function loadWords() {
  try {
    const response = await fetch('./words.json');
    if (!response.ok) throw new Error('Dictionary could not be loaded.');
    const words = await response.json();
    if (!Array.isArray(words) || !words.every(isValidWord)) throw new Error('Dictionary data is incomplete.');
    const seen = new Set();
    for (const item of words) {
      const key = `${item.level}:${item.word.toLowerCase()}`;
      if (seen.has(key)) throw new Error(`Duplicate word: ${item.word}`);
      seen.add(key);
    }
    state.words = words;
    renderLevels();
    updateAvailability();
  } catch (error) {
    el('play-button').disabled = true;
    console.error(error);
  }
}

function isValidWord(item) {
  return item && /^[a-z]+$/i.test(item.word) && typeof item.translation === 'string' && item.translation.trim() && /^(A[12]|B[12]|C1)$/.test(item.level) && item.ipa && item.meaning && item.example;
}

function renderLevels() {
  const grid = el('level-grid');
  grid.replaceChildren();
  ['A1', 'A2', 'B1', 'B2', 'C1'].forEach((level) => {
    const label = document.createElement('label');
    label.className = 'level-option';
    const input = document.createElement('input');
    input.type = 'radio'; input.name = 'level'; input.value = level; input.checked = level === state.level;
    input.addEventListener('change', () => { state.level = level; updateAvailability(); });
    const text = document.createElement('span'); text.textContent = level;
    label.append(input, text); grid.append(label);
  });
}

function updateAvailability() {
  const count = state.words.filter((item) => item.level === state.level).length;
  el('play-button').disabled = !count;
}

function startGame() {
  state.mode = document.querySelector('input[name="mode"]:checked').value;
  updateAvailability();
  const pool = state.words.filter((item) => item.level === state.level);
  if (!pool.length) return;
  state.word = chooseWord(pool);
  state.used = new Set(); state.mistakes = 0; state.tries = 0; state.guesses = []; state.hintUsed = false; state.finished = false;
  el('home-screen').classList.add('hidden'); el('game-screen').classList.remove('hidden'); el('result-card').classList.add('hidden');
  el('game-level-tag').textContent = state.level; el('game-mode-tag').textContent = state.mode.toUpperCase();
  el('game-title').textContent = state.mode === 'hangman' ? 'Hangman' : 'Wordle';
  el('game-instruction').textContent = state.mode === 'hangman' ? 'Choose a letter to reveal the word.' : `Guess the ${state.word.word.length}-letter word in five tries.`;
  el('round-progress').textContent = String(state.round).padStart(2, '0');
  el('round-score').textContent = state.score;
  el('round-status-text').textContent = 'Ready when you are';
  const isWordle = state.mode === 'wordle';
  el('round-tip-text').textContent = isWordle ? 'Green: correct letter in the right place. Yellow: in the word, but in the wrong place.' : 'Start with a vowel — it’s a good place to begin.';
  el('round-tip-extra').textContent = 'Use the base form of a word. Plurals and other forms may not be included.';
  el('round-tip-extra').classList.toggle('hidden', !isWordle);
  el('hint-button').classList.toggle('hidden', state.mode !== 'hangman');
  el('input-message').textContent = '';
  el('hangman-illustration').classList.toggle('hidden', state.mode !== 'hangman');
  el('word-slots').classList.toggle('hidden', state.mode !== 'hangman');
  el('keyboard').classList.toggle('hidden', state.mode !== 'hangman');
  el('word-hint').classList.toggle('hidden', state.mode !== 'hangman');
  el('wordle-board').classList.toggle('hidden', state.mode !== 'wordle');
  el('wordle-entry').classList.toggle('hidden', state.mode !== 'wordle');
  el('wordle-keyboard').classList.toggle('hidden', state.mode !== 'wordle');
  if (state.mode === 'hangman') { renderHangman(); updateHintButton(); } else {
    const input = el('wordle-input');
    const wordLength = state.word.word.length;
    input.disabled = false; input.maxLength = wordLength; input.value = '';
    el('wordle-entry').querySelector('label').textContent = `Enter a ${wordLength}-letter word`;
    el('wordle-entry').querySelector('button').disabled = false;
    renderWordleBoard(); renderWordleKeyboard(); input.focus();
  }
}

function chooseWord(pool) {
  const options = pool.filter((item) => item.word.toLowerCase() !== state.lastWord.toLowerCase());
  const word = options[Math.floor(Math.random() * (options.length ? options : pool).length)] || pool[0];
  state.lastWord = word.word;
  return word;
}

function renderHangman() {
  const slots = el('word-slots'); slots.replaceChildren();
  for (const letter of state.word.word.toUpperCase()) {
    const slot = document.createElement('span'); slot.className = 'letter-slot'; slot.textContent = state.used.has(letter) || state.finished ? letter : ''; slots.append(slot);
  }
  el('mistakes-count').textContent = `${state.mistakes} / 6`;
  document.querySelectorAll('.hang-part').forEach((part) => part.classList.toggle('visible', Number(part.dataset.part) <= state.mistakes));
  const keyboard = el('keyboard'); keyboard.replaceChildren();
  for (const letter of alphabet) {
    const key = document.createElement('button'); key.type = 'button'; key.className = 'key'; key.textContent = letter; key.disabled = state.used.has(letter) || state.finished;
    if (state.used.has(letter)) key.classList.add(state.word.word.toUpperCase().includes(letter) ? 'correct' : 'incorrect');
    key.setAttribute('aria-label', `Guess ${letter}`); key.addEventListener('click', () => guessLetter(letter)); keyboard.append(key);
  }
}

function guessLetter(letter) {
  if (state.finished || state.used.has(letter)) return;
  state.used.add(letter);
  if (!state.word.word.toUpperCase().includes(letter)) state.mistakes++;
  renderHangman();
  if (isWordRevealed()) finishRound(true);
  else if (state.mistakes >= 6) finishRound(false);
}

function isWordRevealed() {
  return [...state.word.word.toUpperCase()].every((letter) => state.used.has(letter));
}

function updateHintButton() {
  const button = el('hint-button');
  button.disabled = state.finished || state.hintUsed;
  el('hint-button-text').textContent = state.hintUsed ? 'Hint used for this round.' : state.finished ? 'Round complete.' : 'Available once per round.';
}

function useHint() {
  if (state.mode !== 'hangman' || state.finished || state.hintUsed) return;
  const hiddenLetters = [...new Set(state.word.word.toUpperCase())].filter((letter) => !state.used.has(letter));
  if (!hiddenLetters.length) return;
  const letter = hiddenLetters[Math.floor(Math.random() * hiddenLetters.length)];
  state.used.add(letter);
  state.hintUsed = true;
  renderHangman();
  if (isWordRevealed()) finishRound(true);
  else updateHintButton();
}

function renderWordleBoard() {
  const board = el('wordle-board'); board.replaceChildren();
  const wordLength = state.word.word.length;
  board.style.setProperty('--word-length', wordLength);
  board.style.setProperty('--board-width', `${Math.min(560, wordLength * 38 + (wordLength - 1) * 5)}px`);
  for (let rowIndex = 0; rowIndex < 5; rowIndex++) {
    const row = document.createElement('div'); row.className = 'wordle-row';
    for (let col = 0; col < wordLength; col++) {
      const cell = document.createElement('span'); cell.className = 'wordle-cell';
      const guess = state.guesses?.[rowIndex];
      if (guess) { cell.textContent = guess.word[col]; cell.classList.add(guess.states[col]); }
      else if (!state.finished && rowIndex === state.tries && el('wordle-input').value[col]) { cell.textContent = el('wordle-input').value[col]; cell.classList.add('filled'); }
      row.append(cell);
    }
    board.append(row);
  }
}

function renderWordleKeyboard() {
  const keyboard = el('wordle-keyboard');
  keyboard.replaceChildren();
  const keyStates = getWordleKeyStates();
  ['QWERTYUIOP', 'ASDFGHJKL', 'ENTERZXCVBNMDELETE'].forEach((rowLetters) => {
    const row = document.createElement('div');
    row.className = 'wordle-keyboard-row';
    const keys = rowLetters === 'ENTERZXCVBNMDELETE' ? ['ENTER', ...'ZXCVBNM', 'DELETE'] : [...rowLetters];
    keys.forEach((letter) => {
      const key = document.createElement('button');
      key.type = 'button'; key.className = 'wordle-key'; key.disabled = state.finished;
      key.textContent = letter === 'DELETE' ? '⌫' : letter;
      key.setAttribute('aria-label', letter === 'DELETE' ? 'Delete letter' : letter === 'ENTER' ? 'Submit guess' : `Type ${letter}`);
      if (letter === 'ENTER' || letter === 'DELETE') key.classList.add('wordle-key-wide');
      if (keyStates[letter]) key.classList.add(keyStates[letter]);
      key.addEventListener('click', () => handleWordleKey(letter));
      row.append(key);
    });
    keyboard.append(row);
  });
}

function getWordleKeyStates() {
  const priority = { absent: 1, present: 2, correct: 3 };
  const states = {};
  (state.guesses || []).forEach((guess) => {
    [...guess.word.toUpperCase()].forEach((letter, index) => {
      if (!states[letter] || priority[guess.states[index]] > priority[states[letter]]) states[letter] = guess.states[index];
    });
  });
  return states;
}

function handleWordleKey(key) {
  if (state.mode !== 'wordle' || state.finished) return;
  const input = el('wordle-input');
  if (key === 'ENTER') { submitWordle(); return; }
  if (key === 'DELETE') input.value = input.value.slice(0, -1);
  else if (/^[A-Z]$/.test(key) && input.value.length < state.word.word.length) input.value += key.toLowerCase();
  else return;
  el('input-message').textContent = '';
  renderWordleBoard();
  input.focus();
}

function evaluateGuess(guess, answer) {
  const result = Array(answer.length).fill('absent');
  const remaining = answer.split('');
  for (let i = 0; i < answer.length; i++) if (guess[i] === remaining[i]) { result[i] = 'correct'; remaining[i] = null; }
  for (let i = 0; i < answer.length; i++) if (result[i] !== 'correct') { const at = remaining.indexOf(guess[i]); if (at !== -1) { result[i] = 'present'; remaining[at] = null; } }
  return result;
}

function submitWordle(event) {
  event?.preventDefault();
  if (state.finished) return;
  const input = el('wordle-input');
  const guess = input.value.trim().toLowerCase();
  const answer = state.word.word.toLowerCase();
  const wordLength = answer.length;
  if (guess.length !== wordLength || !/^[a-z]+$/.test(guess)) { el('input-message').textContent = `Please enter a complete ${wordLength}-letter word.`; input.focus(); return; }
  el('input-message').textContent = guess === answer ? '' : 'That’s not the right word.';
  const states = evaluateGuess(guess, answer);
  state.guesses.push({ word: guess, states }); state.tries++; input.value = ''; renderWordleBoard(); renderWordleKeyboard();
  if (guess === answer) finishRound(true);
  else if (state.tries >= 5) finishRound(false);
  else input.focus();
}

function finishRound(won) {
  state.finished = true;
  if (won) state.score++;
  el('round-score').textContent = state.score;
  el('round-status-text').textContent = won ? 'Word found!' : 'Round complete';
  el('result-eyebrow').textContent = won ? 'NICE WORK' : 'KEEP LEARNING';
  el('result-title').textContent = won ? 'You found it!' : 'The word was…';
  el('result-icon').textContent = won ? '✦' : '↗';
  el('result-word').textContent = state.word.word;
  el('result-ipa').textContent = state.word.ipa;
  el('result-translation').textContent = state.word.translation;
  el('result-meaning').textContent = state.word.meaning;
  el('result-example').textContent = `“${state.word.example}”`;
  el('result-card').classList.remove('hidden');
  if (state.mode === 'hangman') { renderHangman(); updateHintButton(); }
  else { el('wordle-input').disabled = true; el('wordle-entry').querySelector('button').disabled = true; renderWordleKeyboard(); }
}

function nextWord() {
  state.round++;
  if (state.mode === 'wordle') { state.guesses = []; el('wordle-input').disabled = false; el('wordle-entry').querySelector('button').disabled = false; }
  startGame();
}

function backToSetup() { el('game-screen').classList.add('hidden'); el('home-screen').classList.remove('hidden'); }

el('play-button').addEventListener('click', startGame);
el('back-button').addEventListener('click', backToSetup);
el('next-button').addEventListener('click', nextWord);
el('hint-button').addEventListener('click', useHint);
el('wordle-entry').addEventListener('submit', submitWordle);
el('wordle-input').addEventListener('input', () => {
  const input = el('wordle-input');
  input.value = input.value.replace(/[^a-z]/gi, '').slice(0, state.word?.word.length || 0).toLowerCase();
  el('input-message').textContent = '';
  if (state.mode === 'wordle' && !state.finished) renderWordleBoard();
});
document.querySelectorAll('input[name="mode"]').forEach((input) => input.addEventListener('change', () => { state.mode = input.value; updateAvailability(); }));
document.addEventListener('keydown', (event) => {
  if (el('game-screen').classList.contains('hidden') || state.finished || event.ctrlKey || event.altKey || event.metaKey) return;
  if (state.mode === 'hangman') {
    const letter = event.key.toUpperCase(); if (/^[A-Z]$/.test(letter)) guessLetter(letter);
  } else if (state.mode === 'wordle') {
    const key = event.key === 'Backspace' ? 'DELETE' : event.key === 'Enter' ? 'ENTER' : event.key.toUpperCase();
    if (key === 'ENTER' || key === 'DELETE' || /^[A-Z]$/.test(key)) { event.preventDefault(); handleWordleKey(key); }
  }
});
loadWords();

