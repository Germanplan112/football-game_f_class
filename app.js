const canvas = document.getElementById('field');
const ctx = canvas.getContext('2d');
let width, height;
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Управление
const keys = {};
document.body.addEventListener('touchstart', handleTouchStart, {passive: false});
document.body.addEventListener('touchmove', handleTouchMove, {passive: false});
document.body.addEventListener('touchend', handleTouchEnd, {passive: false});
function prevent(e){ e.preventDefault(); }
function handleTouchStart(e){
    for(let t of e.changedTouches) checkZone(t.clientX, t.clientY, true);
}
function handleTouchMove(e){
    for(let t of e.changedTouches) checkZone(t.clientX, t.changedTouches[0].clientY, false);
}
function handleTouchEnd(e){
    keys['ArrowLeft'] = false; 
    keys['ArrowRight'] = false;
    keys['KeyA'] = false; 
    keys['KeyD'] = false;
}
function checkZone(x, y, isStart){
    const rect = canvas.getBoundingClientRect();
    x = ((x - rect.left) / rect.width) * width;
    y = ((y - rect.top) / rect.height) * height;
    
    // Левая половина экрана — Игрок 1
    if (x < width / 2) {
        if (y > height / 2 + 60) { // Нижняя зона
            keys['ArrowLeft'] = isStart && (x < width / 4); // Влево
            keys['ArrowRight'] = isStart && (x >= width / 4); // Вправо
        } else { // Верхняя зона — удар
            keys['Space'] = isStart;
        }
    } else { // Правая половина — Игрок 2 или Бот
        if (y > height / 2 + 60) {
            keys['KeyA'] = isStart && (x < 3 * width / 4); // Влево
            keys['KeyD'] = isStart && (x >= 3 * width / 4); // Вправо
        } else { // Удар
            kickBall('p2'); // Для бота это будет автоматический удар
        }
    }
}

// Функция для расчёта расстояния между двумя точками
// Это было упущено ранее
function dist(x1,y1,x2,y2){
    return Math.sqrt((x1-x2)**2 + (y1-y2)**2);
}

// Объекты
const p1 = {x: 100, y: 0, w: 50, h: 50, speed: 9};
const p2 = {x: 100, y: 0, w: 50, h: 50, speed: 9}; // Скорость увеличена
const ball = {x: 0, y: 0, r: 15, vx: 0, vy: 0, heldBy: null};
const goalL = {x: -10, y: height/2 - 50, w: 10, h: 100};
const goalR = {x: width, y: height/2 - 50, w: 10, h: 100};

let scoreL = 0, scoreR = 0;
let gameMode = 'menu'; // menu, pvp, bot
let frameCount = 0;

// Инициализация кнопок
document.getElementById('pvp-btn').onclick = () => startGame('pvp');
document.getElementById('bot-btn').onclick = () => startGame('bot');
document.getElementById('back-menu').onclick = goMenu;

function resizeCanvas(){
    width = window.innerWidth;
    height = window.innerHeight - 60; // Отступ под счёт
    canvas.width = width;
    canvas.height = height;
    resetPositions();
}

function resetPositions(){
    p1.x = width * 0.25 - 25; p1.y = height - 70;
    p2.x = width * 0.75 - 25; p2.y = height - 70;
    ball.x = width / 2; ball.y = height / 2;
    ball.vx = 0; ball.vy = 0; ball.heldBy = null;
}

function startGame(mode){
    gameMode = mode;
    scoreL = 0; scoreR = 0;
    updateScore();
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    keys['ArrowLeft']=false; keys['ArrowRight']=false; keys['KeyA']=false; keys['KeyD']=false;
    resetPositions();
    loop();
}

function goMenu(){
    gameMode = 'menu';
    document.getElementById('menu-screen').style.display = 'flex';
    document.getElementById('game-screen').style.display = 'none';
}

function updateScore(){
    document.getElementById('score-left').textContent = scoreL;
    document.getElementById('score-right').textContent = scoreR;
}

// ЛОГИКА ИГРЫ
function loop(){
    requestAnimationFrame(loop);
    if(gameMode === 'menu') return;

    update();
    render();
}

function update(){
    // Движение игроков
    if(keys['ArrowLeft']) p1.x -= p1.speed;
    if(keys['ArrowRight']) p1.x += p1.speed;

    // Улучшенный бот
    let targetX = ball.x - 25;
    if(ball.heldBy !== 'p2' || ball.heldBy === null){ // Если мяч у противника или свободен
        // Защита: стоит перед воротами
        targetX = width * 0.75 - 25;
    }
    if(Math.abs(p2.x - targetX) > 2) {
        p2.x += (targetX > p2.x ? p2.speed : -p2.speed);
    }

    // Ограничение границ
    [p1, p2].forEach(p => {
        if(p.x < 0) p.x = 0;
        if(p.x + p.w > width) p.x = width - p.w;
    });

    // Мяч
    if(ball.heldBy){
        if(ball.heldBy === 'p1') { ball.x = p1.x + 25; ball.y = p1.y - 20; }
        else { ball.x = p2.x + 25; ball.y = p2.y - 20; }
        
        // Удар по мячу (тап вверх)
        if(keys['Space'] || ball.vy !== 0) {
            kickBall('p1');
        }
    } else {
        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.vy += 0.4; // Гравитация

        // Отскок от пола/потолка
        if(ball.y + ball.r > height) { ball.y = height - ball.r; ball.vy *= -0.7; }
        if(ball.y - ball.r < 0) { ball.y = ball.r; ball.vy *= -0.7; }

        // Отскок от боковых стен
        if(ball.x - ball.r < 0) ball.vx *= -1;
        if(ball.x + ball.r > width) ball.vx *= -1;

        // Подбор мяча игроками
        if(dist(p1.x+25, p1.y, ball.x, ball.y) < 40) ball.heldBy = 'p1';
        if(dist(p2.x+25, p2.y, ball.x, ball.y) < 40) ball.heldBy = 'p2';

        // Выбивание мяча
        if(ball.heldBy === 'p1' && dist(p1.x+25, p1.y, p2.x+25, p2.y) < 70){
            kickBall('p1');
        }
        if(ball.heldBy === 'p2' && dist(p2.x+25, p2.y, p1.x+25, p1.y) < 70){
            kickBall('p2');
        }
    }

    // ГОЛЫ
    if(ball.x < goalL.x + goalL.w && ball.y > goalL.y && ball.y < goalL.y + goalL.h){
        scoreR++; updateScore(); resetPositions();
    }
    if(ball.x > goalR.x && ball.y > goalR.y && ball.y < goalR.y + goalR.h){
        scoreL++; updateScore(); resetPositions();
    }

    frameCount++;
}

function kickBall(byPlayer){
    const angle = byPlayer === 'p1' ? -Math.PI/2 : Math.PI/2;
    const power = 15;
    ball.vx = Math.cos(angle) * power;
    ball.vy = Math.sin(angle) * power - 5;
    ball.heldBy = null;
}

// ОТРИСОВКА
function render(){
    ctx.clearRect(0, 0, width, height);
    
    // Ворота
    ctx.fillStyle = '#dfe6e9';
    ctx.fillRect(goalL.x, goalL.y, goalL.w, goalL.h);
    ctx.fillRect(goalR.x, 生成.y, goalR.w, goalR.h);
    
    // Игроки
    drawPlayer(p1, '#e17055', "1");
    drawPlayer(p2, '#00b894', "2");
    
    // Мяч
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2);
    ctx.fillStyle = '#fdcb6e';
    ctx.fill();
}

function drawPlayer(obj, color, num){
    ctx.fillStyle = color;
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(num, obj.x + 25, obj.y + 35);
}
