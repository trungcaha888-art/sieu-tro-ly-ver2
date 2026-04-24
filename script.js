const WEBINAR_TIME = new Date("2026-04-28T19:45:00+07:00").getTime();
const ZALO_GROUP_URL = "https://zalo.me/g/sfajnp742";
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzpK07teW-jeXVfUtUpgAGgEOkgWh-8DLGZeu_ydlnwNN094XiVQOqS0h31SFzqoqMa/exec";

const countdownEls = {
  days: document.querySelector("[data-days]"),
  hours: document.querySelector("[data-hours]"),
  minutes: document.querySelector("[data-minutes]"),
  seconds: document.querySelector("[data-seconds]")
};

function pad(value) {
  return String(Math.max(0, value)).padStart(2, "0");
}

function updateCountdown() {
  const diff = Math.max(0, WEBINAR_TIME - Date.now());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  countdownEls.days.textContent = pad(days);
  countdownEls.hours.textContent = pad(hours);
  countdownEls.minutes.textContent = pad(minutes);
  countdownEls.seconds.textContent = pad(seconds);
}

updateCountdown();
setInterval(updateCountdown, 1000);

const seatEl = document.querySelector("[data-seat-count]");
const storedSeats = localStorage.getItem("ai_webinar_seats");
let seatCount = storedSeats ? Number(storedSeats) : 137;

function updateSeats() {
  if (!seatEl) return;
  const shouldDecrease = Math.random() > 0.72 && seatCount > 43;
  if (shouldDecrease) {
    seatCount -= 1;
    localStorage.setItem("ai_webinar_seats", String(seatCount));
  }
  seatEl.textContent = String(seatCount);
}

if (seatEl) {
  updateSeats();
  setInterval(updateSeats, 22000);
}

const reveals = document.querySelectorAll(".reveal");
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.18 });

reveals.forEach((el) => revealObserver.observe(el));

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (event) => {
    const target = document.querySelector(anchor.getAttribute("href"));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

const stickyCta = document.querySelector("[data-sticky-cta]");
const signupCard = document.querySelector("#dang-ky");

function updateStickyCta() {
  stickyCta.classList.toggle("is-visible", window.scrollY > 520);
}

const formObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    stickyCta.classList.toggle("is-hidden", entry.isIntersecting);
  });
}, { threshold: 0.35 });

if (signupCard) formObserver.observe(signupCard);
window.addEventListener("scroll", updateStickyCta, { passive: true });
updateStickyCta();

const formModal = document.querySelector("[data-form-modal]");
const formModalCloseButtons = document.querySelectorAll("[data-form-modal-close]");

function openFormModal() {
  formModal.hidden = false;
  document.body.classList.add("modal-open");
  const firstInput = formModal.querySelector("input");
  if (firstInput) {
    setTimeout(() => firstInput.focus(), 80);
  }
}

function closeFormModal() {
  formModal.hidden = true;
  document.body.classList.remove("modal-open");
}

document.querySelectorAll("[data-open-lead-modal]").forEach((trigger) => {
  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    openFormModal();
  });
});

formModalCloseButtons.forEach((button) => {
  button.addEventListener("click", closeFormModal);
});

formModal.addEventListener("click", (event) => {
  if (event.target === formModal) closeFormModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!formModal.hidden) closeFormModal();
});



function getUtmPayload() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") || "",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || "",
    utm_content: params.get("utm_content") || "",
    utm_term: params.get("utm_term") || "",
    fbclid: params.get("fbclid") || "",
    page_url: window.location.href
  };
}

function saveLeadLocally(payload) {
  localStorage.setItem("ai_webinar_lead", JSON.stringify({
    ...payload,
    saved_at: new Date().toISOString()
  }));
}

function submitToGoogleSheet(payload) {
  return new Promise((resolve) => {
    const iframeName = `lead-frame-${Date.now()}`;
    const iframe = document.createElement("iframe");
    iframe.name = iframeName;
    iframe.hidden = true;

    const form = document.createElement("form");
    form.method = "POST";
    form.action = GOOGLE_SCRIPT_URL;
    form.target = iframeName;
    form.hidden = true;

    Object.entries(payload).forEach(([key, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });

    document.body.append(iframe, form);
    form.submit();

    setTimeout(() => {
      iframe.remove();
      form.remove();
      resolve();
    }, 1200);
  });
}

document.querySelectorAll("[data-lead-form]").forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const button = form.querySelector("button[type='submit']");
    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      timestamp: new Date().toLocaleString("vi-VN"),
      source: "landing-webinar-ai",
      ...getUtmPayload()
    };

    if (!payload.name || !payload.email || !payload.phone) return;

    saveLeadLocally(payload);

    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = "Đang giữ chỗ...";

    try {
      await submitToGoogleSheet(payload);

      // Fire Lead pixel event with unique ID for dedup
      const leadId = "lead_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
      if (window.fbq) window.fbq("track", "Lead", {}, { eventID: leadId });

      // Redirect to thank-you page
      window.location.href = "thanks.html?lead_id=" + encodeURIComponent(leadId);
    } catch (err) {
      button.disabled = false;
      button.textContent = oldText;
      // Fallback: redirect anyway
      window.location.href = "thanks.html";
    }
  });
});

document.querySelectorAll(`a[href="${ZALO_GROUP_URL}"]`).forEach((link) => {
  link.addEventListener("click", () => {
    if (window.fbq) window.fbq("trackCustom", "JoinZaloGroup");
  });
});
