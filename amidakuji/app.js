document.addEventListener('DOMContentLoaded', () => {
    const participantsTextarea = document.getElementById('participants');
    const resultsTextarea = document.getElementById('results');
    const generateBtn = document.getElementById('generateBtn');
    const revealBtn = document.getElementById('revealBtn');
    const canvas = document.getElementById('amidaCanvas');
    const ctx = canvas.getContext('2d');
    const resultText = document.getElementById('resultText');

    let participants = [];
    let results = [];
    let legs = [];
    let isAnimating = false;

    const PADDING = 40;
    const LEG_WIDTH = 100;
    const LINE_WIDTH = 2;
    const HORIZONTAL_LINE_WIDTH = 4;
    const TEXT_FONT = "16px sans-serif";
    const TEXT_COLOR = "#333";
    const TRACER_COLOR = "#e74c3c";
    const TRACER_WIDTH = 4;

    // --- Event Listeners ---
    generateBtn.addEventListener('click', setupAndDrawAmida);
    canvas.addEventListener('click', handleCanvasClick);
    revealBtn.addEventListener('click', revealAllResults);

    function setupAndDrawAmida() {
        if (isAnimating) return;
        participants = participantsTextarea.value.split('\n').filter(p => p.trim() !== '');
        results = resultsTextarea.value.split('\n').filter(r => r.trim() !== '');

        if (participants.length < 2) {
            alert('参加者は2名以上入力してください。');
            return;
        }
        if (participants.length !== results.length) {
            alert('参加者と結果の数は同じにしてください。');
            return;
        }

        const numLegs = participants.length;
        const canvasWidth = LEG_WIDTH * (numLegs - 1) + PADDING * 2;
        const canvasHeight = 400;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        generateAmidaStructure(numLegs, canvasHeight);
        drawAmida(canvasHeight);
        
        resultText.textContent = '参加者を選択してくじを開始してください。';
        revealBtn.style.display = 'inline-block';
    }

    function generateAmidaStructure(numLegs, height) {
        legs = [];
        for (let i = 0; i < numLegs; i++) {
            legs.push({ x: PADDING + i * LEG_WIDTH, connections: [] });
        }

        const availableY = Array.from({ length: 10 }, (_, i) => PADDING * 2.5 + i * 25);
        let lastUsedY = []; // Keep track of Ys used in the previous gap

        for (let i = 0; i < numLegs - 1; i++) {
            const legIndex = i;
            
            const possibleY = availableY.filter(y => !lastUsedY.includes(y));
            const shuffledY = [...possibleY].sort(() => 0.5 - Math.random());

            if (shuffledY.length < 2) {
                console.warn(`Not enough unique Y positions for gap ${i}. Reusing Ys.`);
                const fallbackShuffledY = [...availableY].sort(() => 0.5 - Math.random());
                shuffledY.push(...fallbackShuffledY);
            }
            
            const y1 = shuffledY[0];
            const y2 = shuffledY[1];

            legs[legIndex].connections.push({ y: y1, to: legIndex + 1 });
            legs[legIndex + 1].connections.push({ y: y1, to: legIndex });

            legs[legIndex].connections.push({ y: y2, to: legIndex + 1 });
            legs[legIndex + 1].connections.push({ y: y2, to: legIndex });
            
            lastUsedY = [y1, y2];
        }

        legs.forEach(leg => leg.connections.sort((a, b) => a.y - b.y));
    }

    function drawAmida(height) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = LINE_WIDTH;
        ctx.strokeStyle = TEXT_COLOR;
        ctx.fillStyle = TEXT_COLOR;
        ctx.font = TEXT_FONT;
        ctx.textAlign = 'center';

        participants.forEach((p, i) => ctx.fillText(p, legs[i].x, PADDING));
        results.forEach((r, i) => ctx.fillText(r, legs[i].x, height - PADDING + 20));

        legs.forEach(leg => {
            ctx.beginPath();
            ctx.moveTo(leg.x, PADDING);
            ctx.lineTo(leg.x, height - PADDING);
            ctx.stroke();
        });

        ctx.lineWidth = HORIZONTAL_LINE_WIDTH;
        legs.forEach((leg, i) => {
            leg.connections.forEach(conn => {
                if (conn.to > i) {
                    ctx.beginPath();
                    ctx.moveTo(leg.x, conn.y);
                    ctx.lineTo(legs[conn.to].x, conn.y);
                    ctx.stroke();
                }
            });
        });
    }

    function handleCanvasClick(e) {
        if (isAnimating) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (y < PADDING + 10) {
            const clickedLegIndex = Math.round((x - PADDING) / LEG_WIDTH);
            if (clickedLegIndex >= 0 && clickedLegIndex < legs.length) {
                tracePath(clickedLegIndex);
            }
        }
    }

    function tracePath(startLegIndex) {
        isAnimating = true;
        resultText.textContent = `${participants[startLegIndex]}さんの結果は...`;
        drawAmida(canvas.height);

        let state = 'vertical'; // 'vertical' or 'horizontal'
        let currentLeg = startLegIndex;
        let x = legs[currentLeg].x;
        let y = PADDING;
        const speed = 2;
        let targetX = 0;

        function animate() {
            ctx.strokeStyle = TRACER_COLOR;
            ctx.lineWidth = TRACER_WIDTH;

            if (state === 'vertical') {
                const endY = canvas.height - PADDING;
                if (y >= endY) {
                    isAnimating = false;
                    const finalLegIndex = findFinalLeg(startLegIndex);
                    resultText.textContent = `${participants[startLegIndex]}さんの結果は「${results[finalLegIndex]}」です！`;
                    return;
                }

                const nextConnection = legs[currentLeg].connections.find(c => c.y > y);
                let nextY = y + speed;

                if (nextConnection && nextY >= nextConnection.y) {
                    nextY = nextConnection.y;
                    state = 'horizontal';
                    targetX = legs[nextConnection.to].x;
                }
                if (nextY > endY) {
                    nextY = endY;
                }

                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x, nextY);
                ctx.stroke();
                y = nextY;

            } else { // state === 'horizontal'
                const direction = Math.sign(targetX - x);
                const nextX = x + speed * direction;
                
                ctx.beginPath();
                ctx.moveTo(x, y);
                
                if ((direction > 0 && nextX >= targetX) || (direction < 0 && nextX <= targetX)) {
                    ctx.lineTo(targetX, y);
                    x = targetX;
                    currentLeg = legs.findIndex(leg => leg.x === x);
                    state = 'vertical';
                } else {
                    ctx.lineTo(nextX, y);
                    x = nextX;
                }
                ctx.stroke();
            }
            
            requestAnimationFrame(animate);
        }
        animate();
    }

    function findFinalLeg(startLegIndex) {
        let currentLeg = startLegIndex;
        let y = PADDING;
        while(y < canvas.height - PADDING) {
            const nextConnection = legs[currentLeg].connections.find(c => c.y > y);
            if (nextConnection) {
                y = nextConnection.y;
                currentLeg = nextConnection.to;
            } else {
                break;
            }
        }
        return currentLeg;
    }

    function revealAllResults() {
        if (isAnimating) return;
        let fullResult = '【すべての結果】\n';
        for (let i = 0; i < participants.length; i++) {
            const finalLeg = findFinalLeg(i);
            fullResult += `${participants[i]} → ${results[finalLeg]}\n`;
        }
        resultText.innerText = fullResult;
    }

    // Initial Draw
    setupAndDrawAmida();
});
