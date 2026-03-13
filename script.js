/* =========================================================
   PriorityAI Landing Page (MVP)
   - Single-file Vanilla JS (no external deps)
   - Smooth scrolling
   - Mobile nav
   - PoC form validation + success message
   ========================================================= */

(() => {
  "use strict";

  // ---------- Utilities ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function getHeaderOffset() {
    const header = $(".site-header");
    if (!header) return 0;
    return header.getBoundingClientRect().height;
  }

  function scrollToHash(hash) {
    if (!hash || hash === "#") return;
    const target = document.getElementById(hash.slice(1));
    if (!target) return;

    const offset = getHeaderOffset() + 14; // small breathing space
    const top = window.scrollY + target.getBoundingClientRect().top - offset;

    const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top, behavior: prefersReduced ? "auto" : "smooth" });
  }

  // ---------- Footer year ----------
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // ---------- Smooth scrolling ----------
  // Uses [data-scroll] to avoid hijacking all anchor links globally.
  $$("#main a[data-scroll], header a[data-scroll], footer a[data-scroll]").forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href") || "";
      if (!href.startsWith("#")) return;
      e.preventDefault();

      // CTA click tracking (hero/header/footer buttons with data-cta)
      const ctaId = a.getAttribute("data-cta");
      if (ctaId && typeof window.gtag === "function") {
        window.gtag("event", "cta_click", {
          event_category: "engagement",
          cta_id: ctaId,
          link_url: href,
        });
      }

      scrollToHash(href);

      // Close mobile menu if open
      closeMobileMenu();
    });
  });

  // Also enable smooth scroll for nav links (which don't have data-scroll)
  $$(".nav-link").forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href") || "";
      if (!href.startsWith("#")) return;
      e.preventDefault();
      scrollToHash(href);
      closeMobileMenu();
    });
  });

  // ---------- Mobile navigation ----------
  const navToggle = $(".nav-toggle");
  const navLinks = $("#nav-links");

  function openMobileMenu() {
    if (!navToggle || !navLinks) return;
    navLinks.classList.add("is-open");
    navToggle.setAttribute("aria-expanded", "true");
  }

  function closeMobileMenu() {
    if (!navToggle || !navLinks) return;
    navLinks.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  }

  function toggleMobileMenu() {
    if (!navToggle || !navLinks) return;
    const isOpen = navLinks.classList.contains("is-open");
    if (isOpen) closeMobileMenu();
    else openMobileMenu();
  }

  if (navToggle) {
    navToggle.addEventListener("click", toggleMobileMenu);
  }

  // Close menu on outside click
  document.addEventListener("click", (e) => {
    if (!navLinks || !navToggle) return;
    const isOpen = navLinks.classList.contains("is-open");
    if (!isOpen) return;

    const target = e.target;
    const clickedInside = navLinks.contains(target) || navToggle.contains(target);
    if (!clickedInside) closeMobileMenu();
  });

  // Close menu on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeMobileMenu();
  });

  // ---------- Form validation ----------
  const form = $("#pocForm");
  const successBox = $("#formSuccess");

  function setFieldError(inputEl, message) {
    const field = inputEl.closest(".field");
    if (!field) return;
    const errorEl = $(".field-error", field);
    field.classList.toggle("is-invalid", Boolean(message));
    if (errorEl) errorEl.textContent = message || "";
  }

  function clearAllErrors() {
    if (!form) return;
    $$("input", form).forEach((input) => setFieldError(input, ""));
  }

  function normalizeNumberLike(text) {
    return String(text || "").trim().replace(/,/g, "");
  }

  function isValidPortfolioSize(value) {
    // Accept:
    // - raw numbers: 250000000
    // - numbers with commas: 250,000,000
    // - shorthand: 250M / 2.5B / 800k
    const v = String(value || "").trim();
    if (!v) return false;

    const compact = v.replace(/\s+/g, "");
    if (/^\d+(\.\d+)?[kKmMbB]$/.test(compact)) return true;

    const num = Number(normalizeNumberLike(v));
    return Number.isFinite(num) && num > 0;
  }

  function isValidDelinquencyRate(value) {
    // Accept: "2.4%", "2.4", "0.8%"
    const v = String(value || "").trim();
    if (!v) return false;

    const compact = v.replace(/\s+/g, "");
    const m = compact.match(/^(\d+(\.\d+)?)(%)?$/);
    if (!m) return false;

    const num = Number(m[1]);
    return Number.isFinite(num) && num >= 0 && num <= 100;
  }

  function isValidEmail(value) {
    // Basic email sanity check (no external libs)
    const v = String(value || "").trim();
    if (!v) return false;
    if (v.length > 254) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  }

  function validate() {
    if (!form) return false;
    let ok = true;

    const institution = $("#institutionName");
    const portfolio = $("#portfolioSize");
    const delinquency = $("#delinquencyRate");
    const email = $("#contactEmail");

    if (institution) {
      const v = institution.value.trim();
      if (v.length < 2) {
        setFieldError(institution, "Please enter your institution name.");
        ok = false;
      } else setFieldError(institution, "");
    }

    if (portfolio) {
      if (!isValidPortfolioSize(portfolio.value)) {
        setFieldError(portfolio, "Please enter a valid portfolio size (e.g., 250M or 250,000,000).");
        ok = false;
      } else setFieldError(portfolio, "");
    }

    if (delinquency) {
      if (!isValidDelinquencyRate(delinquency.value)) {
        setFieldError(delinquency, "Please enter a valid delinquency rate between 0 and 100 (e.g., 2.4%).");
        ok = false;
      } else setFieldError(delinquency, "");
    }

    if (email) {
      if (!isValidEmail(email.value)) {
        setFieldError(email, "Please enter a valid email address.");
        ok = false;
      } else setFieldError(email, "");
    }

    return ok;
  }

  function trackFormSubmitAnalytics() {
    try {
      // GA4 custom event
      if (typeof window.gtag === "function") {
        window.gtag("event", "poc_form_submitted", {
          event_category: "engagement",
          event_label: "PoC application",
        });
      }
      // Hotjar event
      if (typeof window.hj === "function") {
        window.hj("event", "poc_form_submitted");
      }
    } catch (_e) {
      // Analytics should never break UX; ignore errors silently.
    }
  }

  function showSuccess() {
    if (!successBox) return;
    successBox.hidden = false;

    // Ensure it's visible in viewport after submission on mobile.
    const offset = getHeaderOffset() + 14;
    const top = window.scrollY + successBox.getBoundingClientRect().top - offset;
    const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top, behavior: prefersReduced ? "auto" : "smooth" });
  }

  function hideSuccess() {
    if (!successBox) return;
    successBox.hidden = true;
  }

  if (form) {
    // Live validation: clear error as user types
    $$("input", form).forEach((input) => {
      input.addEventListener("input", () => {
        hideSuccess();
        // Re-validate just this field (lightweight)
        if (input.id === "contactEmail") {
          setFieldError(input, input.value.trim() && !isValidEmail(input.value) ? "Please enter a valid email address." : "");
        } else if (input.id === "delinquencyRate") {
          setFieldError(
            input,
            input.value.trim() && !isValidDelinquencyRate(input.value)
              ? "Please enter a valid delinquency rate between 0 and 100 (e.g., 2.4%)."
              : ""
          );
        } else if (input.id === "portfolioSize") {
          setFieldError(
            input,
            input.value.trim() && !isValidPortfolioSize(input.value) ? "Please enter a valid portfolio size (e.g., 250M or 250,000,000)." : ""
          );
        } else if (input.id === "institutionName") {
          setFieldError(input, input.value.trim() && input.value.trim().length < 2 ? "Please enter your institution name." : "");
        }
      });
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      hideSuccess();

      clearAllErrors();
      const ok = validate();
      if (!ok) {
        // Focus first invalid field for better conversion UX
        const firstInvalid = $(".field.is-invalid input", form);
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // MVP: no network request. Treat as successful submission.
      trackFormSubmitAnalytics();
      showSuccess();
      form.reset();
    });
  }
})();

