document.addEventListener('DOMContentLoaded', () => {
    const guessInput = document.getElementById('guess-input');
    const guessButton = document.getElementById('guess-button');
    const historyList = document.getElementById('history');

    let secretNumber = '';
    let attempts = 0;

    function generateSecretNumber() {
        const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        let secret = '';
        for (let i = 0; i < 3; i++) {
            const randomIndex = Math.floor(Math.random() * digits.length);
            secret += digits.splice(randomIndex, 1)[0];
        }
        return secret;
    }

    function handleGuess() {
        const guess = guessInput.value;

        // 入力検証
        if (guess.length !== 3 || !/^\d{3}$/.test(guess)) {
            alert('3桁の数字を入力してください。');
            return;
        }
        if (new Set(guess).size !== 3) {
            alert('数字はそれぞれユニークでなければなりません。');
            return;
        }

        attempts++;
        let m = 0;
        let p = 0;

        const secretArray = secretNumber.split('');
        const guessArray = guess.split('');

        // M (Match) のカウント
        for (let i = 0; i < 3; i++) {
            if (guessArray[i] === secretArray[i]) {
                m++;
            }
        }

        // P (Position) のカウント
        for (let i = 0; i < 3; i++) {
            if (secretArray.includes(guessArray[i])) {
                p++;
            }
        }
        // PはMを含んでいるので、Mの数を引く
        p -= m;

        const resultText = `${guess} -> ${m}M${p}P`;
        const listItem = document.createElement('li');
        listItem.textContent = resultText;

        if (m === 3) {
            listItem.textContent += ' 正解！';
            listItem.classList.add('win-message');
            historyList.appendChild(listItem);
            alert(`正解です！ ${attempts}回で成功しました。`);
            guessInput.disabled = true;
            guessButton.disabled = true;
        } else {
            historyList.appendChild(listItem);
        }

        guessInput.value = '';
        guessInput.focus();
    }

    function initializeGame() {
        secretNumber = generateSecretNumber();
        console.log(`Secret Number (for debugging): ${secretNumber}`); // デバッグ用
        attempts = 0;
        historyList.innerHTML = '';
        guessInput.disabled = false;
        guessButton.disabled = false;
        guessInput.value = '';
        guessInput.focus();
    }

    guessButton.addEventListener('click', handleGuess);
    guessInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleGuess();
        }
    });

    initializeGame();
});
