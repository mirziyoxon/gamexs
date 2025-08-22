const COLORS = ["RED", "BLUE", "GREEN", "YELLOW", "PURPLE", "ORANGE", "PINK", "BROWN", "BLACK", "WHITE"];
let secret = [];
let level = 4;

function shuffleArray(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function startLevel() {
  // pick a new secret order (ONLY once per level)
  let pool = COLORS.slice(0, level);
  secret = shuffleArray(pool);
  console.log("Secret:", secret); // debug

  showOptions();
  document.getElementById("message").innerText = `Level ${level}: Arrange ${level} colors!`;
  document.getElementById("guess-box").innerHTML = "";
}

function showOptions() {
  const colorList = document.getElementById("color-list");
  colorList.innerHTML = "";

  // always show available colors (but in random order visually)
  shuffleArray(COLORS.slice(0, level)).forEach(color => {
    let div = document.createElement("div");
    div.className = "color-item";
    div.innerText = color;
    div.onclick = () => moveToGuess(color);
    colorList.appendChild(div);
  });
}

function moveToGuess(color) {
  const guessBox = document.getElementById("guess-box");

  // prevent duplicates
  if ([...guessBox.children].some(c => c.innerText === color)) return;

  let div = document.createElement("div");
  div.className = "color-item";
  div.innerText = color;
  guessBox.appendChild(div);

  // auto check when guess complete
  if (guessBox.children.length === level) {
    checkGuess();
  }
}

function checkGuess() {
  const guessBox = document.getElementById("guess-box");
  const guess = Array.from(guessBox.children).map(c => c.innerText);

  let correct = 0;
  guess.forEach((c, i) => {
    if (c === secret[i]) correct++;
  });

  if (correct === level) {
    document.getElementById("message").innerText = `?? Correct! Moving to Level ${level+1}`;
    level++;
    setTimeout(startLevel, 1500);
  } else {
    document.getElementById("message").innerText = `! ${correct} correct, ? ${level - correct} wrong. Try again!`;
    setTimeout(() => {
      guessBox.innerHTML = "";  // clear wrong guess
      // ?? keep the same secret order until solved!
    }, 1200);
  }
}

function resetGame() {
  level = 4;
  startLevel();
}

// kick off game
resetGame();



