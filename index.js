document.addEventListener('DOMContentLoaded', async () => {
  const elements = {
    difficultySelect: document.getElementById('difficulty-select'),
    gameBoard: document.getElementById('game-board'),
    themeToggle: document.getElementById('theme-toggle'),
    startButton: document.getElementById('start-button'),
    resetButton: document.getElementById('reset-button'),
    clickCount: document.getElementById('click-count'),
    pairsLeft: document.getElementById('pairs-left'),
    pairsMatched: document.getElementById('pairs-matched'),
    totalPairs: document.getElementById('total-pairs'),
    timer: document.getElementById('timer')
  };

  let pokemonList = []
  let timerInterval = null
  let timeRemaining = 0;

  async function fetchPokemon() {
    const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025');
    const data = await response.json();
    pokemonList = data.results;
  }

  // shuffles the pokemon
  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // gets the difficulty settings
  function getSettings() {
    const settings = {
      easy:   { count: 6,   cols: 3,  time: 20 },
      medium: { count: 12,  cols: 4,  time: 40 },
      hard:   { count: 24,  cols: 6,  time: 60 }
    };
    return settings[elements.difficultySelect.value] || settings.medium;
  }

  // updates the game stats
  function updateGameStats({ clickCount = 0, matched = 0, total } = {}) {
    elements.clickCount.textContent = clickCount;
    elements.pairsMatched.textContent = matched;
    elements.pairsLeft.textContent = total - matched;
    elements.totalPairs.textContent = total;
  }

  // clears the game board
  function clearGameBoard() {
    clearInterval(timerInterval);
    timerInterval = null;
    timeRemaining = 0;
    elements.timer.textContent = '00';
    elements.gameBoard.innerHTML = '';
  }

  // renders the placeholder cards before a game starts
  function renderPlaceholders() {
    clearGameBoard();
    const { count, cols } = getSettings();
    const colSize = Math.floor(12 / cols);
    updateGameStats({ total: count / 2 });

    for (let i = 0; i < count; i++) {
      const col = document.createElement('div');
      col.className = `col-6 col-md-${colSize} d-flex justify-content-center mb-2`;
      const card = document.createElement('div');
      Object.assign(card.style, {
        backgroundImage: "url('back.webp')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: '0.4',
        pointerEvents: 'none',
        width: '100%',
        aspectRatio: '1'
      });
      card.className = 'placeholder-card rounded';
      col.appendChild(card);
      elements.gameBoard.appendChild(col);
    }
  }

  // gets the images for the cards
  async function getCardImages(count) {
    const selectedPokemon = shuffle([...pokemonList]).slice(0, count / 2);
    const responses = await Promise.all(selectedPokemon.map(pokemon => fetch(pokemon.url).then(res => res.json())));
    const images = responses.map(data => data.sprites.other['official-artwork'].front_default);
    return shuffle([...images, ...images]);
  }

  // renders the game itself
  async function renderGame() {
    const { count, cols, time } = getSettings();
    const totalPairs = count / 2;
    updateGameStats({ total: totalPairs });
    renderPlaceholders();

    timeRemaining = time;
    elements.timer.textContent = String(timeRemaining).padStart(2, '0');

    const cardImages = await getCardImages(count);
    const powerupImage = shuffle([...new Set(cardImages)])[0];
    const colSize = Math.floor(12 / cols);
    elements.gameBoard.innerHTML = '';

    let clicks = 0, matchedPairs = 0, firstCard = null, lockBoard = false;

    timerInterval = setInterval(() => {
      elements.timer.textContent = String(--timeRemaining).padStart(2, '0');
      if (timeRemaining <= 0) {
        clearInterval(timerInterval);
        endGame(false);
      }
    }, 1000);

    cardImages.forEach(imgSrc => {
      const col = document.createElement('div');
      col.className = `col-6 col-md-${colSize} d-flex justify-content-center mb-2`;

      const card = document.createElement('div');
      card.className = 'flip-card w-100';

      const inner = document.createElement('div');
      inner.className = 'flip-card-inner';
      inner.dataset.image = imgSrc;
      inner.dataset.powerup = (imgSrc === powerupImage).toString();

      const front = document.createElement('div');
      front.className = 'flip-card-front rounded';
      Object.assign(front.style, {
        backgroundImage: "url('back.webp')",
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      });

      const back = document.createElement('div');
      back.className = 'flip-card-back rounded overflow-hidden';
      back.style.backgroundColor = 'transparent';

      const img = document.createElement('img');
      img.src = imgSrc;
      img.alt = 'Pokémon';
      img.className = 'w-100 h-100';
      img.style.objectFit = 'cover';
      back.appendChild(img);

      inner.append(front, back);
      card.appendChild(inner);
      col.appendChild(card);
      elements.gameBoard.appendChild(col);

      card.addEventListener('click', () => {
        if (lockBoard || inner.classList.contains('flipped')) return;

        inner.classList.add('flipped');
        elements.clickCount.textContent = ++clicks;

        if (!firstCard) {
          firstCard = inner;
          return;
        }

        const secondCard = inner;
        lockBoard = true;

        const isMatch = firstCard.dataset.image === secondCard.dataset.image;
        if (isMatch) {
          matchedPairs++;
          updateGameStats({ clickCount: clicks, matched: matchedPairs, total: totalPairs });

          if (firstCard.dataset.powerup === 'true') {
            [firstCard, secondCard].forEach(el => {
              el.classList.add('flipped');
              el.animate([{ transform: 'rotateY(180deg) rotate(0deg)' },
                          { transform: 'rotateY(180deg) rotate(360deg)' }],
                         { duration: 800, easing: 'ease-in-out' });
            });

            setTimeout(() => {
              const unmatched = [...document.querySelectorAll('.flip-card-inner:not(.flipped)')];
              unmatched.forEach((el, i) => setTimeout(() => el.classList.add('flipped'), i * 100));
              unmatched.forEach((el, i) =>
                setTimeout(() => el.classList.remove('flipped'), unmatched.length * 100 + 500 + i * 100)
              );
            }, 800);
          } else {
            [firstCard, secondCard].forEach(card => {
              const overlay = document.createElement('div');
              Object.assign(overlay.style, {
                position: 'absolute',
                top: '0', left: '0',
                width: '100%', height: '100%',
                backgroundColor: 'rgba(255,179,222,0.6)',
                pointerEvents: 'none'
              });
              const backFace = card.querySelector('.flip-card-back');
              backFace.style.position = 'relative';
              backFace.appendChild(overlay);
              overlay.animate([{ opacity: 0 }, { opacity: 0.6, offset: 0.3 }, { opacity: 0 }],
                              { duration: 1250, easing: 'ease-out', fill: 'forwards' })
                     .onfinish = () => overlay.remove();
            });
          }

          firstCard = null;
          lockBoard = false;
          if (matchedPairs === totalPairs) setTimeout(() => endGame(true), 700);
        } else {
          setTimeout(() => {
            firstCard.classList.remove('flipped');
            secondCard.classList.remove('flipped');
            firstCard = null;
            lockBoard = false;
          }, 800);
        }
      });
    });
  }

  // called when the game ends and displays either a win or loss screen depending on if you won or lost
  function endGame(won) {
    clearInterval(timerInterval);
    elements.gameBoard.innerHTML = '';
    const message = document.createElement('div');
    message.className = 'text-center mt-5';
    message.innerHTML = won
      ? `<h2 class="text-title">You Win!</h2>
         <p>Matched all pairs with ${elements.timer.textContent}s remaining.</p>
         <p>Press "Start" to play again.</p>`
      : `<h2 class="text-title">Time's Up!</h2>
         <p>You didn't match all pairs in time.</p>
         <p>Press "Start" to try again.</p>`;
    elements.gameBoard.appendChild(message);
    elements.startButton.disabled = false;
    elements.resetButton.disabled = true;
  }

  // sets up the light and dark themes
  function setupTheme() {
    const savedTheme = localStorage.getItem('theme');
    const icon = elements.themeToggle.querySelector('i');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-mode');
      icon.classList.replace('bi-sun-fill', 'bi-moon-fill');
    }
    elements.themeToggle.addEventListener('click', () => {
      const dark = document.body.classList.toggle('dark-mode');
      icon.classList.replace(dark ? 'bi-sun-fill' : 'bi-moon-fill', dark ? 'bi-moon-fill' : 'bi-sun-fill');
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    });
  }

  renderPlaceholders();
  setupTheme();

  // event listener area
  elements.startButton.addEventListener('click', () => {
    elements.startButton.disabled = true;
    elements.resetButton.disabled = false;
    renderGame();
  });

  elements.resetButton.addEventListener('click', () => {
    elements.startButton.disabled = false;
    elements.resetButton.disabled = true;
    renderPlaceholders();
  });

  elements.difficultySelect.addEventListener('change', () => {
    elements.startButton.disabled = false;
    elements.resetButton.disabled = true;
    renderPlaceholders();
  });

  await fetchPokemon();
});
