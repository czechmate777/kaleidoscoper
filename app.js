/**
 * Kaleidoscope Studio - Main Application Script
 */

// --- 1. Application State & Configuration ---
const state = {
    isDrawing: false,
    lastX: 0,
    lastY: 0,
    segments: 8,
    isMirrored: true,
    strokeColor: '#00e5ff',
    lineWidth: 3,
    undoStack: [],
    maxUndoSteps: 6,
    backgroundColor: '#121212'
};

// --- 2. DOM Elements Cache ---
const elements = {
    canvas: document.getElementById('drawCanvas'),
    undoBtn: document.getElementById('undoBtn'),
    clearBtn: document.getElementById('clearBtn'),
    segmentSlider: document.getElementById('segmentSlider'),
    segmentCount: document.getElementById('segmentCount'),
    thicknessSlider: document.getElementById('thicknessSlider'),
    thicknessValue: document.getElementById('thicknessValue'),
    mirrorToggle: document.getElementById('mirrorToggle'),
    swatches: document.querySelectorAll('.swatch'),
    openColorPickerBtn: document.getElementById('openColorPicker')
};

const ctx = elements.canvas.getContext('2d');

// --- 3. Initialization ---
function initApp() {
    registerServiceWorker();
    resizeCanvas();
    clearCanvas(false); // Initial clear to set the background (without saving to undo stack)
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

// --- 4. Canvas & Drawing Logic ---
function resizeCanvas() {
    elements.canvas.width = window.innerWidth;
    elements.canvas.height = window.innerHeight;
    // Re-apply background after a resize
    ctx.fillStyle = state.backgroundColor;
    ctx.fillRect(0, 0, elements.canvas.width, elements.canvas.height);
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

    const centerX = elements.canvas.width / 2;
    const centerY = elements.canvas.height / 2;
    const angleStep = (Math.PI * 2) / state.segments;

    // Render loop for kaleidoscope segments
    for (let i = 0; i < state.segments; i++) {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(i * angleStep);

        // Draw standard stroke
        drawLine(state.lastX - centerX, state.lastY - centerY, currentX - centerX, currentY - centerY);

        // Draw mirrored stroke if enabled
        if (state.isMirrored) {
            ctx.scale(1, -1);
            drawLine(state.lastX - centerX, state.lastY - centerY, currentX - centerX, currentY - centerY);
        }

        ctx.restore();
    }

    [state.lastX, state.lastY] = [currentX, currentY];
}

function drawLine(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = state.strokeColor;
    ctx.lineWidth = state.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
}

// --- 5. State Management (Undo & Clear) ---
function saveState() {
    if (state.undoStack.length >= state.maxUndoSteps) {
        state.undoStack.shift(); 
    }
    state.undoStack.push(elements.canvas.toDataURL());
}

function undo() {
    if (state.undoStack.length > 0) {
        const prevState = state.undoStack.pop();
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
            ctx.drawImage(img, 0, 0);
        };
        img.src = prevState;
    } else {
        clearCanvas(false);
    }
}

function clearCanvas(saveToHistory = true) {
    if (saveToHistory) saveState();
    ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
    ctx.fillStyle = state.backgroundColor;
    ctx.fillRect(0, 0, elements.canvas.width, elements.canvas.height);
}

// --- 6. Event Bindings ---
function bindEvents() {
    // Window Resize
    window.addEventListener('resize', resizeCanvas);

    // Canvas Pointer Events
    elements.canvas.addEventListener('pointerdown', startDrawing);
    elements.canvas.addEventListener('pointermove', draw);
    elements.canvas.addEventListener('pointerup', stopDrawing);
    elements.canvas.addEventListener('pointerout', stopDrawing);

    // UI Buttons
    elements.undoBtn?.addEventListener('click', undo);
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

    // Preset Color Swatches
    elements.swatches.forEach(swatch => {
        swatch.addEventListener('click', (e) => {
            state.strokeColor = e.target.getAttribute('data-color');
            updateActiveSwatch(e.target);
        });
    });

    // Dynamic Color Picker setup
    if (elements.openColorPickerBtn) {
        // Create a hidden input instead of appending/removing constantly
        const hiddenColorInput = document.createElement('input');
        hiddenColorInput.type = 'color';
        hiddenColorInput.style.display = 'none';
        document.body.appendChild(hiddenColorInput);

        elements.openColorPickerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            hiddenColorInput.click(); // Trigger the native color picker
        });

        hiddenColorInput.addEventListener('input', (e) => {
            state.strokeColor = e.target.value;
            // Find and highlight a matching swatch if it exists
            const matchingSwatch = document.querySelector(`.swatch[data-color="${state.strokeColor}"]`);
            updateActiveSwatch(matchingSwatch);
        });
    }
}

// Helper to manage visual states of swatches
function updateActiveSwatch(activeElement) {
    elements.swatches.forEach(s => s.style.borderColor = '#555');
    if (activeElement) {
        activeElement.style.borderColor = '#fff';
    }
}

// --- 7. Boot the Application ---
initApp();