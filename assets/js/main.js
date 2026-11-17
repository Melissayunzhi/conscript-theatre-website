/* Conscript Theatre — small, dependency-free site script.
   - mobile menu
   - slideshow + lightbox
   - team photo hover / tap
   - showreel sound toggle
   - ambient sound that keeps playing between pages
   - contact form (only if a form endpoint is set) */
(function () {
  "use strict";

  var store = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- Mobile menu (header lives outside <main>, set up once) ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("is-open", !open);
    });
  }
  function closeMenu() {
    if (!toggle || !nav) return;
    toggle.setAttribute("aria-expanded", "false");
    nav.classList.remove("is-open");
  }
  function markCurrentNav() {
    if (!nav) return;
    var path = location.pathname.replace(/index\.html$/, "");
    nav.querySelectorAll("a").forEach(function (a) {
      var href = new URL(a.href).pathname;
      var on = href === "/" ? path === "/" : path.indexOf(href) === 0;
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
  }

  /* ---------- Lightbox ---------- */
  var lb = document.querySelector(".lightbox");
  var lbImg = lb && lb.querySelector("img");
  var lbSet = [], lbIndex = 0, lbReturn = null;
  function lbShow(i) {
    lbIndex = (i + lbSet.length) % lbSet.length;
    lbImg.src = lbSet[lbIndex].src;
    lbImg.alt = lbSet[lbIndex].alt;
  }
  function lbOpen(img) {
    var group = img.getAttribute("data-lightbox");
    lbSet = Array.prototype.slice.call(document.querySelectorAll('[data-lightbox="' + group + '"]'));
    lbReturn = img;
    lbShow(lbSet.indexOf(img));
    lb.hidden = false;
    document.body.style.overflow = "hidden";
    lb.querySelector(".lightbox-close").focus();
  }
  function lbClose() {
    lb.hidden = true;
    document.body.style.overflow = "";
    if (lbReturn) lbReturn.focus && lbReturn.focus();
  }
  if (lb) {
    lb.querySelector(".lightbox-close").addEventListener("click", lbClose);
    lb.querySelector(".lightbox-prev").addEventListener("click", function () { lbShow(lbIndex - 1); });
    lb.querySelector(".lightbox-next").addEventListener("click", function () { lbShow(lbIndex + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) lbClose(); });
    document.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") lbClose();
      if (e.key === "ArrowLeft") lbShow(lbIndex - 1);
      if (e.key === "ArrowRight") lbShow(lbIndex + 1);
    });
  }

  /* ---------- Per-page setup (runs on load and after each in-site page swap) ---------- */
  function initPage(root) {
    // Slideshows
    root.querySelectorAll("[data-slider]").forEach(function (slider) {
      var slides = slider.querySelectorAll(".slide");
      var counter = slider.querySelector("[data-current]");
      var i = 0;
      function go(n) {
        slides[i].classList.remove("is-active");
        i = (n + slides.length) % slides.length;
        slides[i].classList.add("is-active");
        if (counter) counter.textContent = i + 1;
      }
      var prev = slider.querySelector(".prev"), next = slider.querySelector(".next");
      if (prev) prev.addEventListener("click", function () { go(i - 1); });
      if (next) next.addEventListener("click", function () { go(i + 1); });
      // swipe
      var x0 = null;
      slider.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      slider.addEventListener("touchend", function (e) {
        if (x0 === null) return;
        var dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 40) go(dx < 0 ? i + 1 : i - 1);
        x0 = null;
      });
    });

    // Lightbox triggers
    if (lb) {
      root.querySelectorAll("[data-lightbox]").forEach(function (img) {
        img.setAttribute("tabindex", "0");
        img.addEventListener("click", function () { lbOpen(img); });
        img.addEventListener("keydown", function (e) { if (e.key === "Enter") lbOpen(img); });
      });
    }

    // Team photos: hover works with a mouse; on touch, tap to flip
    root.querySelectorAll(".member-photo").forEach(function (fig) {
      fig.addEventListener("click", function () { fig.classList.toggle("is-flipped"); });
      fig.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fig.classList.toggle("is-flipped"); }
      });
    });

    // Showreel: muted autoplay, with an optional sound button for video files
    var reel = root.querySelector(".showreel video");
    var reelBtn = root.querySelector(".showreel-sound");
    if (reel) {
      reel.muted = true;
      var p = reel.play();
      if (p && p.catch) p.catch(function () {});
      if (reelBtn) {
        reelBtn.hidden = false;
        reelBtn.addEventListener("click", function () {
          reel.muted = !reel.muted;
          reelBtn.textContent = reel.muted ? "sound on" : "sound off";
          reelBtn.setAttribute("aria-pressed", String(!reel.muted));
          if (!reel.muted) ambient.pause();
        });
      }
    }

    // Contact form (Formspree or similar)
    root.querySelectorAll("[data-ajax-form]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var status = form.querySelector(".form-status");
        fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
          .then(function (r) {
            status.hidden = false;
            status.textContent = r.ok ? "Thanks for submitting!" : "Something went wrong. Please email us instead.";
            if (r.ok) form.reset();
          })
          .catch(function () { status.hidden = false; status.textContent = "Something went wrong. Please email us instead."; });
      });
    });
  }

  /* ---------- Ambient sound ---------- */
  var ambient = (function () {
    var box = document.querySelector("[data-ambient]");
    if (!box) return { pause: function () {}, exists: false };
    var audio = box.querySelector("audio");
    var btn = box.querySelector(".ambient-btn");
    var label = box.querySelector(".ambient-label");
    var target = 0.6, fadeTimer = null;

    function fade(to, done) {
      clearInterval(fadeTimer);
      fadeTimer = setInterval(function () {
        var v = audio.volume + (to > audio.volume ? 0.05 : -0.05);
        if ((to > audio.volume && v >= to) || (to <= audio.volume && v <= to)) {
          audio.volume = Math.max(0, Math.min(1, to));
          clearInterval(fadeTimer);
          if (done) done();
        } else {
          audio.volume = Math.max(0, Math.min(1, v));
        }
      }, 40);
    }
    function setUI(on) {
      box.classList.toggle("is-playing", on);
      btn.setAttribute("aria-pressed", String(on));
      label.textContent = on ? "sound off" : "sound on";
    }
    function play() {
      var t = parseFloat(store.get("ambient-time") || "0");
      if (t && !audio.currentTime) { try { audio.currentTime = t; } catch (e) {} }
      audio.volume = 0;
      var p = audio.play();
      if (p && p.then) {
        p.then(function () { setUI(true); fade(target); store.set("ambient", "on"); })
         .catch(function () { setUI(false); });
      }
    }
    function pause() {
      fade(0, function () { audio.pause(); });
      setUI(false);
      store.set("ambient", "off");
    }
    btn.addEventListener("click", function () { audio.paused ? play() : pause(); });
    window.addEventListener("pagehide", function () { store.set("ambient-time", String(audio.currentTime || 0)); });
    // If they turned it on earlier in this visit, try to carry on (browsers may still block this until a click).
    if (store.get("ambient") === "on") play();
    return { pause: function () { if (!audio.paused) pause(); }, exists: true };
  })();

  /* ---------- Soft page changes so the ambient sound doesn't cut out ----------
     Only used when there is an ambient track. Swaps <main> instead of reloading. */
  function sameSitePage(a) {
    if (!a || a.target || a.hasAttribute("download")) return false;
    if (a.origin !== location.origin) return false;
    if (/\.(jpe?g|png|gif|webp|avif|svg|pdf|mp3|mp4|webm|zip)$/i.test(a.pathname)) return false;
    if (a.pathname === location.pathname && a.hash) return false;
    return true;
  }
  function loadPage(url, push) {
    return fetch(url, { headers: { Accept: "text/html" } })
      .then(function (r) {
        if (!r.ok || (r.headers.get("content-type") || "").indexOf("text/html") === -1) throw 0;
        return r.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        var next = doc.querySelector("main#content");
        if (!next) throw 0;
        var main = document.querySelector("main#content");
        main.innerHTML = next.innerHTML;
        main.setAttribute("data-page", next.getAttribute("data-page") || "");
        document.title = doc.title;
        var desc = doc.querySelector('meta[name="description"]');
        var cur = document.querySelector('meta[name="description"]');
        if (desc && cur) cur.setAttribute("content", desc.getAttribute("content"));
        if (push) history.pushState({ soft: true }, "", url);
        closeMenu();
        markCurrentNav();
        var hash = new URL(url, location.href).hash;
        var target = hash && document.getElementById(hash.slice(1));
        if (target) target.scrollIntoView(); else window.scrollTo(0, 0);
        main.setAttribute("tabindex", "-1");
        main.focus({ preventScroll: true });
        initPage(main);
      })
      .catch(function () { location.href = url; });
  }
  if (ambient.exists && window.fetch && window.DOMParser && history.pushState) {
    document.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest("a");
      if (!sameSitePage(a)) return;
      e.preventDefault();
      if (a.href === location.href) return;
      loadPage(a.href, true);
    });
    history.replaceState({ soft: true }, "", location.href);
    window.addEventListener("popstate", function () { loadPage(location.href, false); });
  }

  initPage(document);
})();
