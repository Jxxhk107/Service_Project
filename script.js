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

  // ---------- Analytics helpers ----------
  function trackEvent(name, params) {
    try {
      if (typeof window.gtag === "function") window.gtag("event", name, params || {});
    } catch (_e) {}
    try {
      if (typeof window.hj === "function") window.hj("event", name);
    } catch (_e) {}
  }

  // ---------- Attribution helpers ----------
  const intentEl = $("#intent");
  const ctaSourceEl = $("#ctaSource");
  const pageUrlEl = $("#pageUrl");
  const referrerEl = $("#referrer");
  const utmSourceEl = $("#utmSource");
  const utmMediumEl = $("#utmMedium");
  const utmCampaignEl = $("#utmCampaign");
  const utmContentEl = $("#utmContent");
  const utmTermEl = $("#utmTerm");
  const submittedAtEl = $("#submittedAt");

  function setAttributionFromUrl() {
    const params = new URLSearchParams(window.location.search || "");
    if (pageUrlEl) pageUrlEl.value = window.location.href;
    if (referrerEl) referrerEl.value = document.referrer || "";
    if (utmSourceEl) utmSourceEl.value = params.get("utm_source") || "";
    if (utmMediumEl) utmMediumEl.value = params.get("utm_medium") || "";
    if (utmCampaignEl) utmCampaignEl.value = params.get("utm_campaign") || "";
    if (utmContentEl) utmContentEl.value = params.get("utm_content") || "";
    if (utmTermEl) utmTermEl.value = params.get("utm_term") || "";
  }

  function inferIntentFromCta(ctaId) {
    const id = String(ctaId || "").toLowerCase();
    return id.includes("demo") ? "demo" : "poc";
  }

  function setCtaSource(ctaId) {
    if (ctaSourceEl) ctaSourceEl.value = ctaId || "";
    if (intentEl) intentEl.value = inferIntentFromCta(ctaId);
  }

  setAttributionFromUrl();

  // ---------- Smooth scrolling ----------
  // Uses [data-scroll] to avoid hijacking all anchor links globally.
  $$("#main a[data-scroll], header a[data-scroll], footer a[data-scroll]").forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href") || "";
      if (!href.startsWith("#")) return;
      e.preventDefault();

      // CTA click tracking (hero/header/footer buttons with data-cta)
      const ctaId = a.getAttribute("data-cta");
      if (ctaId) {
        setCtaSource(ctaId);
        trackEvent("cta_click", { event_category: "engagement", cta_id: ctaId, link_url: href });
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

  // ---------- Form validation + submission ----------
  const form = $("#pocForm");
  const successBox = $("#formSuccess");
  const errorBox = $("#formError");
  const submitBtn = $("#submitBtn");
  const honeypot = $("#website");

  function setFieldError(inputEl, message) {
    const field = inputEl.closest(".field");
    if (!field) return;
    const errorEl = $(".field-error", field);
    field.classList.toggle("is-invalid", Boolean(message));
    if (errorEl) errorEl.textContent = message || "";
  }

  function clearAllErrors() {
    if (!form) return;
    $$("input, textarea", form).forEach((input) => setFieldError(input, ""));
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
    const contactName = $("#contactName");
    const portfolio = $("#portfolioSize");
    const delinquency = $("#delinquencyRate");
    const email = $("#contactEmail");
    const notes = $("#notes");

    if (institution) {
      const v = institution.value.trim();
      if (v.length < 2) {
        setFieldError(institution, "Please enter your institution name.");
        ok = false;
      } else setFieldError(institution, "");
    }

    if (contactName) {
      // Optional
      setFieldError(contactName, "");
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

    if (notes) {
      // Optional
      setFieldError(notes, "");
    }

    return ok;
  }

  // ---------- Borrower UI preview (hotspots + view tracking) ----------
  const uiPreview = $("#ui-preview");
  if (uiPreview) {
    const hotspots = $$("[data-ui-hotspot]", uiPreview);
    const cards = $$("[data-ui-card]", uiPreview);

    function setActive(key) {
      hotspots.forEach((h) => h.classList.toggle("is-active", h.getAttribute("data-ui-hotspot") === key));
      cards.forEach((c) => c.classList.toggle("is-active", c.getAttribute("data-ui-card") === key));
    }

    hotspots.forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-ui-hotspot");
        if (!key) return;
        setActive(key);
        trackEvent("ui_preview_hotspot_click", { event_category: "engagement", hotspot: key });
      });
    });

    // Track when this section is seen (once)
    let viewed = false;
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) return;
          if (entry.isIntersecting && !viewed) {
            viewed = true;
            trackEvent("ui_preview_viewed", { event_category: "engagement" });
            io.disconnect();
          }
        },
        { threshold: 0.35 }
      );
      io.observe(uiPreview);
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

  function showError(message) {
    if (!errorBox) return;
    const text = $(".error-text", errorBox);
    if (text && message) text.textContent = message;
    errorBox.hidden = false;
  }

  function hideError() {
    if (!errorBox) return;
    errorBox.hidden = true;
  }

  function setSubmitting(isSubmitting) {
    if (!submitBtn) return;
    submitBtn.disabled = Boolean(isSubmitting);
    const defaultText = submitBtn.getAttribute("data-default-text") || "Submit";
    submitBtn.textContent = isSubmitting ? "Submitting..." : defaultText;
  }

  async function submitToFormspree(payload, endpoint) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    let data = null;
    try {
      data = await res.json();
    } catch (_e) {}

    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || "Network error. Please try again.";
      throw new Error(msg);
    }

    return data;
  }

  if (form) {
    // If user lands directly without clicking a CTA, keep the default intent as PoC.
    if (intentEl && !intentEl.value) intentEl.value = "poc";

    // Track "form started" once
    let started = false;
    const startOnce = () => {
      if (started) return;
      started = true;
      trackEvent("poc_form_started", { event_category: "engagement" });
    };

    // Live validation: clear error as user types
    $$("input, textarea", form).forEach((input) => {
      input.addEventListener("input", () => {
        hideSuccess();
        hideError();
        startOnce();
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
        } else {
          setFieldError(input, "");
        }
      });
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideSuccess();
      hideError();

      clearAllErrors();
      const ok = validate();
      if (!ok) {
        // Focus first invalid field for better conversion UX
        const firstInvalid = $(".field.is-invalid input, .field.is-invalid textarea", form);
        if (firstInvalid) firstInvalid.focus();
        trackEvent("poc_form_submit_failed", { event_category: "engagement", reason: "validation" });
        return;
      }

      // Honeypot filled => treat as spam, pretend success without sending
      if (honeypot && honeypot.value.trim()) {
        showSuccess();
        form.reset();
        setAttributionFromUrl();
        return;
      }

      // Fill timestamp just-in-time
      if (submittedAtEl) submittedAtEl.value = new Date().toISOString();
      if (pageUrlEl && !pageUrlEl.value) pageUrlEl.value = window.location.href;
      if (referrerEl && !referrerEl.value) referrerEl.value = document.referrer || "";

      const fd = new FormData(form);
      const payload = {};
      fd.forEach((value, key) => {
        payload[key] = String(value);
      });
      if (!payload.intent) payload.intent = "poc";

      setSubmitting(true);
      try {
        const endpoint = form.getAttribute("action") || "https://formspree.io/f/mlgpnvgk";
        await submitToFormspree(payload, endpoint);

        trackEvent("poc_form_submitted", {
          event_category: "engagement",
          intent: payload.intent,
          cta_source: payload.cta_source || "",
        });

        showSuccess();
        form.reset();
        setAttributionFromUrl(); // restore url/referrer/utm after reset
      } catch (err) {
        trackEvent("poc_form_submit_failed", { event_category: "engagement", reason: "network" });
        showError((err && err.message) || "Submission failed. Please try again.");
      } finally {
        setSubmitting(false);
      }
    });
  }
})();

