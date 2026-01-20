// Scan page: camera capture and OCR

const TESSERACT_CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js";

// DOM elements
const elUnsupported = document.getElementById("scan-unsupported");
const elDenied = document.getElementById("scan-denied");
const elLoading = document.getElementById("scan-loading");
const elPreview = document.getElementById("scan-preview");
const elReview = document.getElementById("scan-review");
const elVideo = document.getElementById("camera-video");
const elCropCanvas = document.getElementById("crop-canvas");
const elOcrLoading = document.getElementById("ocr-loading");
const elOcrResult = document.getElementById("ocr-result");
const elOcrError = document.getElementById("ocr-error");
const elRecognizedValue = document.getElementById("recognized-value");
const elOcrWarning = document.getElementById("ocr-warning");
const btnCapture = document.getElementById("btn-capture");
const btnConfirm = document.getElementById("btn-confirm");
const btnRetake = document.getElementById("btn-retake");
const fountainId = document.getElementById("fountain-id").value;

let mediaStream = null;
let tesseractWorker = null;

// Show a specific state, hide others
function showState(state) {
  elUnsupported.style.display = "none";
  elDenied.style.display = "none";
  elLoading.style.display = "none";
  elPreview.style.display = "none";
  elReview.style.display = "none";

  if (state === "unsupported") elUnsupported.style.display = "block";
  else if (state === "denied") elDenied.style.display = "block";
  else if (state === "loading") elLoading.style.display = "block";
  else if (state === "preview") elPreview.style.display = "block";
  else if (state === "review") elReview.style.display = "block";
}

// Check for camera support
function isCameraSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// Start camera
async function startCamera() {
  const constraints = {
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1280 },
      height: { ideal: 960 },
    },
  };

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    elVideo.srcObject = mediaStream;
    await elVideo.play();
    showState("preview");
  } catch (err) {
    console.error("Camera error:", err);
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      showState("denied");
    } else {
      showState("unsupported");
    }
  }
}

// Stop camera
function stopCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }
}

// Calculate crop region based on overlay box (70% width, 25% height, centered)
function getCropRegion(videoWidth, videoHeight) {
  const boxWidthRatio = 0.7;
  const boxHeightRatio = 0.25;

  const cropWidth = Math.floor(videoWidth * boxWidthRatio);
  const cropHeight = Math.floor(videoHeight * boxHeightRatio);
  const cropX = Math.floor((videoWidth - cropWidth) / 2);
  const cropY = Math.floor((videoHeight - cropHeight) / 2);

  return { x: cropX, y: cropY, width: cropWidth, height: cropHeight };
}

// Capture frame and crop to overlay region
function captureFrame() {
  const videoWidth = elVideo.videoWidth;
  const videoHeight = elVideo.videoHeight;
  const crop = getCropRegion(videoWidth, videoHeight);

  // Draw cropped region to canvas
  elCropCanvas.width = crop.width;
  elCropCanvas.height = crop.height;
  const ctx = elCropCanvas.getContext("2d");
  ctx.drawImage(
    elVideo,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );

  return elCropCanvas;
}

// Preprocess image for better OCR on LCD displays
function preprocessForOcr(sourceCanvas) {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  // Create a processing canvas
  const procCanvas = document.createElement("canvas");
  procCanvas.width = width;
  procCanvas.height = height;
  const ctx = procCanvas.getContext("2d");

  // Draw original
  ctx.drawImage(sourceCanvas, 0, 0);

  // Get image data
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Convert to grayscale and threshold
  // LCD has LIGHT digits on DARK background
  // Tesseract needs BLACK text on WHITE background
  // So: light pixels (digits) → black, dark pixels (background) → white
  for (let i = 0; i < data.length; i += 4) {
    // Grayscale using luminance formula
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

    // LCD has bright blue backlight with dark digit segments
    // So: bright pixels (background) → white, dark pixels (digits) → black
    const threshold = 120;
    const final = gray > threshold ? 255 : 0;

    data[i] = final;     // R
    data[i + 1] = final; // G
    data[i + 2] = final; // B
    // Alpha stays unchanged
  }

  ctx.putImageData(imageData, 0, 0);
  return procCanvas;
}

// Load tesseract.js dynamically
async function loadTesseract() {
  if (tesseractWorker) return tesseractWorker;

  const Tesseract = await import(TESSERACT_CDN);
  tesseractWorker = await Tesseract.createWorker("eng", 1, {
    workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js",
    corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js",
  });

  // Configure for digits only, optimized for LCD 7-segment displays
  await tesseractWorker.setParameters({
    tessedit_char_whitelist: "0123456789",
    tessedit_pageseg_mode: "7", // Single line
  });

  return tesseractWorker;
}

// Run OCR on the cropped canvas
async function runOcr(canvas) {
  // Preprocess for LCD display (invert, threshold)
  const processedCanvas = preprocessForOcr(canvas);

  // Update displayed preview to show processed image
  const ctx = elCropCanvas.getContext("2d");
  elCropCanvas.width = processedCanvas.width;
  elCropCanvas.height = processedCanvas.height;
  ctx.drawImage(processedCanvas, 0, 0);

  const worker = await loadTesseract();
  const { data } = await worker.recognize(processedCanvas);
  return data.text;
}

// Extract digits from OCR text and strip leading zeros
function extractDigits(text) {
  const digits = text.replace(/[^0-9]/g, "");
  // Strip leading zeros but keep at least one digit
  return digits.replace(/^0+/, "") || "0";
}

// Validate the recognized value
function validateValue(value) {
  const num = parseInt(value, 10);
  if (isNaN(num)) return { valid: false };

  // Warn if outside typical range (adjust as needed)
  if (num < 1000 || num > 100000) {
    return { valid: true, warning: `Value ${num} seems unusual. Please verify.` };
  }
  return { valid: true };
}

// Handle capture button
async function handleCapture() {
  const canvas = captureFrame();
  stopCamera();

  showState("review");
  elOcrLoading.style.display = "block";
  elOcrResult.style.display = "none";
  elOcrError.style.display = "none";
  btnConfirm.style.display = "none";

  try {
    const rawText = await runOcr(canvas);
    const digits = extractDigits(rawText);

    if (!digits) {
      elOcrLoading.style.display = "none";
      elOcrError.style.display = "block";
      return;
    }

    elRecognizedValue.value = digits;

    const validation = validateValue(digits);
    if (validation.warning) {
      elOcrWarning.textContent = validation.warning;
      elOcrWarning.style.display = "block";
    } else {
      elOcrWarning.style.display = "none";
    }

    elOcrLoading.style.display = "none";
    elOcrResult.style.display = "block";
    btnConfirm.style.display = "inline-flex";
    elRecognizedValue.focus();
    elRecognizedValue.select();
  } catch (err) {
    console.error("OCR error:", err);
    elOcrLoading.style.display = "none";
    elOcrError.style.display = "block";
  }
}

// Handle retake button
function handleRetake() {
  elOcrWarning.style.display = "none";
  startCamera();
}

// Handle confirm button
function handleConfirm() {
  const value = elRecognizedValue.value.trim();
  if (!value) return;

  // Redirect back to observations with the scanned value
  const params = new URLSearchParams();
  if (fountainId) params.set("fountain_id", fountainId);
  params.set("scanned", value);

  window.location.href = `/observations?${params.toString()}`;
}

// Initialize
async function init() {
  if (!isCameraSupported()) {
    showState("unsupported");
    return;
  }

  showState("loading");
  await startCamera();
}

// Event listeners
btnCapture.addEventListener("click", handleCapture);
btnRetake.addEventListener("click", handleRetake);
btnConfirm.addEventListener("click", handleConfirm);

// Allow Enter key to confirm
elRecognizedValue.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleConfirm();
  }
});

// Start
init();
