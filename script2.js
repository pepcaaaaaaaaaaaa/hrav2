const qs = (selector) => document.querySelector(selector);
const question = qs(".question");
const gif = qs(".gif");
const [yesBtn, noBtn] = [".yes-btn", ".no-btn"].map(qs);

/**
 * Funkce pro náhodný pohyb tlačítka "Ne"
 */
const handleNoMouseOver = () => {
  const { width, height } = noBtn.getBoundingClientRect();
  // Necháme tam malou rezervu, aby tlačítko nezajelo úplně ke kraji
  const maxX = window.innerWidth - width - 20;
  const maxY = window.innerHeight - height - 20;

  noBtn.style.position = "absolute";
  noBtn.style.left = `${Math.floor(Math.random() * maxX)}px`;
  noBtn.style.top = `${Math.floor(Math.random() * maxY)}px`;
};

/**
 * Funkce po kliknutí na "Ano"
 */
const handleYesClick = () => {
  // 1. Změna textu a gifu
  question.innerHTML = "Yeahhhhhhhhhhh! Napiš kdy můžeš";
  gif.src = "https://media.giphy.com/media/UMon0fuimoAN9ueUNP/giphy.gif";

  // 2. Úklid - přestaneme hýbat tlačítkem a smažeme ho
  noBtn.removeEventListener("mouseover", handleNoMouseOver);
  noBtn.remove();

  // 3. Vytvoření tlačítka pro návrat
  const letsGoBtn = document.createElement("button");
  letsGoBtn.textContent = "Zpět";
  
  // Přidáme mu třídu, kterou už máš v CSS pro tlačítka
  letsGoBtn.classList.add("letsgo-btn"); 
  
  // Stylování přímo v JS, aby bylo pod gifem
  letsGoBtn.style.position = "relative";
  letsGoBtn.style.left = "50%";
  letsGoBtn.style.top = "85%"; // Pozice dole pod gifem
  letsGoBtn.style.transform = "translate(-50%, -50%)";
  letsGoBtn.style.width = "200px";
  letsGoBtn.style.padding = "15px";
  letsGoBtn.style.cursor = "pointer";

  // 4. Funkce pro návrat na hlavní stránku
  letsGoBtn.onclick = () => {
    window.location.href = "index.html";
  };

  // 5. Nahradíme tlačítko "Ano" tímto novým tlačítkem
  yesBtn.replaceWith(letsGoBtn);
};

// Event listenery
yesBtn.addEventListener("click", handleYesClick);
noBtn.addEventListener("mouseover", handleNoMouseOver);

// Pojistka pro mobily (aby tlačítko utíkalo i při doteku, nejen při najetí myší)
noBtn.addEventListener("touchstart", (e) => {
  e.preventDefault();
  handleNoMouseOver();
  });