import { Input } from './input.js';
import { AudioSystem } from './audio.js';
import { World } from './world.js';
import { Renderer } from './render.js';
import { Autopilot, runShotScene } from './shots.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game');
  const input = new Input(canvas);
  const audio = new AudioSystem();
  const world = new World(audio);
  const renderer = new Renderer(canvas);

  renderer.resize();
  window.addEventListener('resize', () => renderer.resize());

  let bestTime = parseFloat(localStorage.getItem('lumenfall_best') || '0');
  let gameState = 'title'; // title, play, pause, levelup, victory, gameover

  const urlParams = new URLSearchParams(window.location.search);
  const shotParam = urlParams.get('shot');
  const autopilotParam = urlParams.get('autopilot') === '1';

  let autopilot = null;
  if (autopilotParam) {
    autopilot = new Autopilot(world, input, false);
    gameState = 'play';
    audio.init();
  }

  if (shotParam) {
    runShotScene(shotParam, world, audio, renderer);
    return;
  }

  // Expose debug hook window.__game
  window.__game = {
    get phase() { return gameState; },
    get player() { return { x: world.player.x, y: world.player.y }; },
    get health() { return world.player.health; },
    get level() { return world.player.level; },
    get enemies() { return world.enemies.length; },
    get shards() { return world.shards.length; },
    get bossHealth() { return world.boss ? world.boss.hp : null; },
    get time() { return world.time; },
    get kills() { return world.kills; }
  };

  let lastTime = performance.now();

  function gameLoop(now) {
    requestAnimationFrame(gameLoop);
    const dt = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;

    // Handle global inputs
    if (input.isPressed('KeyM')) {
      audio.toggleMute();
    }

    if (gameState === 'title') {
      if (input.isPressed('Enter') || input.isPressed('Space') || input.consumeClick()) {
        audio.init();
        world.reset();
        gameState = 'play';
      }
      renderer.drawTitleScreen(bestTime);
    } else if (gameState === 'play') {
      if (input.isPressed('KeyP') || input.isPressed('Escape')) {
        gameState = 'pause';
      }

      if (autopilot) {
        autopilot.update(dt);
      }

      world.update(dt, input);

      if (world.levelingUp) {
        if (autopilotParam) {
          // Autopilot picks best upgrade card using intelligent scoring
          let bestIdx = 0;
          let bestScore = -1;
          world.currentCards.forEach((c, idx) => {
            let score = 0;
            if (c.id === 'heavy' || c.id === 'rapid' || c.id === 'split') score = 10;
            else if (c.id === 'vital' || c.id === 'thick' || c.id === 'swift') score = 5;
            else score = 1;
            if (score > bestScore) {
              bestScore = score;
              bestIdx = idx;
            }
          });
          world.chooseUpgrade(bestIdx);
        } else {
          gameState = 'levelup';
        }
      } else if (world.gameOver) {
        gameState = 'gameover';
        if (world.time > bestTime) {
          bestTime = world.time;
          localStorage.setItem('lumenfall_best', bestTime.toString());
        }
      } else if (world.victory) {
        gameState = 'victory';
        if (world.time > bestTime) {
          bestTime = world.time;
          localStorage.setItem('lumenfall_best', bestTime.toString());
        }
      }

      renderer.clear();
      renderer.drawWorld(world);
    } else if (gameState === 'pause') {
      if (input.isPressed('KeyP') || input.isPressed('Escape')) {
        gameState = 'play';
      }
      renderer.clear();
      renderer.drawWorld(world);
      renderer.drawPauseScreen();
    } else if (gameState === 'levelup') {
      if (input.isPressed('Digit1') || input.isPressed('Numpad1')) {
        world.chooseUpgrade(0);
        gameState = 'play';
      } else if (input.isPressed('Digit2') || input.isPressed('Numpad2')) {
        world.chooseUpgrade(1);
        gameState = 'play';
      } else if (input.isPressed('Digit3') || input.isPressed('Numpad3')) {
        world.chooseUpgrade(2);
        gameState = 'play';
      } else if (input.consumeClick()) {
        const cardWidth = 320;
        const spacing = 40;
        const totalWidth = 3 * cardWidth + 2 * spacing;
        const startX = (1280 - totalWidth) / 2;
        const cy = 230;
        const cardHeight = 360;

        for (let i = 0; i < world.currentCards.length; i++) {
          const cx = startX + i * (cardWidth + spacing);
          if (input.mouseX >= cx && input.mouseX <= cx + cardWidth && input.mouseY >= cy && input.mouseY <= cy + cardHeight) {
            world.chooseUpgrade(i);
            gameState = 'play';
            break;
          }
        }
      }
      renderer.clear();
      renderer.drawWorld(world);
      renderer.drawLevelUpScreen(world.currentCards);
    } else if (gameState === 'victory') {
      if (input.isPressed('KeyR') || input.isPressed('Enter') || input.consumeClick()) {
        world.reset();
        gameState = 'play';
      }
      renderer.drawEndScreen(world, true);
    } else if (gameState === 'gameover') {
      if (input.isPressed('KeyR') || input.isPressed('Enter') || input.consumeClick()) {
        world.reset();
        gameState = 'play';
      }
      renderer.drawEndScreen(world, false);
    }

    input.reset();
  }

  requestAnimationFrame(gameLoop);
});
