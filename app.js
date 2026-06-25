// Check if service workers are supported by the browser
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('Service Worker registered successfully with scope: ', registration.scope);
            })
            .catch((error) => {
                console.log('Service Worker registration failed: ', error);
            });
    });
}



const canvas = document.getElementById('drawCanvas');
const ctx = canvas.getContext('2d');

// Default App State
let isDrawing = false;
let lastX = 0;
let lastY = 0;

// Kaleidoscope Configurations
let segments = 8;        // Number of radial sections
let isMirrored = true;   // Toggle for kaleidoscope mirroring
let strokeColor = '#00e5ff'; // Default swatch color
let lineWidth = 3;

// Resize canvas to fill the screen
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Set a dark background immediately
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Call once on load

const maxUndoSteps = 6;
let undoStack = [];

function saveState() {
    // If we exceed our limit, remove the oldest state at the beginning of the array
    if (undoStack.length >= maxUndoSteps) {
        undoStack.shift(); 
    }
    // Save the current canvas as a base64 image string
    undoStack.push(canvas.toDataURL());
}

function undo() {
    console.log('undoing...');
    if (undoStack.length > 0) {
        let prevState = undoStack.pop();
        let img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
        img.src = prevState;
    } else {
        // If the stack is empty, revert to the blank dark background
        ctx.fillStyle = '#121212';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

canvas.addEventListener('pointerdown', startDrawing);
canvas.addEventListener('pointermove', draw);
canvas.addEventListener('pointerup', stopDrawing);
canvas.addEventListener('pointerout', stopDrawing);

function getCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
}

function startDrawing(e) {
    isDrawing = true;
    saveState(); // Save the canvas state before altering it
    [lastX, lastY] = getCoordinates(e);
}

function stopDrawing() {
    isDrawing = false;
}

function draw(e) {
    if (!isDrawing) return;
    const [currentX, currentY] = getCoordinates(e);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const angleStep = (Math.PI * 2) / segments;

    // Loop through each slice of the kaleidoscope
    for (let i = 0; i < segments; i++) {
        ctx.save();
        
        // Move the origin point to the center of the screen
        ctx.translate(centerX, centerY);
        
        // Rotate the canvas for this specific segment
        ctx.rotate(i * angleStep);

        // Draw the standard stroke
        drawLine(lastX - centerX, lastY - centerY, currentX - centerX, currentY - centerY);

        // If mirroring is turned on, flip the canvas and draw the reflection
        if (isMirrored) {
            ctx.scale(1, -1);
            drawLine(lastX - centerX, lastY - centerY, currentX - centerX, currentY - centerY);
        }

        ctx.restore();
    }

    // Update the last position to the current position for the next frame
    [lastX, lastY] = [currentX, currentY];
}

// Bind the Thickness Slider
const thicknessSlider = document.getElementById('thicknessSlider');
const thicknessValue = document.getElementById('thicknessValue');

thicknessSlider.addEventListener('input', (e) => {
    lineWidth = parseInt(e.target.value, 10);
    thicknessValue.innerText = lineWidth; // Updates the text label live
});

// Helper function to handle the actual stroke rendering
function drawLine(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
}


// Bind the Undo Button
document.getElementById('undoBtn').addEventListener('click', undo);

// Bind the Clear Button
function clearCanvas() {
    console.log("CLEAR!");
    saveState(); // Save the current canvas state before clearing it
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

document.getElementById('clearBtn').addEventListener('click', clearCanvas);

// Bind the Segments Slider
const segmentSlider = document.getElementById('segmentSlider');
const segmentCount = document.getElementById('segmentCount');

segmentSlider.addEventListener('input', (e) => {
    segments = parseInt(e.target.value, 10);
    segmentCount.innerText = segments; // Updates the text label live
});

// Bind the Mirror Toggle
document.getElementById('mirrorToggle').addEventListener('change', (e) => {
    isMirrored = e.target.checked;
});

// Bind the Color Swatches
document.querySelectorAll('.swatch').forEach(swatch => {
    swatch.addEventListener('click', (e) => {
        strokeColor = e.target.getAttribute('data-color');
        
        // Optional: Highlight the selected swatch
        document.querySelectorAll('.swatch').forEach(s => s.style.borderColor = '#555');
        e.target.style.borderColor = '#fff';
    });
});

// Bind the Open Color Picker Button
const openColorPickerBtn = document.getElementById('openColorPicker');
const colorPicker = document.createElement('input');
colorPicker.type = 'color';

openColorPickerBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevents triggering any parent button events
    const rect = openColorPickerBtn.getBoundingClientRect();
    colorPicker.style.position = 'absolute';
    colorPicker.style.left = `${rect.left}px`;
    colorPicker.style.top = `${rect.bottom}px`;
    document.body.appendChild(colorPicker);
    colorPicker.click();

    colorPicker.addEventListener('input', () => {
        strokeColor = colorPicker.value;
        
        // Optional: Highlight the selected swatch
        document.querySelectorAll('.swatch').forEach(s => s.style.borderColor = '#555');
        const selectedSwatch = document.querySelector(`.swatch[data-color="\${strokeColor}"]`);
        if (selectedSwatch) {
            selectedSwatch.style.borderColor = '#fff';
        }
    });

    colorPicker.addEventListener('blur', () => {
        document.body.removeChild(colorPicker);
    });
});