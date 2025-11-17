// ---------- DARK / LIGHT THEME TOGGLE ----------

const body = document.body;
const desktopToggle = document.getElementById("theme-toggle");
const mobileToggle = document.getElementById("theme-toggle-mobile");

function updateThemeIcons() {
  const isDark = body.classList.contains("dark-mode");

  if (desktopToggle) {
    desktopToggle.textContent = isDark ? "☀️" : "🌙";
    desktopToggle.setAttribute(
      "aria-label",
      isDark ? "Switch to light mode" : "Switch to dark mode"
    );
  }

  if (mobileToggle) {
    mobileToggle.textContent = isDark ? "☀️" : "🌙";
    mobileToggle.setAttribute(
      "aria-label",
      isDark ? "Switch to light mode" : "Switch to dark mode"
    );
  }
}

function setThemeFromStorage() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    body.classList.add("dark-mode");
  } else if (savedTheme === "light") {
    body.classList.remove("dark-mode");
  }
  updateThemeIcons();
}

function toggleTheme() {
  body.classList.toggle("dark-mode");
  const isDark = body.classList.contains("dark-mode");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  updateThemeIcons();
}

// Init
setThemeFromStorage();

// Attach listeners for BOTH buttons
if (desktopToggle) {
  desktopToggle.addEventListener("click", toggleTheme);
}
if (mobileToggle) {
  mobileToggle.addEventListener("click", toggleTheme);
}

// ---------- HAMBURGER MENU ----------

function toggleMenu() {
  const menuLinks = document.querySelector(".menu-links");
  const hamburgerIcon = document.querySelector(".hamburger-icon");
  
  menuLinks.classList.toggle("open");
  hamburgerIcon.classList.toggle("open");
}

// make toggleMenu available to inline onclick in HTML
window.toggleMenu = toggleMenu;

