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

  /* ---------- Fade-ins ----------
     <el data-fade>                      fades in when it scrolls into view
     data-fade-delay="0.9" (seconds)     timed from page load, like the Wix intro.
                                         Scrolling to it later doesn't add the wait again.
     data-fade-dur="3.1" (seconds)       default 1.2s (1s for data-fade="soft")
     data-fade="soft"                    a gentle fade for ordinary content; several
                                         appearing together are staggered slightly.
     After the first page of a visit, the intro runs a bit faster (html.intro-seen). */
  window.fadeReady = true;
  var root = document.documentElement;
  var fadeStart = Date.now();
  var fadeObserver = "IntersectionObserver" in window
    ? new IntersectionObserver(function (entries) {
        var n = 0;
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          startFade(e.target, n);
          if (e.target.getAttribute("data-fade") === "soft") n++;
          fadeObserver.unobserve(e.target);
        });
      }, { rootMargin: "0px 0px -40px 0px" })
    : null;
  function startFade(el, n) {
    var pace = root.classList.contains("intro-seen") ? 0.6 : 1;
    var delay = parseFloat(el.getAttribute("data-fade-delay")) || 0;
    var dur = parseFloat(el.getAttribute("data-fade-dur"));
    delay = Math.max(0, delay * pace - (Date.now() - fadeStart) / 1000);
    if (el.getAttribute("data-fade") === "soft") delay += Math.min(n, 5) * 0.12;
    el.style.setProperty("--fade-delay", delay.toFixed(2) + "s");
    if (dur) el.style.setProperty("--fade-dur", dur + "s");
    el.classList.add("is-in");
  }
  // Once an element has faded in, make it a normal element again, so the
  // fade can't restart (e.g. when the mobile menu is shown/hidden).
  function finishFade(el) {
    el.removeAttribute("data-fade");
    el.classList.remove("is-in");
  }
  function initFades(scope) {
    scope.querySelectorAll("[data-fade]").forEach(function (el) {
      if (root.classList.contains("intro-seen") && el.closest(".site-header")) { finishFade(el); return; }
      el.addEventListener("animationend", function (ev) {
        if (ev.target === el && ev.animationName === "fade-in") finishFade(el);
      });
      if (fadeObserver) fadeObserver.observe(el); else startFade(el, 0);
    });
  }
  if (toggle && nav) toggle.addEventListener("click", function () { finishFade(nav); });

  /* ---------- Scroll parallax (as on the Wix site) ----------
     data-parallax="0.5"      the element drifts a little slower than the page
     data-bg-parallax="0.47"  the image pans slowly inside its frame (needs object-fit: cover) */
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var parallaxEls = [], parallaxQueued = false;
  function initParallax(scope) {
    if (reduceMotion) return;
    parallaxEls = parallaxEls.filter(function (el) { return document.body.contains(el); });
    scope.querySelectorAll("[data-parallax], [data-bg-parallax]").forEach(function (el) { parallaxEls.push(el); });
    updateParallax();
  }
  function queueParallax() {
    if (parallaxQueued || !parallaxEls.length) return;
    parallaxQueued = true;
    requestAnimationFrame(function () { parallaxQueued = false; updateParallax(); });
  }
  function updateParallax() {
    var vh = window.innerHeight;
    var narrow = window.innerWidth <= 800;
    parallaxEls.forEach(function (el) {
      var r, speed;
      if (el.hasAttribute("data-parallax")) {
        speed = (parseFloat(el.getAttribute("data-parallax")) || 0.5) * (narrow ? 0.5 : 1);
        r = el.getBoundingClientRect();
        var top = r.top - (el._py || 0);              // where it would be without the shift
        if (top > vh + 200 || top + r.height < -200) return;
        var fromCentre = top + r.height / 2 - vh / 2;
        var y = Math.max(-80, Math.min(80, -fromCentre * speed * 0.2));
        el._py = y;
        el.style.translate = "0 " + y.toFixed(1) + "px";
      } else {
        speed = parseFloat(el.getAttribute("data-bg-parallax")) || 0.5;
        r = (el.closest("section") || el).getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        var progress = (vh - r.top) / (vh + r.height);  // 0 → 1 while it scrolls past
        var img = el.tagName === "IMG" ? el : el.querySelector("img");
        if (img) img.style.objectPosition = "50% " + (50 + (progress - 0.5) * speed * 100).toFixed(1) + "%";
      }
    });
  }
  window.addEventListener("scroll", queueParallax, { passive: true });
  window.addEventListener("resize", queueParallax);
  window.addEventListener("load", queueParallax);

  /* ---------- Photo walls: widen one or two photos so the last row is full ---------- */
  var walls = [];
  function balanceWall(wall) {
    var imgs = wall.querySelectorAll("img");
    imgs.forEach(function (img) { img.classList.remove("span-2", "span-2x2", "span-solo"); });
    var cols = getComputedStyle(wall).gridTemplateColumns.split(" ").filter(Boolean).length;
    var n = imgs.length;
    var missing = (cols - n % cols) % cols;           // empty cells on the last row
    if (cols < 2 || n < 2 || !missing) return;
    if (missing === 3 && cols >= 4) {                   // one big photo (2 columns x 2 rows) fills 3 cells
      imgs[0].classList.add("span-2x2");
      return;
    }
    for (var k = 0; k < missing; k++) {                 // otherwise 1-2 wide photos, spread out
      var img = imgs[Math.floor((k + 0.5) * n / missing)];
      img.classList.add("span-2");
      if (cols === 2) img.classList.add("span-solo");
    }
  }
  var wallQueued = false;
  window.addEventListener("resize", function () {
    if (wallQueued) return;
    wallQueued = true;
    requestAnimationFrame(function () {
      wallQueued = false;
      walls = walls.filter(function (w) { return document.body.contains(w); });
      walls.forEach(balanceWall);
    });
  });

  /* ---------- Autoplay ----------
     Page sound: browsers only allow sound after the visitor has interacted with
     the site, so if it's blocked it starts on their first click / tap / key press.
     If they pause it, it stays off for the rest of the visit. */
  function autoplayPageAudio(scope) {
    var box = scope.querySelector("[data-page-audio]");
    if (!box || !box.playAudio || store.get("audio-paused") === "1") return;
    box.playAudio().catch(function () {
      var events = ["click", "keydown", "touchend"];
      function off() { events.forEach(function (t) { document.removeEventListener(t, onFirst, true); }); }
      function onFirst(e) {
        off();
        // Their own play button / a link / a video handles itself
        if (e.target.closest && e.target.closest(".pa-btn, .ambient-btn, a[href], video")) return;
        if (store.get("audio-paused") === "1" || !document.body.contains(box)) return;
        if (box.querySelector("audio").paused) box.playAudio();
      }
      events.forEach(function (t) { document.addEventListener(t, onFirst, true); });
    });
  }
  var videoObserver = "IntersectionObserver" in window
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var v = e.target;
          if (e.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
          else if (!v.paused) v.pause();
        });
      }, { threshold: 0.5 })
    : null;

  /* ---------- Per-page setup (runs on load and after each in-site page swap) ---------- */
  function initPage(root) {
    initFades(root);
    initParallax(root);

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

    // Photo walls: never leave one photo alone on the last row
    root.querySelectorAll(".photo-wall").forEach(function (wall) {
      balanceWall(wall);
      walls.push(wall);
    });

    // Inline page audio (the Wix-style play button + progress line)
    root.querySelectorAll("[data-page-audio]").forEach(function (box) {
      var audio = box.querySelector("audio");
      var btn = box.querySelector(".pa-btn");
      var track = box.querySelector(".pa-track");
      var fill = box.querySelector(".pa-fill");
      function ui(on) {
        box.classList.toggle("is-playing", on);
        btn.setAttribute("aria-pressed", String(on));
        btn.setAttribute("aria-label", on ? "Pause sound" : "Play sound");
      }
      function play() {
        document.querySelectorAll("audio").forEach(function (a) { if (a !== audio) a.pause(); });
        document.querySelectorAll("video").forEach(function (v) { v.muted = true; });
        ambient.pause();
        var p = audio.play();
        if (p && p.catch) p.catch(function () { ui(false); });
        return p && p.then ? p : Promise.resolve();
      }
      box.playAudio = play;
      btn.addEventListener("click", function () {
        // Remember the visitor's choice, so a paused sound doesn't autoplay on later pages
        if (audio.paused) { store.set("audio-paused", "0"); play(); }
        else { store.set("audio-paused", "1"); audio.pause(); }
      });
      audio.addEventListener("play", function () { ui(true); });
      audio.addEventListener("pause", function () { ui(false); });
      audio.addEventListener("ended", function () { ui(false); });
      audio.addEventListener("timeupdate", function () {
        if (audio.duration) fill.style.width = (audio.currentTime / audio.duration * 100) + "%";
      });
      track.addEventListener("click", function (e) {
        var r = track.getBoundingClientRect();
        if (audio.duration) audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration;
      });
    });
    autoplayPageAudio(root);

    // Videos: play muted while on screen, pause when scrolled away.
    // The controls stay, so visitors can turn the sound on.
    root.querySelectorAll("video[data-autoplay]").forEach(function (v) {
      v.muted = true;
      v.addEventListener("volumechange", function () {
        if (v.muted) return;  // sound turned on: stop the page sound so they don't clash
        document.querySelectorAll("audio").forEach(function (a) { a.pause(); });
        ambient.pause();
      });
      if (videoObserver && !reduceMotion) videoObserver.observe(v);
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
      document.querySelectorAll("[data-page-audio] audio").forEach(function (a) { a.pause(); });
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
        // Same out-in fade as normal page changes (see style.css), where supported
        if (document.startViewTransition && !reduceMotion) {
          document.startViewTransition(function () { swapPage(doc, next, url, push); });
        } else {
          swapPage(doc, next, url, push);
        }
      })
      .catch(function () { location.href = url; });
  }
  function swapPage(doc, next, url, push) {
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
        document.documentElement.classList.add("intro-seen");
        fadeStart = Date.now();
        initPage(main);
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
