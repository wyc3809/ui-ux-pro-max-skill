// Scroll reveals (once) and the tagline's word-by-word reveal, both on IntersectionObserver (no scroll handlers).
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const reveal = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); reveal.unobserve(e.target); }
}, { threshold: 0.15 });
document.querySelectorAll(".reveal").forEach((el) => reveal.observe(el));

const line = document.querySelector("[data-words]");
if (line) {
  // Wrap each word (or pair of Chinese characters) in a span, keeping the <br> line breaks.
  for (const node of [...line.childNodes]) {
    if (node.nodeType !== Node.TEXT_NODE) continue;
    const frag = document.createDocumentFragment();
    for (const w of node.textContent.split(/(\s+)/)) {
      if (!w) continue;
      if (/^\s+$/.test(w)) { frag.append(w); continue; }
      const parts = /[\u3400-\u9fff]/.test(w) ? w.match(/[\u3400-\u9fff]{1,2}|[^\u3400-\u9fff]+/g) : [w];
      for (const p of parts) { const s = document.createElement("span"); s.className = "w"; s.textContent = p; frag.append(s); }
    }
    node.replaceWith(frag);
  }
  const spans = [...line.querySelectorAll(".w")];
  if (reduce) spans.forEach((s) => s.classList.add("on"));
  else {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("on"); io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -40% 0px" });
    spans.forEach((s) => io.observe(s));
  }
}
