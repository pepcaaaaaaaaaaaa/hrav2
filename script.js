(function () {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const bgMusic = document.getElementById("bgMusic");
  const wrapper = document.querySelector(".game-wrapper");

  const playerImg = new Image();
  playerImg.src = 'obrazky/kocka2.png'; 

  // --- FYZIKA A NASTAVENÍ ---
  let GRAVITY = 0.45;
  let JUMP_FORCE = -12;
  let MOVE_SPEED = 6;
  const PLATFORM_HEIGHT = 18;
  const PLAYER_WIDTH = 65; 
  const PLAYER_HEIGHT = 55;
  
  let platforms = [];
  let player = null;
  let cameraY = 0;
  let score = 0;
  let highScore = parseInt(localStorage.getItem("doodle-high-score") || "0", 10);
  let gameRunning = false;
  let keys = { left: false, right: false };
  let time = 0;
  let flowers = [];
  const FLOWER_COUNT = 30;

  let currentLevel = 1;
  let isTransitioning = false;
  let transitionAlpha = 0;

  const levels = {
    1: {
      gravity: 0.45,
      jump: -12,
      bgColor: "#e689ab",
      flowerColor: "#ffdae0",
      centerColor: "#ffd93d",
      shape: "daisy"
    },
    2: {
      gravity: 0.52,
      jump: -13,
      bgColor: "#8e44ad",
      flowerColor: "#ffb7c5", 
      centerColor: "#ffffff", // Zářivě bílý střed
      shape: "blossom"
    },
    3: {
      gravity: 0.60,
      jump: -14,
      bgColor: "#1a1a2e",
      flowerColor: "#ffffff", 
      centerColor: "#ffd93d",
      shape: "space"
    }
  };

  function getGameSize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    return { width: rect.width, height: rect.height, dpr: dpr };
  }

  function setPixelRatio() {
    const size = getGameSize();
    canvas.width = size.width * size.dpr;
    canvas.height = size.height * size.dpr;
    ctx.scale(size.dpr, size.dpr);
    initFlowers(); 
    document.getElementById("highScoreEl").textContent = highScore;
    if (wrapper) {
      wrapper.style.transition = "background 1.5s ease, background-image 1.5s ease";
    }
  }

  function initFlowers() {
    flowers = [];
    const size = getGameSize();
    for (let i = 0; i < FLOWER_COUNT; i++) {
      flowers.push({
        x: Math.random() * size.width,
        y: Math.random() * size.height,
        size: 5 + Math.random() * 7,
        speed: 0.5 + Math.random() * 1.5,
        spin: 0.01 + Math.random() * 0.03,
        drift: Math.random() * 10
      });
    }
  }

  function drawSingleFlower(f, levelData) {
    ctx.save();
    ctx.translate(f.x, f.y);
    
    if (levelData.shape === "daisy") {
      ctx.rotate(time * f.spin);
      ctx.fillStyle = levelData.flowerColor;
      for (let i = 0; i < 6; i++) {
        ctx.rotate((Math.PI * 2) / 6);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(f.size, -f.size / 2, f.size * 1.5, 0);
        ctx.quadraticCurveTo(f.size, f.size / 2, 0, 0);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(0, 0, f.size / 3, 0, Math.PI * 2);
      ctx.fillStyle = levelData.centerColor;
      ctx.fill();
    } 
    else if (levelData.shape === "blossom") {
      ctx.rotate(time * f.spin);
      ctx.fillStyle = levelData.flowerColor;
      for (let i = 0; i < 5; i++) {
        ctx.rotate((Math.PI * 2) / 5);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-f.size/2, -f.size, -f.size*1.5, f.size/2, 0, f.size);
        ctx.bezierCurveTo(f.size*1.5, f.size/2, f.size/2, -f.size, 0, 0);
        ctx.fill();
      }
      // Zářivý střed
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, 0, f.size / 4, 0, Math.PI * 2);
      ctx.fillStyle = levelData.centerColor;
      ctx.fill();
    } 
    else if (levelData.shape === "space") {
      const flicker = Math.sin(time * 0.1 + f.drift) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(255, 255, 255, ${flicker})`;
      ctx.beginPath();
      ctx.arc(0, 0, f.size / 4, 0, Math.PI * 2);
      ctx.fill();

      if (f.drift > 7) {
        ctx.restore(); ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(Math.PI / 4);
        let gradient = ctx.createLinearGradient(0, 0, 0, -f.size * 4);
        gradient.addColorStop(0, "rgba(255, 255, 255, 0.8)");
        gradient.addColorStop(1, "rgba(0, 150, 255, 0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(-1, -f.size * 4, 2, f.size * 4);
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#00ffff";
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawFlowers() {
    const levelData = levels[currentLevel];
    flowers.forEach(f => {
      drawSingleFlower(f, levelData);
      f.y += f.speed;
      if (levelData.shape !== "space") {
        f.x += Math.sin(time * 0.01 + f.drift) * 0.4;
      } else if (f.drift > 7) {
        f.x += f.speed * 0.5;
      }
      if (f.y > canvas.height / (window.devicePixelRatio || 1) + 20) { 
        f.y = -20; 
        f.x = Math.random() * (canvas.width / (window.devicePixelRatio || 1)); 
      }
    });
  }

  function startLevelTransition(newLevel) {
    if (isTransitioning) return;
    isTransitioning = true;
    let fadeOut = setInterval(() => {
      transitionAlpha += 0.05;
      if (transitionAlpha >= 1) {
        transitionAlpha = 1;
        clearInterval(fadeOut);
        applyLevelSettings(newLevel);
        let fadeIn = setInterval(() => {
          transitionAlpha -= 0.05;
          if (transitionAlpha <= 0) {
            transitionAlpha = 0;
            clearInterval(fadeIn);
            isTransitioning = false;
          }
        }, 30);
      }
    }, 30);
  }

  function applyLevelSettings(levelNum) {
    currentLevel = levelNum;
    const data = levels[levelNum];
    GRAVITY = data.gravity;
    JUMP_FORCE = data.jump;
    
    if (wrapper) {
      wrapper.style.backgroundColor = data.bgColor;
      if (levelNum === 1) {
        wrapper.style.backgroundImage = "none";
      } else if (levelNum === 2) {
        wrapper.style.backgroundImage = "url('obrazky/level22.avif')";
        wrapper.style.backgroundSize = "cover";
        wrapper.style.backgroundPosition = "center";
        showLoveMessage("LEVEL 2: Sakura! 🌸");
      } else if (levelNum === 3) {
        wrapper.style.backgroundImage = "url('obrazky/galaxie.webp')";
        wrapper.style.backgroundSize = "cover";
        wrapper.style.backgroundPosition = "center";
        showLoveMessage("FINAL LEVEL: Vesmír! 🌌");
      }
    }
    initFlowers();
  }

  function drawPlatform(p) {
    let y = p.y - cameraY;
    const size = getGameSize();
    if (y < -50 || y > size.height + 50) return;
    
    // BARVY PODLE LEVELU
    if (currentLevel === 3) {
      ctx.fillStyle = (p.type === "break") ? "#ff85a1" : "#faefaf"; 
    } else {
      if (p.type === "break") ctx.fillStyle = "#ff85a1";
      else if (p.type === "moving") ctx.fillStyle = "#710859"; 
      else if (p.type === "heart") ctx.fillStyle = "#ff0054"; 
      else ctx.fillStyle = "#be0606";
    }

    ctx.beginPath();
    ctx.roundRect(p.x, y, p.width, p.height, 8);
    ctx.fill();

    // KRÁTERY POUZE V LEVELU 3
   if (currentLevel === 3) {
    ctx.save();
    // Černý svítící okraj (Glow)
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#000000"; 
    
    ctx.fillStyle = (p.type === "break") ? "#ff85a1" : "#faefaf"; 
    ctx.beginPath();
    ctx.roundRect(p.x, y, p.width, p.height, 8);
    ctx.fill();
    ctx.restore(); // Shadow vypneme pro zbytek kreslení

    // Krátery
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.beginPath(); ctx.arc(p.x + 12, y + 8, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(p.x + p.width - 15, y + 10, 3, 0, Math.PI * 2); ctx.fill();

    // Černá linka kolem bloku
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.stroke();
}
    
    if (p.type === "heart") {
        ctx.save();
        ctx.strokeStyle = "#ffffff"; 
        ctx.lineWidth = 4;
        ctx.shadowBlur = 15; ctx.shadowColor = "#ffffff";
        ctx.stroke();
        ctx.restore();
    } else {
        ctx.strokeStyle = "#F6F1D5";
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.fillRect(p.x, y, p.width, 4);
  }

  // --- ZBYTEK MOTORU HRY ---
  function createPlatform(x, y, width, type) {
    return { x, y, width, height: PLATFORM_HEIGHT, type, startX: x, moveRange: 60 };
  }

  function initPlatforms() {
    platforms = [];
    const size = getGameSize();
    let y = size.height - 100;
    for (let i = 0; i < 15; i++) {
      let pWidth = 75 + Math.random() * 35;
      let x = Math.random() * (size.width - pWidth);
      if (i === 0) x = (size.width - pWidth) / 2;
      let type = "normal";
      if (i > 3) {
        let rand = Math.random();
        if (rand < 0.08) type = "heart";
        else if (rand < 0.25) type = "moving";
        else if (rand < 0.35) type = "break";
      }
      platforms.push(createPlatform(x, y, pWidth, type));
      y -= 90 + Math.random() * 50;
    }
  }

  function addPlatformsAbove() {
    const size = getGameSize();
    let lastY = platforms.length ? Math.min(...platforms.map(p => p.y)) : 0;
    if (lastY > cameraY - 200) {
      let pWidth = 75 + Math.random() * 35;
      let x = Math.random() * (size.width - pWidth);
      let rand = Math.random();
      let type = rand < 0.08 ? "heart" : (rand < 0.25 ? "moving" : (rand < 0.35 ? "break" : "normal"));
      platforms.push(createPlatform(x, lastY - 110, pWidth, type));
    }
  }

  function resetGame() {
    applyLevelSettings(1);
    const size = getGameSize();
    cameraY = 0; score = 0; time = 0;
    initPlatforms(); initFlowers();
    player = { x: size.width / 2 - PLAYER_WIDTH / 2, y: platforms[0].y - PLAYER_HEIGHT - 10, vx: 0, vy: 0, width: PLAYER_WIDTH, height: PLAYER_HEIGHT };
    gameRunning = true;
    document.getElementById("scoreEl").textContent = "0";
    document.getElementById("highScoreEl").textContent = highScore;
    document.getElementById("gameOverOverlay").classList.add("hidden");
  }

  function drawPlayer() {
    if (!player) return;
    ctx.save();
    let x = player.x; let y = player.y - cameraY;
    ctx.translate(x + PLAYER_WIDTH / 2, y + PLAYER_HEIGHT / 2);
    if (keys.left) ctx.scale(-1, 1);
    if (playerImg.complete) ctx.drawImage(playerImg, -PLAYER_WIDTH/2, -PLAYER_HEIGHT/2, PLAYER_WIDTH, PLAYER_HEIGHT);
    else { ctx.fillStyle = "#ff4d6d"; ctx.fillRect(-PLAYER_WIDTH/2, -PLAYER_HEIGHT/2, PLAYER_WIDTH, PLAYER_HEIGHT); }
    ctx.restore();
  }

  function gameLoop() {
    if (!gameRunning && !isTransitioning) return;
    time++;
    const size = getGameSize();
    
    if (!isTransitioning) {
      if (keys.left) player.vx = -MOVE_SPEED; else if (keys.right) player.vx = MOVE_SPEED; else player.vx *= 0.8;
      player.x += player.vx; player.vy += GRAVITY; player.y += player.vy;

      if (player.x + player.width < 0) player.x = size.width;
      if (player.x > size.width) player.x = -player.width;

      platforms.forEach((p, index) => {
        if (p.type === "moving") p.x = p.startX + Math.sin(time * 0.05) * p.moveRange;
        if (player.vy > 0 && player.x + player.width > p.x && player.x < p.x + p.width && player.y + player.height > p.y && player.y + player.height < p.y + 15) {
          player.vy = (p.type === "heart") ? JUMP_FORCE * 2.2 : JUMP_FORCE;
          if (p.type === "break") platforms.splice(index, 1);
          if (p.type === "heart") showLoveMessage("SUPER SKOK! ❤️");
        }
      });

      if (player.y < cameraY + size.height * 0.4) {
        cameraY = player.y - size.height * 0.4;
        let newScore = Math.floor(-cameraY / 10);
        if (newScore > score) {
          score = newScore;
          document.getElementById("scoreEl").textContent = score;
          if (score >= 2000 && currentLevel === 1) startLevelTransition(2);
          if (score >= 4000 && currentLevel === 2) startLevelTransition(3);
          if (score > highScore) {
            highScore = score;
            localStorage.setItem("doodle-high-score", highScore);
            document.getElementById("highScoreEl").textContent = highScore;
          }
        }
      }

      if (player.y - cameraY > size.height) {
        gameRunning = false;
        document.getElementById("finalScoreEl").textContent = score;
        document.getElementById("gameOverOverlay").classList.remove("hidden");
      }
      addPlatformsAbove();
    }

    ctx.clearRect(0, 0, size.width, size.height);
    drawFlowers();
    platforms.forEach(drawPlatform);
    drawPlayer();

    if (transitionAlpha > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${transitionAlpha})`;
      ctx.fillRect(0, 0, size.width, size.height);
    }
    requestAnimationFrame(gameLoop);
  }

  function showLoveMessage(text) {
    const msgEl = document.getElementById("loveMessage");
    if (msgEl) {
      msgEl.textContent = text;
      msgEl.classList.remove("hidden");
      setTimeout(() => { msgEl.classList.add("hidden"); }, 2500);
    }
  }

  document.getElementById("startBtn").onclick = () => {
    document.getElementById("startOverlay").classList.add("hidden");
    if(bgMusic) bgMusic.play().catch(() => {});
    resetGame(); gameLoop();
  };

  document.getElementById("restartBtn").onclick = () => {
    resetGame(); gameLoop();
  };

  window.onkeydown = (e) => {
    if (e.key === "ArrowLeft" || e.key === "a") keys.left = true;
    if (e.key === "ArrowRight" || e.key === "d") keys.right = true;
  };
  window.onkeyup = (e) => {
    if (e.key === "ArrowLeft" || e.key === "a") keys.left = false;
    if (e.key === "ArrowRight" || e.key === "d") keys.right = false;
  };

  const bLeft = document.getElementById("btnLeft");
  const bRight = document.getElementById("btnRight");
  if (bLeft && bRight) {
    bLeft.addEventListener("pointerdown", (e) => { e.preventDefault(); keys.left = true; });
    bLeft.addEventListener("pointerup", (e) => { e.preventDefault(); keys.left = false; });
    bLeft.addEventListener("pointerleave", (e) => { e.preventDefault(); keys.left = false; });
    bRight.addEventListener("pointerdown", (e) => { e.preventDefault(); keys.right = true; });
    bRight.addEventListener("pointerup", (e) => { e.preventDefault(); keys.right = false; });
    bRight.addEventListener("pointerleave", (e) => { e.preventDefault(); keys.right = false; });
  }

  window.addEventListener("resize", () => { setPixelRatio(); if (!gameRunning) initPlatforms(); });
  setPixelRatio();
})();