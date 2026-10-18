# WORD HUNT

WORD HUNT is a small browser game for learning English vocabulary through two word-guessing games. Choose a CEFR level, play a round, and learn the word with its Russian translation, IPA pronunciation, definition, and example sentence.

## Features

- Five levels: A1, A2, B1, B2, and C1
- **Hangman:** guess letters, use one hint per round, and solve the word before six mistakes
- **Wordle:** solve a word of any length in five guesses, with color feedback for letter matches
- Physical and on-screen keyboards
- A learning card after each round, plus **Next word** and **Back to setup** controls
- Responsive layout for desktop and mobile screens
- No account, database, build step, or paid API

## Run locally

Because the game loads `words.json` with the browser Fetch API, open it through a local static web server rather than directly as a `file://` URL. With Python installed, run this from the project folder:

```bash
py -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000). Alternatively, use an editor's static preview extension, such as Live Server.

## Publish with GitHub Pages

1. Push the project files to the root of a GitHub repository.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Choose the `main` branch and the `/(root)` folder, then save.
5. Open the site URL shown on the Pages settings screen after deployment finishes.

The HTML uses relative paths for the stylesheet, script, and dictionary, so they load correctly from a GitHub Pages project URL such as `https://<account>.github.io/word-hunt/`.

## Word list and gameplay notes

`words.json` contains 500 entries: 100 words for each of the five levels (A1–C1). Every entry includes `word`, `translation`, `level`, `ipa`, `meaning`, and `example`. Words are selected from the chosen level. Wordle accepts alphabetic guesses of the target length and gives letter feedback; it does not check whether a guess is in the study list.

## Project files

```text
index.html   Page structure and game screens
style.css    Responsive visual design
script.js    Game logic and interactions
words.json   Vocabulary data
README.md    Setup and publishing instructions
```

