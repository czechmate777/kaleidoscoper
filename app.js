/**
 * Kaleidoscopee - Main Application Script
 */

// --- 1. Application State & Configuration ---
const state = {
    isDrawing: false,
    lastX: 0,
    lastY: 0,
    resizeTimeout: null,
    segments: 8,
    isMirrored: true,
    strokeColor: '#00e5ff',
    lineWidth: 3,
    undoStack: [],
    redoStack: [],
    maxUndoSteps: 6,
    backgroundColor: '#121212',
    
    // Color Picker State
    currentHue: 180,
    currentSaturation: 100,
    currentBrightness: 100,
    isDraggingWheel: false,
    swatchToUpdate: null
};

// --- 2. DOM Elements Cache ---
const elements = {
    // Main UI
    canvas: document.getElementById('drawCanvas'),
    saveBtn: document.getElementById('saveBtn'),
    undoBtn: document.getElementById('undoBtn'),
    redoBtn: document.getElementById('redoBtn'),
    clearBtn: document.getElementById('clearBtn'),
    segmentSlider: document.getElementById('segmentSlider'),
    segmentCount: document.getElementById('segmentCount'),
    thicknessSlider: document.getElementById('thicknessSlider'),
    thicknessValue: document.getElementById('thicknessValue'),
    mirrorToggle: document.getElementById('mirrorToggle'),
    swatches: document.querySelectorAll('.swatch'),
    controlPanel: document.getElementById('controlPanel'),
    menuIcon: document.getElementById('menuIcon'),
    
    // Custom Color Picker UI
    pickerContainer: document.getElementById('pickerContainer'),
    wheelCanvas: document.getElementById('wheelCanvas'),
    wheelMarker: document.getElementById('wheelMarker'),
    brightnessSlider: document.getElementById('brightnessSlider'),
    brightnessValue: document.getElementById('brightnessValue')
};

// --- 3. Context Initialization ---
const ctx = elements.canvas.getContext('2d');
const wheelCtx = elements.wheelCanvas.getContext('2d');

// Disable antialiasing for the main context
ctx.imageSmoothingEnabled = false;
ctx.webkitImageSmoothingEnabled = false;
ctx.mozImageSmoothingEnabled = false;
ctx.msImageSmoothingEnabled = false;

// --- 4. Initialization ---
function initApp() {
    registerServiceWorker();
    resizeCanvas();
    clearCanvas(false); 
    bindEvents();
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('Service Worker registered successfully with scope:', reg.scope))
                .catch(err => console.error('Service Worker registration failed:', err));
        });
    }
}

// --- 5. Canvas & Drawing Logic ---
function resizeCanvas() {
    const requiredSize = Math.max(window.innerWidth, window.innerHeight);

    if (elements.canvas.width >= requiredSize) {
        return; 
    }

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.imageSmoothingEnabled = false;
    tempCtx.webkitImageSmoothingEnabled = false;
    tempCtx.mozImageSmoothingEnabled = false;
    tempCtx.msImageSmoothingEnabled = false;

    tempCanvas.width = elements.canvas.width;
    tempCanvas.height = elements.canvas.height;
    
    if (elements.canvas.width > 0) {
        tempCtx.drawImage(elements.canvas, 0, 0);
    }

    const maxSize = Math.max(window.innerWidth, window.innerHeight);
    elements.canvas.width = maxSize;
    elements.canvas.height = maxSize;

    ctx.imageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;

    ctx.fillStyle = state.backgroundColor;
    ctx.fillRect(0, 0, elements.canvas.width, elements.canvas.height);

    if (tempCanvas.width > 0) {
        const offsetX = (maxSize - tempCanvas.width) / 2;
        const offsetY = (maxSize - tempCanvas.height) / 2;
        ctx.drawImage(tempCanvas, offsetX, offsetY);
    }
}

function getCoordinates(e) {
    const rect = elements.canvas.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
}

function startDrawing(e) {
    state.isDrawing = true;
    saveState();
    [state.lastX, state.lastY] = getCoordinates(e);
}

function stopDrawing() {
    state.isDrawing = false;
}

function draw(e) {
    if (!state.isDrawing) return;
    const [currentX, currentY] = getCoordinates(e);

    const pressure = e.pressure > 0 ? e.pressure : 1.0;
    const dynamicWidth = state.lineWidth * Math.max(pressure, 0.2);

    const centerX = elements.canvas.width / 2;
    const centerY = elements.canvas.height / 2;
    const angleStep = (Math.PI * 2) / state.segments;

    for (let i = 0; i < state.segments; i++) {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(i * angleStep);

        drawPressureLine(
            state.lastX - centerX, 
            state.lastY - centerY, 
            currentX - centerX, 
            currentY - centerY, 
            dynamicWidth
        );

        if (state.isMirrored) {
            ctx.scale(1, -1);
            drawPressureLine(
                state.lastX - centerX, 
                state.lastY - centerY, 
                currentX - centerX, 
                currentY - centerY, 
                dynamicWidth
            );
        }
        ctx.restore();
    }

    [state.lastX, state.lastY] = [currentX, currentY];
}

function drawPressureLine(x1, y1, x2, y2, width) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = state.strokeColor;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
}

// --- 6. State Management (Undo & Clear) ---
function saveState() {
    if (state.undoStack.length >= state.maxUndoSteps) {
        state.undoStack.shift(); 
    }
    state.undoStack.push(elements.canvas.toDataURL());
    state.redoStack = [];
}

function undo() {
    if (state.undoStack.length > 0) {
        state.redoStack.push(elements.canvas.toDataURL());
        const prevState = state.undoStack.pop();
        const img = new Image();
        img.onload = () => {
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
            ctx.drawImage(img, 0, 0);
        };
        img.src = prevState;
    }
}

function redo() {
    if (state.redoStack.length > 0) {
        state.undoStack.push(elements.canvas.toDataURL());
        const nextState = state.redoStack.pop();
        const img = new Image();
        img.onload = () => {
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
            ctx.drawImage(img, 0, 0);
        };
        img.src = nextState;
    }
}

function clearCanvas(saveToHistory = true) {
    if (saveToHistory) saveState();
    ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
    ctx.fillStyle = state.backgroundColor;
    ctx.fillRect(0, 0, elements.canvas.width, elements.canvas.height);
}

function saveImage() {
    const imageString = elements.canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.download = `kaleidoscope-${Date.now()}.png`;
    downloadLink.href = imageString;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

// --- 7. Custom Radial Color Picker Logic ---
function drawColorWheel() {
    const width = elements.wheelCanvas.width;
    const height = elements.wheelCanvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = width / 2;

    wheelCtx.clearRect(0, 0, width, height);

    for (let angle = 0; angle < 360; angle++) {
        const startAngle = (angle - 1) * Math.PI / 180;
        const endAngle = (angle + 1) * Math.PI / 180;

        const gradient = wheelCtx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, `hsla(${angle}, 0%, ${state.currentBrightness}%, 1)`);
        gradient.addColorStop(1, `hsla(${angle}, 100%, ${state.currentBrightness / 2}%, 1)`);

        wheelCtx.beginPath();
        wheelCtx.moveTo(cx, cy);
        wheelCtx.arc(cx, cy, radius, startAngle, endAngle);
        wheelCtx.closePath();
        wheelCtx.fillStyle = gradient;
        wheelCtx.fill();
    }
}

function handleWheelInteraction(e) {
    const rect = elements.wheelCanvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    const dx = x - cx;
    const dy = y - cy;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = rect.width / 2;

    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    state.currentHue = Math.round(angle);

    const rawSaturation = (distance / maxRadius) * 100;
    state.currentSaturation = Math.min(Math.round(rawSaturation), 100);

    let markerX = dx;
    let markerY = dy;
    if (distance > maxRadius) {
        markerX = (dx / distance) * maxRadius;
        markerY = (dy / distance) * maxRadius;
    }

    elements.wheelMarker.style.left = `${cx + markerX}px`;
    elements.wheelMarker.style.top = `${cy + markerY}px`;

    updateSelectedColor();
}

function updateMarkerFromColor(hexColor) {
    const temp = document.createElement('div');
    temp.style.color = hexColor;
    document.body.appendChild(temp);
    const rgb = window.getComputedStyle(temp).color;
    document.body.removeChild(temp);

    const rgbMatch = rgb.match(/\d+/g);
    if (!rgbMatch) return;
    let [r, g, b] = rgbMatch.map(Number);
    r /= 255; g /= 255; b /= 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; 
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    state.currentHue = Math.round(h * 360);
    state.currentSaturation = Math.round(s * 100);
    state.currentBrightness = Math.round(l * 200); 

    elements.brightnessSlider.value = state.currentBrightness;
    elements.brightnessValue.innerText = `${state.currentBrightness}%`;

    const radius = elements.wheelCanvas.width / 2;
    const angleRad = state.currentHue * (Math.PI / 180);
    const distance = (state.currentSaturation / 100) * radius;

    const mx = radius + Math.cos(angleRad) * distance;
    const my = radius + Math.sin(angleRad) * distance;

    elements.wheelMarker.style.left = `${mx}px`;
    elements.wheelMarker.style.top = `${my}px`;

    drawColorWheel();
}

function updateSelectedColor() {
    const computedLightness = Math.round((state.currentBrightness / 100) * (100 - (state.currentSaturation / 2)));
    const finalColor = `hsl(${state.currentHue}, ${state.currentSaturation}%, ${computedLightness}%)`;

    if (state.swatchToUpdate) {
        state.swatchToUpdate.setAttribute('data-color', finalColor);
        state.swatchToUpdate.style.background = finalColor;
        state.strokeColor = finalColor;
    }
}

function updateActiveSwatch(activeElement) {
    elements.swatches.forEach(s => s.classList.remove('active'));
    if (activeElement) {
        activeElement.classList.add('active');
    }
}

// --- 8. Event Bindings ---
function bindEvents() {
    // Window Resize
    window.addEventListener('resize', () => {
        if (state.resizeTimeout) {
            clearTimeout(state.resizeTimeout);
        }
        state.resizeTimeout = setTimeout(() => {
            resizeCanvas();
        }, 500); 
    });

    // Canvas Pointer Events
    elements.canvas.addEventListener('pointerdown', startDrawing);
    elements.canvas.addEventListener('pointermove', draw);
    elements.canvas.addEventListener('pointerup', stopDrawing);
    elements.canvas.addEventListener('pointerout', stopDrawing);

    // UI Buttons
    elements.saveBtn?.addEventListener('click', saveImage);
    elements.undoBtn?.addEventListener('click', undo);
    elements.redoBtn?.addEventListener('click', redo);
    elements.clearBtn?.addEventListener('click', () => clearCanvas(true));

    // UI Sliders & Toggles
    elements.segmentSlider?.addEventListener('input', (e) => {
        state.segments = parseInt(e.target.value, 10);
        if (elements.segmentCount) elements.segmentCount.innerText = state.segments;
    });

    elements.thicknessSlider?.addEventListener('input', (e) => {
        state.lineWidth = parseInt(e.target.value, 10);
        if (elements.thicknessValue) elements.thicknessValue.innerText = state.lineWidth;
    });

    elements.mirrorToggle?.addEventListener('change', (e) => {
        state.isMirrored = e.target.checked;
    });

    // Swatches & Custom Color Picker interactions
    elements.swatches.forEach(swatch => {
        swatch.addEventListener('click', (e) => {
            const clickedSwatch = e.target;

            if (clickedSwatch.classList.contains('active')) {
                state.swatchToUpdate = clickedSwatch;
                elements.pickerContainer.classList.toggle('hidden');
                if (!elements.pickerContainer.classList.contains('hidden')) {
                    updateMarkerFromColor(clickedSwatch.getAttribute('data-color'));
                }
            } else {
                state.strokeColor = clickedSwatch.getAttribute('data-color');
                updateActiveSwatch(clickedSwatch);
                elements.pickerContainer.classList.add('hidden');
                state.swatchToUpdate = null;
            }
        });
    });

    // Color Wheel Handlers
    function startWheelDrag(e) {
        state.isDraggingWheel = true;
        handleWheelInteraction(e);
    }

    function dragWheel(e) {
        if (!state.isDraggingWheel) return;
        e.preventDefault(); 
        handleWheelInteraction(e);
    }

    function stopWheelDrag() {
        state.isDraggingWheel = false;
    }

    elements.wheelCanvas.addEventListener('mousedown', startWheelDrag);
    window.addEventListener('mousemove', dragWheel);
    window.addEventListener('mouseup', stopWheelDrag);

    elements.wheelCanvas.addEventListener('touchstart', startWheelDrag, { passive: false });
    window.addEventListener('touchmove', dragWheel, { passive: false });
    window.addEventListener('touchend', stopWheelDrag);

    // Brightness Slider Handler
    elements.brightnessSlider.addEventListener('input', (e) => {
        state.currentBrightness = parseInt(e.target.value, 10);
        elements.brightnessValue.innerText = `${state.currentBrightness}%`;
        drawColorWheel();
        updateSelectedColor();
    });

    // Menu Toggle
    elements.menuIcon.addEventListener('click', () => {
        elements.controlPanel.classList.toggle('open');
    });
}

// --- 9. Boot the Application ---
initApp();