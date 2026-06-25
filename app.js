/**
 * Kaleidoscope Studio - Main Application Script
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
    backgroundColor: '#121212'
};

// --- 2. DOM Elements Cache ---
const elements = {
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
    swatches: document.querySelectorAll('.swatch')
};

const ctx = elements.canvas.getContext('2d');

// Disable antialiasing for the context
ctx.imageSmoothingEnabled = false;
ctx.webkitImageSmoothingEnabled = false;
ctx.mozImageSmoothingEnabled = false;
ctx.msImageSmoothingEnabled = false;

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
    // Determine the new maximum required dimension
    const requiredSize = Math.max(window.innerWidth, window.innerHeight);

    // THE GATEKEEPER: If the canvas is already big enough, stop right here.
    if (elements.canvas.width >= requiredSize) {
        return; // Do nothing. Let the CSS handle the centering!
    }

    // 1. Save the current canvas content before the resize wipes it
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    // Disable antialiasing for the context
    tempCtx.imageSmoothingEnabled = false;
    tempCtx.webkitImageSmoothingEnabled = false;
    tempCtx.mozImageSmoothingEnabled = false;
    tempCtx.msImageSmoothingEnabled = false;

    tempCanvas.width = elements.canvas.width;
    tempCanvas.height = elements.canvas.height;
    
    // Only copy if the canvas actually has size (prevents errors on initial boot)
    if (elements.canvas.width > 0) {
        tempCtx.drawImage(elements.canvas, 0, 0);
    }

    // 2. Calculate the new square size based on the largest screen dimension
    const maxSize = Math.max(window.innerWidth, window.innerHeight);
    elements.canvas.width = maxSize;
    elements.canvas.height = maxSize;

    // Disable antialiasing for the context
    ctx.imageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;

    // 3. Re-apply the dark background to the new square
    ctx.fillStyle = state.backgroundColor;
    ctx.fillRect(0, 0, elements.canvas.width, elements.canvas.height);

    // 4. Restore the saved drawing to the exact center of the new square
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
    state.redoStack = [];
}

function undo() {
    // Only undo if we actually have history
    if (state.undoStack.length > 0) {
        // 1. Save the CURRENT canvas into the redo stack before going backward
        state.redoStack.push(elements.canvas.toDataURL());

        // 2. Pop the previous state and draw it
        const prevState = state.undoStack.pop();
        const img = new Image();
        img.onload = () => {
            ctx.imageSmoothingEnabled = false; // Protect pixels during restoration
            ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
            ctx.drawImage(img, 0, 0);
        };
        img.src = prevState;
    }
}

function redo() {
    // Only redo if we have a future state saved
    if (state.redoStack.length > 0) {
        // 1. Save the CURRENT canvas into the undo stack before going forward
        state.undoStack.push(elements.canvas.toDataURL());

        // 2. Pop the next state and draw it
        const nextState = state.redoStack.pop();
        const img = new Image();
        img.onload = () => {
            ctx.imageSmoothingEnabled = false; // Protect pixels during restoration
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
    // 1. Get the current canvas content as a high-quality PNG image string
    const imageString = elements.canvas.toDataURL('image/png');

    // 2. Create a temporary, invisible link element
    const downloadLink = document.createElement('a');
    
    // 3. Set a dynamic filename using the current timestamp so they don't overwrite each other
    downloadLink.download = `kaleidoscope-${Date.now()}.png`;
    
    // 4. Attach the image data to the link
    downloadLink.href = imageString;

    // 5. Append to the document, click it to trigger the download, and immediately remove it
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

// --- 6. Event Bindings ---
function bindEvents() {
    // Window Resize// --- Window Resize (Debounced) ---
    window.addEventListener('resize', () => {
        // 1. Clear the existing timer if the user is still actively resizing
        if (state.resizeTimeout) {
            clearTimeout(state.resizeTimeout);
        }
        
        // 2. Set a new timer. It will only execute if 500ms pass without another resize event.
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

    // --- Swatches & Dynamic Color Picker ---
    
    // Create the hidden native color input once
    const hiddenColorInput = document.createElement('input');
    hiddenColorInput.type = 'color';
    hiddenColorInput.style.display = 'none';
    document.body.appendChild(hiddenColorInput);

    let swatchToUpdate = null; // Tracks which swatch we are currently editing

    elements.swatches.forEach(swatch => {
        swatch.addEventListener('click', (e) => {
            const clickedSwatch = e.target;

            // Check if the clicked swatch is ALREADY the active one
            if (clickedSwatch.classList.contains('active')) {
                // It is active! Open the native color picker to change its color.
                swatchToUpdate = clickedSwatch;
                hiddenColorInput.value = clickedSwatch.getAttribute('data-color');
                hiddenColorInput.click();
            } else {
                // It is not active. Just select it.
                state.strokeColor = clickedSwatch.getAttribute('data-color');
                updateActiveSwatch(clickedSwatch);
            }
        });
    });

    // Listen for changes from the native color picker
    hiddenColorInput.addEventListener('input', (e) => {
        if (swatchToUpdate) {
            const newColor = e.target.value;
            
            // Update the swatch visually
            swatchToUpdate.setAttribute('data-color', newColor);
            swatchToUpdate.style.background = newColor;
            
            // Update the global drawing color
            state.strokeColor = newColor;
        }
    });
}

// Helper to manage visual states of swatches
function updateActiveSwatch(activeElement) {
    // Remove the 'active' class from all swatches
    elements.swatches.forEach(s => s.classList.remove('active'));
    
    // Add the 'active' class to the newly selected one
    if (activeElement) {
        activeElement.classList.add('active');
    }
}

// --- 7. Boot the Application ---
initApp();