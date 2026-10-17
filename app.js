const screens = [...document.querySelectorAll(".screen")];
const dateDisplay = document.getElementById("date-display");
const dateStatus = document.getElementById("date-status");
let enteredCode = "";
let busy = false;
let birthdayTypingTimer;

function typeText(element, text, delay, onComplete) {
  const characters = Array.from(text);
  let index = 0;
  element.textContent = "";
  element.classList.add("typing-active");
  const typeNextCharacter = () => {
    element.textContent += characters[index++];
    if (index < characters.length) {
      birthdayTypingTimer = setTimeout(typeNextCharacter, delay);
    } else {
      element.classList.remove("typing-active");
      onComplete?.();
    }
  };
  typeNextCharacter();
}

function animateBirthdayMessage() {
  clearTimeout(birthdayTypingTimer);
  const title = document.getElementById("birthday-title-text");
  const message = document.getElementById("birthday-message-text");
  const titleText = "Happy Birthday, Cutie Pie!";
  const messageText = "May your day feel like warm sunshine, soft hugs, and all the love your heart can hold. You deserve the sweetest things. 🎂";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    title.textContent = titleText;
    message.textContent = messageText;
    return;
  }
  typeText(title, titleText, 55, () => {
    birthdayTypingTimer = setTimeout(() => typeText(message, messageText, 18), 220);
  });
}

function showScreen(id) {
  screens.forEach(screen => {
    screen.classList.toggle("active", screen.id === id);
    screen.setAttribute("aria-hidden", screen.id === id ? "false" : "true");
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (id === "birthday-screen") animateBirthdayMessage();
}
function renderCode() {
  dateDisplay.innerHTML = "";
  if (!enteredCode.length) {
    const placeholder = document.createElement("span");
    placeholder.className = "date-placeholder";
    placeholder.textContent = "DD/MM/YYYY";
    dateDisplay.appendChild(placeholder);
    return;
  }
  for (let i = 0; i < 8; i++) {
    if (i === 2 || i === 4) {
      const separator = document.createElement("span");
      separator.className = "date-separator";
      separator.textContent = "/";
      dateDisplay.appendChild(separator);
    }
    const span = document.createElement("span");
    span.className = "date-digit";
    span.textContent = enteredCode[i] || "•";
    if (i >= enteredCode.length) span.style.opacity = ".25";
    dateDisplay.appendChild(span);
  }
}
async function verifyDate() {
  if (busy) return;
  if (enteredCode.length !== 8) {
    dateStatus.textContent = "Enter the full date, special one ♡";
    return;
  }
  busy = true;
  dateStatus.textContent = "checking our little secret… ✨";
  try {
    const response = await fetch("/api/verify-date", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: enteredCode })
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      dateStatus.textContent = result.message || "Not quite—try again 💌";
      dateDisplay.animate([{transform:"translateX(-4px)"},{transform:"translateX(4px)"},{transform:"translateX(0)"}],{duration:260});
      enteredCode = "";
      renderCode();
    } else {
      dateStatus.textContent = "";
      showScreen("birthday-screen");
      burstHearts();
    }
  } catch {
    dateStatus.textContent = "Can't reach the surprise server. Make sure it is running 🤎";
  } finally { busy = false; }
}
document.getElementById("start-button").addEventListener("click", () => {
  const button = document.getElementById("start-button");
  button.animate([{transform:"scale(1)"},{transform:"scale(1.06) rotate(-1deg)"},{transform:"scale(.96)"},{transform:"scale(1)"}],{duration:500,easing:"ease-out"});
  setTimeout(() => showScreen("date-screen"), 260);
});
document.querySelectorAll("[data-back]").forEach(button => {
  button.addEventListener("click", () => showScreen(button.dataset.back));
});
document.querySelectorAll("[data-key]").forEach(button => button.addEventListener("click", () => {
  const key = button.dataset.key;
  dateStatus.textContent = "";
  if (key === "clear") enteredCode = enteredCode.slice(0, -1);
  else if (key === "submit") { verifyDate(); return; }
  else if (enteredCode.length < 8) enteredCode += key;
  renderCode();
  if (enteredCode.length === 8) dateStatus.textContent = "Tap the heart to unlock ♡";
}));
document.addEventListener("keydown", event => {
  if (!document.getElementById("date-screen").classList.contains("active")) return;
  if (/^\d$/.test(event.key) && enteredCode.length < 8) { enteredCode += event.key; renderCode(); }
  else if (event.key === "Backspace") { enteredCode = enteredCode.slice(0,-1); renderCode(); }
  else if (event.key === "Enter") verifyDate();
});
const photoGrid = document.querySelector(".photo-grid");
const photoTrack = document.querySelector(".photo-track");
const photoCards = [...photoTrack.querySelectorAll(".photo-card")];
const carouselStatus = document.getElementById("carousel-status");
let carouselIndex = 0;
let carouselRotation = 0;
let dragStartX = 0;
let dragStartRotation = 0;
let activePointerId = null;
let hasDragged = false;
let suppressPhotoClickUntil = 0;

function updatePhotoCarousel() {
  const angle = 360 / photoCards.length;
  const radius = Math.min(340, Math.max(125, photoGrid.clientWidth * 0.48));
  carouselRotation = -carouselIndex * angle;
  photoTrack.style.transform = `translateZ(-${radius}px) rotateY(${carouselRotation}deg)`;
  photoCards.forEach((card, index) => {
    const isActive = index === carouselIndex;
    card.style.transform = `rotateY(${index * angle}deg) translateZ(${radius}px)`;
    card.style.opacity = isActive ? "1" : "0.68";
    card.style.filter = isActive ? "none" : "saturate(.8)";
    card.classList.toggle("is-active", isActive);
    card.setAttribute("role", "group");
    card.setAttribute("aria-roledescription", "slide");
    card.setAttribute("aria-hidden", String(!isActive));
    card.setAttribute("aria-label", `Photo ${index + 1} of ${photoCards.length}`);
    card.querySelector("img").tabIndex = isActive ? 0 : -1;
  });
  carouselStatus.textContent = `${String(carouselIndex + 1).padStart(2, "0")} / ${String(photoCards.length).padStart(2, "0")}`;
}

function finishPhotoDrag() {
  if (activePointerId === null) return;
  activePointerId = null;
  photoGrid.classList.remove("is-dragging");
  if (hasDragged) {
    const angle = 360 / photoCards.length;
    carouselIndex = ((Math.round(-carouselRotation / angle) % photoCards.length) + photoCards.length) % photoCards.length;
    suppressPhotoClickUntil = Date.now() + 500;
  }
  hasDragged = false;
  updatePhotoCarousel();
}

function movePhotoCarousel(step) {
  carouselIndex = (carouselIndex + step + photoCards.length) % photoCards.length;
  updatePhotoCarousel();
}

photoGrid.addEventListener("pointerdown", event => {
  if (!event.isPrimary || event.button !== 0 || event.target.closest("button")) return;
  activePointerId = event.pointerId;
  dragStartX = event.clientX;
  dragStartRotation = carouselRotation;
  hasDragged = false;
});
window.addEventListener("pointermove", event => {
  if (event.pointerId !== activePointerId) return;
  const deltaX = event.clientX - dragStartX;
  if (!hasDragged && Math.abs(deltaX) < 5) return;
  hasDragged = true;
  photoGrid.classList.add("is-dragging");
  const radius = Math.min(340, Math.max(125, photoGrid.clientWidth * 0.48));
  carouselRotation = dragStartRotation + (deltaX / radius) * (180 / Math.PI);
  photoTrack.style.transform = `translateZ(-${radius}px) rotateY(${carouselRotation}deg)`;
});
window.addEventListener("pointerup", finishPhotoDrag);
window.addEventListener("pointercancel", finishPhotoDrag);

document.getElementById("photo-previous").addEventListener("click", () => movePhotoCarousel(-1));
document.getElementById("photo-next").addEventListener("click", () => movePhotoCarousel(1));
photoGrid.addEventListener("keydown", event => {
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    movePhotoCarousel(event.key === "ArrowLeft" ? -1 : 1);
  }
});
window.addEventListener("resize", updatePhotoCarousel);
updatePhotoCarousel();

document.getElementById("to-gallery").addEventListener("click", () => {
  showScreen("gallery-screen");
  requestAnimationFrame(updatePhotoCarousel);
});
document.getElementById("to-wishes").addEventListener("click", () => showScreen("wishes-screen"));
document.getElementById("to-final").addEventListener("click", () => showScreen("final-screen"));
document.getElementById("restart").addEventListener("click", () => {
  enteredCode = ""; renderCode(); dateStatus.textContent = ""; showScreen("welcome");
});

const photoLightbox = document.getElementById("photo-lightbox");
const lightboxImage = document.getElementById("lightbox-image");
const lightboxCaption = document.getElementById("lightbox-caption");
let lightboxPhotos = [];
let lightboxIndex = 0;
let lastFocusedPhoto = null;

function displayLightboxPhoto(index) {
  lightboxIndex = (index + lightboxPhotos.length) % lightboxPhotos.length;
  const image = lightboxPhotos[lightboxIndex];
  lightboxImage.src = image.currentSrc || image.src;
  lightboxImage.alt = image.alt;
  lightboxCaption.textContent = image.closest(".photo-card").querySelector("p")?.textContent || "";
  photoLightbox.querySelectorAll(".lightbox-nav").forEach(button => {
    button.hidden = lightboxPhotos.length < 2;
  });
}

photoGrid.querySelectorAll("img").forEach(image => {
  image.tabIndex = 0;
  image.setAttribute("role", "button");
  image.setAttribute("aria-label", `Open photo: ${image.alt}`);
});

photoGrid.addEventListener("click", event => {
  if (Date.now() < suppressPhotoClickUntil) {
    suppressPhotoClickUntil = 0;
    event.preventDefault();
    return;
  }
  const image = event.target.closest("img");
  if (!image || !image.naturalWidth) return;
  lightboxPhotos = [...photoGrid.querySelectorAll("img")].filter(photo => photo.naturalWidth > 0);
  lastFocusedPhoto = image;
  displayLightboxPhoto(lightboxPhotos.indexOf(image));
  photoLightbox.showModal();
});

photoGrid.addEventListener("keydown", event => {
  if ((event.key !== "Enter" && event.key !== " ") || !event.target.matches("img")) return;
  event.preventDefault();
  event.target.click();
});

photoLightbox.querySelector(".lightbox-close").addEventListener("click", () => photoLightbox.close());
photoLightbox.querySelector(".lightbox-previous").addEventListener("click", () => displayLightboxPhoto(lightboxIndex - 1));
photoLightbox.querySelector(".lightbox-next").addEventListener("click", () => displayLightboxPhoto(lightboxIndex + 1));
photoLightbox.addEventListener("click", event => {
  if (event.target === photoLightbox) photoLightbox.close();
});
photoLightbox.addEventListener("close", () => lastFocusedPhoto?.focus());
photoLightbox.addEventListener("keydown", event => {
  if (lightboxPhotos.length < 2) return;
  if (event.key === "ArrowLeft") displayLightboxPhoto(lightboxIndex - 1);
  if (event.key === "ArrowRight") displayLightboxPhoto(lightboxIndex + 1);
});

function burstHearts() {
  const symbols = ["♡","✦","✿","♥","✧"];
  for (let i = 0; i < 22; i++) {
    const el = document.createElement("span");
    el.textContent = symbols[i % symbols.length];
    Object.assign(el.style, {
      position:"fixed", left:(Math.random()*90+5)+"vw", top:"72vh",
      color:i%2 ? "#9a5961" : "#b58a67", fontSize:(14+Math.random()*18)+"px",
      zIndex:10, pointerEvents:"none", transition:"transform 1.6s ease-out,opacity 1.6s ease-out", opacity:"1"
    });
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.transform = `translate(${(Math.random()-.5)*140}px, -${180+Math.random()*300}px) rotate(${Math.random()*140-70}deg)`; el.style.opacity = "0"; });
    setTimeout(() => el.remove(), 1800);
  }
}
document.getElementById("reply-form").addEventListener("submit", async event => {
  event.preventDefault();
  const field = document.getElementById("reply-message");
  const status = document.getElementById("reply-status");
  const submit = event.currentTarget.querySelector("button[type=submit]");
  const message = field.value.trim();
  if (!message) { status.textContent = "Write a little something first 💗"; return; }
  submit.disabled = true; submit.textContent = "sending…";
  try {
    const response = await fetch("/api/reply", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({message})
    });
    const result = await response.json();
    status.textContent = result.message || (response.ok ? "Sent 💌" : "Couldn't send just now.");
    if (response.ok) field.value = "";
  } catch {
    status.textContent = "Couldn't connect. Please try again when the site is online.";
  } finally { submit.disabled = false; submit.textContent = "send ♡"; }
});
renderCode();
