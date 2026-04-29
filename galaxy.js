/**
 * Galaxy canvas — адап @react-bits / OGL под чистый HTML.
 * Зависимость: https://www.npmjs.com/package/ogl
 */
import { Renderer, Program, Mesh, Color, Triangle } from "https://cdn.jsdelivr.net/npm/ogl@1.0.7/+esm";

const vertexShader = `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`;

const fragmentShader = `
precision highp float;
uniform float uTime;
uniform vec3 uResolution;
uniform vec2 uFocal;
uniform vec2 uRotation;
uniform float uStarSpeed;
uniform float uDensity;
uniform float uHueShift;
uniform float uSpeed;
uniform vec2 uMouse;
uniform float uGlowIntensity;
uniform float uSaturation;
uniform bool uMouseRepulsion;
uniform float uTwinkleIntensity;
uniform float uRotationSpeed;
uniform float uRepulsionStrength;
uniform float uMouseActiveFactor;
uniform float uAutoCenterRepulsion;
uniform bool uTransparent;
varying vec2 vUv;
#define NUM_LAYER 4.0
#define STAR_COLOR_CUTOFF 0.2
#define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071)
#define PERIOD 3.0
float Hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float tri(float x) { return abs(fract(x) * 2.0 - 1.0); }
float tris(float x) {
  float t = fract(x);
  return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0));
}
float trisn(float x) {
  float t = fract(x);
  return 2.0 * (1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0))) - 1.0;
}
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
float Star(vec2 uv, float flare) {
  float d = length(uv);
  float m = (0.05 * uGlowIntensity) / d;
  float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * flare * uGlowIntensity;
  uv *= MAT45;
  rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * 0.3 * flare * uGlowIntensity;
  m *= smoothstep(1.0, 0.2, d);
  return m;
}
vec3 StarLayer(vec2 uv) {
  vec3 col = vec3(0.0);
  vec2 gv = fract(uv) - 0.5;
  vec2 id = floor(uv);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y));
      vec2 si = id + vec2(float(x), float(y));
      float seed = Hash21(si);
      float size = fract(seed * 345.32);
      float glossLocal = tri(uStarSpeed / (PERIOD * seed + 1.0));
      float flareSize = smoothstep(0.9, 1.0, size) * glossLocal;
      float red = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 1.0)) + STAR_COLOR_CUTOFF;
      float blu = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 3.0)) + STAR_COLOR_CUTOFF;
      float grn = min(red, blu) * seed;
      vec3 base = vec3(red, grn, blu);
      float hue = atan(base.g - base.r, base.b - base.r) / (2.0 * 3.14159) + 0.5;
      hue = fract(hue + uHueShift / 360.0);
      float sat = length(base - vec3(dot(base, vec3(0.299, 0.587, 0.114)))) * uSaturation;
      float val = max(max(base.r, base.g), base.b);
      base = hsv2rgb(vec3(hue, sat, val));
      vec2 pad = vec2(tris(seed * 34.0 + uTime * uSpeed / 10.0), tris(seed * 38.0 + uTime * uSpeed / 30.0)) - 0.5;
      float star = Star(gv - offset - pad, flareSize);
      vec3 color = base;
      float twinkle = trisn(uTime * uSpeed + seed * 6.2831) * 0.5 + 1.0;
      twinkle = mix(1.0, twinkle, uTwinkleIntensity);
      star *= twinkle;
      col += star * size * color;
    }
  }
  return col;
}
void main() {
  vec2 focalPx = uFocal * uResolution.xy;
  vec2 uv = (vUv * uResolution.xy - focalPx) / uResolution.y;
  vec2 mouseNorm = uMouse - vec2(0.5);
  if (uAutoCenterRepulsion > 0.0) {
    vec2 centerUV = vec2(0.0, 0.0);
    float centerDist = length(uv - centerUV);
    vec2 repulsion = normalize(uv - centerUV) * (uAutoCenterRepulsion / (centerDist + 0.1));
    uv += repulsion * 0.05;
  } else if (uMouseRepulsion) {
    vec2 mousePosUV = (uMouse * uResolution.xy - focalPx) / uResolution.y;
    float mouseDist = length(uv - mousePosUV);
    vec2 repulsion = normalize(uv - mousePosUV) * (uRepulsionStrength / (mouseDist + 0.1));
    uv += repulsion * 0.05 * uMouseActiveFactor;
  } else {
    vec2 mouseOffset = mouseNorm * 0.1 * uMouseActiveFactor;
    uv += mouseOffset;
  }
  float autoRotAngle = uTime * uRotationSpeed;
  mat2 autoRot = mat2(cos(autoRotAngle), -sin(autoRotAngle), sin(autoRotAngle), cos(autoRotAngle));
  uv = autoRot * uv;
  uv = mat2(uRotation.x, -uRotation.y, uRotation.y, uRotation.x) * uv;
  vec3 col = vec3(0.0);
  for (float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYER) {
    float depth = fract(i + uStarSpeed * uSpeed);
    float scale = mix(20.0 * uDensity, 0.5 * uDensity, depth);
    float fade = depth * smoothstep(1.0, 0.9, depth);
    col += StarLayer(uv * scale + i * 453.32) * fade;
  }
  if (uTransparent) {
    float alpha = length(col);
    alpha = smoothstep(0.0, 0.3, alpha);
    alpha = min(alpha, 1.0);
    gl_FragColor = vec4(col, alpha);
  } else {
    gl_FragColor = vec4(col, 1.0);
  }
}
`;

/**
 * @param {HTMLElement} container
 * @param {object} [props]
 */
export function initGalaxy(container, props = {}) {
  if (!container) return () => {};

  const {
    focal = [0.5, 0.5],
    rotation = [1.0, 0.0],
    starSpeed = 0.4,
    density = 1,
    hueShift = 160,
    disableAnimation = false,
    speed = 0.5,
    mouseInteraction = true,
    glowIntensity = 0.45,
    saturation = 0.12,
    mouseRepulsion = true,
    repulsionStrength = 2,
    twinkleIntensity = 0.28,
    rotationSpeed = 0.1,
    autoCenterRepulsion = 0,
    transparent = true,
  } = props;

  const prefersReduce =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const renderer = new Renderer({
    alpha: transparent,
    premultipliedAlpha: false,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
  });
  const gl = renderer.gl;
  if (transparent) {
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
  } else {
    gl.clearColor(0, 0, 0, 1);
  }

  const targetMousePos = { x: 0.5, y: 0.5 };
  const smoothMousePos = { x: 0.5, y: 0.5 };
  const targetMouseActive = { value: 0.0 };
  const smoothMouseActive = { value: 0.0 };

  const geometry = new Triangle(gl);
  const program = new Program(gl, {
    vertex: vertexShader,
    fragment: fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uResolution: {
        value: new Color(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height),
      },
      uFocal: { value: new Float32Array(focal) },
      uRotation: { value: new Float32Array(rotation) },
      uStarSpeed: { value: starSpeed },
      uDensity: { value: density },
      uHueShift: { value: hueShift },
      uSpeed: { value: speed },
      uMouse: { value: new Float32Array([smoothMousePos.x, smoothMousePos.y]) },
      uGlowIntensity: { value: glowIntensity },
      uSaturation: { value: saturation },
      uMouseRepulsion: { value: mouseRepulsion },
      uTwinkleIntensity: { value: twinkleIntensity },
      uRotationSpeed: { value: rotationSpeed },
      uRepulsionStrength: { value: repulsionStrength },
      uMouseActiveFactor: { value: 0.0 },
      uAutoCenterRepulsion: { value: autoCenterRepulsion },
      uTransparent: { value: transparent },
    },
  });

  function resize() {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    renderer.setSize(w, h);
    program.uniforms.uResolution.value = new Color(
      gl.canvas.width,
      gl.canvas.height,
      gl.canvas.width / gl.canvas.height,
    );
  }

  const mesh = new Mesh(gl, { geometry, program });
  container.appendChild(gl.canvas);
  gl.canvas.style.width = "100%";
  gl.canvas.style.height = "100%";
  gl.canvas.style.display = "block";

  const ro = new ResizeObserver(resize);
  ro.observe(container);
  window.addEventListener("resize", resize);
  resize();

  let animateId = 0;
  const animOff = prefersReduce || disableAnimation;

  function update(t) {
    animateId = requestAnimationFrame(update);
    if (!animOff) {
      program.uniforms.uTime.value = t * 0.001;
      program.uniforms.uStarSpeed.value = (t * 0.001 * starSpeed) / 10.0;
    }

    const lerpFactor = 0.05;
    smoothMousePos.x += (targetMousePos.x - smoothMousePos.x) * lerpFactor;
    smoothMousePos.y += (targetMousePos.y - smoothMousePos.y) * lerpFactor;
    smoothMouseActive.value += (targetMouseActive.value - smoothMouseActive.value) * lerpFactor;

    program.uniforms.uMouse.value[0] = smoothMousePos.x;
    program.uniforms.uMouse.value[1] = smoothMousePos.y;
    program.uniforms.uMouseActiveFactor.value = smoothMouseActive.value;

    renderer.render({ scene: mesh });
  }
  animateId = requestAnimationFrame(update);

  function setMouseFromEvent(clientX, clientY) {
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const x = (clientX - rect.left) / rect.width;
    const y = 1.0 - (clientY - rect.top) / rect.height;
    targetMousePos.x = x;
    targetMousePos.y = y;
    targetMouseActive.value = 1.0;
  }

  function onWinMove(e) {
    if (!mouseInteraction) return;
    setMouseFromEvent(e.clientX, e.clientY);
  }

  function onWinLeave() {
    targetMouseActive.value = 0.0;
  }

  if (mouseInteraction) {
    window.addEventListener("mousemove", onWinMove, { passive: true });
    document.addEventListener("mouseleave", onWinLeave);
  }

  return function destroy() {
    cancelAnimationFrame(animateId);
    ro.disconnect();
    window.removeEventListener("resize", resize);
    if (mouseInteraction) {
      window.removeEventListener("mousemove", onWinMove);
      document.removeEventListener("mouseleave", onWinLeave);
    }
    if (gl.canvas.parentNode === container) {
      container.removeChild(gl.canvas);
    }
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
}

const root = document.getElementById("galaxy-root");
if (root) {
  initGalaxy(root, {
    mouseRepulsion: true,
    mouseInteraction: true,
    density: 1,
    glowIntensity: 0.6,
    saturation: 0.1,
    hueShift: 140,
    twinkleIntensity: 0.3,
    rotationSpeed: 0.1,
    repulsionStrength: 2,
    autoCenterRepulsion: 0,
    starSpeed: 0.4,
    speed: 0.5,
  });
}

const burger = document.querySelector(".site-header__burger");
const nav = document.getElementById("site-nav");
if (burger && nav) {
  burger.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    burger.setAttribute("aria-expanded", String(isOpen));
  });
  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
    });
  });
}

const navLinks = Array.from(document.querySelectorAll('.site-header__nav a[href^="#"]'));
const sectionTargets = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

if (navLinks.length && sectionTargets.length && "IntersectionObserver" in window) {
  const setActiveLink = (id) => {
    navLinks.forEach((link) => {
      const isActive = link.getAttribute("href") === `#${id}`;
      link.classList.toggle("is-active", isActive);
    });
  };

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible[0]?.target?.id) setActiveLink(visible[0].target.id);
    },
    { rootMargin: "-30% 0px -55% 0px", threshold: [0.2, 0.4, 0.6] },
  );

  sectionTargets.forEach((section) => sectionObserver.observe(section));
}

const revealItems = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window && revealItems.length > 0) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 },
  );
  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const heroSection = document.getElementById("top");
const profileCard = document.querySelector(".profile-card");
const heroText = document.querySelector(".hero__text");
const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
if (heroSection && profileCard && heroText && !reduceMotion) {
  let ticking = false;
  const updateParallax = () => {
    const rect = heroSection.getBoundingClientRect();
    const progress = Math.max(-1, Math.min(1, rect.top / window.innerHeight));
    profileCard.style.transform = `translateY(${progress * -16}px)`;
    heroText.style.transform = `translateY(${progress * 8}px)`;
    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  updateParallax();
}

const briefForm = document.getElementById("brief-form");
const briefLink = document.getElementById("brief-telegram-link");
if (briefForm && briefLink) {
  const updateBriefLink = () => {
    const getValues = (name) =>
      Array.from(briefForm.querySelectorAll(`input[name="${name}"]:checked`)).map((el) => el.value);
    const need = getValues("need");
    const goal = getValues("goal");
    const have = getValues("have");
    const message = [
      "Здравствуйте! Хочу заполнить мини-бриф.",
      `Что мне нужно: ${need.length ? need.join(", ") : "-"}`,
      `Для чего сайт: ${goal.length ? goal.join(", ") : "-"}`,
      `Что уже есть: ${have.length ? have.join(", ") : "-"}`,
      "Ссылка на проект или соцсеть:",
      "Контакт:",
    ].join("\n");
    briefLink.href = `https://t.me/Tanya_panova?text=${encodeURIComponent(message)}`;
  };

  briefForm.addEventListener("change", updateBriefLink);
  updateBriefLink();
}

const profilePhotos = document.querySelectorAll(".js-profile-photo");
profilePhotos.forEach((photo) => {
  const profileCard = photo.closest(".profile-card");
  const aboutPhoto = photo.closest(".about-photo");

  const markLoaded = () => {
    profileCard?.classList.add("is-photo-loaded");
    profileCard?.classList.remove("is-photo-missing");
    aboutPhoto?.classList.add("is-photo-loaded");
    aboutPhoto?.classList.remove("is-photo-missing");
  };

  const markMissing = () => {
    profileCard?.classList.remove("is-photo-loaded");
    profileCard?.classList.add("is-photo-missing");
    aboutPhoto?.classList.remove("is-photo-loaded");
    aboutPhoto?.classList.add("is-photo-missing");
  };

  if (photo.complete && photo.naturalWidth > 0) {
    markLoaded();
  } else if (photo.complete && photo.naturalWidth === 0) {
    markMissing();
  }

  photo.addEventListener("load", markLoaded);
  photo.addEventListener("error", markMissing);
});

const projectCovers = document.querySelectorAll(".project-cover");
const supportsFinePointer = window.matchMedia?.("(pointer: fine)")?.matches;
if (projectCovers.length > 0 && supportsFinePointer) {
  projectCovers.forEach((cover) => {
    const reset = () => {
      cover.style.setProperty("--mx", "0px");
      cover.style.setProperty("--my", "0px");
      cover.classList.remove("is-hovered");
    };

    cover.addEventListener("mousemove", (event) => {
      const rect = cover.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const dx = (x / rect.width - 0.5) * 18;
      const dy = (y / rect.height - 0.5) * 18;
      cover.style.setProperty("--mx", `${dx}px`);
      cover.style.setProperty("--my", `${dy}px`);
      cover.classList.add("is-hovered");
    });

    cover.addEventListener("mouseleave", reset);
    cover.addEventListener("blur", reset);
  });
}

const testimonialsStack = document.querySelector(".testimonials-stack");
if (testimonialsStack) {
  const cards = Array.from(testimonialsStack.querySelectorAll(".testimonial-card"));
  const dots = Array.from(testimonialsStack.querySelectorAll(".testimonials-dot"));
  let activeIndex = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragOffsetX = 0;

  const renderStack = () => {
    const total = cards.length;
    cards.forEach((card, index) => {
      const order = (index - activeIndex + total) % total;
      card.classList.toggle("is-active", order === 0);
      if (order === 0) {
        card.style.transform = `translateX(${dragOffsetX}px) scale(1)`;
        card.style.opacity = "1";
        card.style.zIndex = String(total);
      } else if (order <= 2) {
        const scale = 1 - order * 0.05;
        const translateY = -order * 24;
        card.style.transform = `scale(${scale}) translateY(${translateY}px)`;
        card.style.opacity = String(1 - order * 0.18);
        card.style.zIndex = String(total - order);
      } else {
        card.style.transform = "scale(0.9)";
        card.style.opacity = "0";
        card.style.zIndex = "0";
      }
    });

    dots.forEach((dot, idx) => dot.classList.toggle("is-active", idx === activeIndex));
  };

  const goTo = (index) => {
    activeIndex = (index + cards.length) % cards.length;
    dragOffsetX = 0;
    renderStack();
  };

  const onDragMove = (event) => {
    if (!isDragging) return;
    const clientX = "touches" in event ? event.touches[0].clientX : event.clientX;
    dragOffsetX = clientX - dragStartX;
    renderStack();
  };

  const onDragEnd = () => {
    if (!isDragging) return;
    if (Math.abs(dragOffsetX) > 60) {
      goTo(activeIndex + (dragOffsetX < 0 ? 1 : -1));
    } else {
      dragOffsetX = 0;
      renderStack();
    }
    isDragging = false;
  };

  const activeCard = () => cards[activeIndex];
  const onDragStart = (event) => {
    if (event.currentTarget !== activeCard()) return;
    isDragging = true;
    dragStartX = "touches" in event ? event.touches[0].clientX : event.clientX;
  };

  cards.forEach((card) => {
    card.addEventListener("mousedown", onDragStart);
    card.addEventListener("touchstart", onDragStart, { passive: true });
  });
  window.addEventListener("mousemove", onDragMove, { passive: true });
  window.addEventListener("touchmove", onDragMove, { passive: true });
  window.addEventListener("mouseup", onDragEnd);
  window.addEventListener("touchend", onDragEnd);
  dots.forEach((dot, index) => dot.addEventListener("click", () => goTo(index)));

  renderStack();
}
