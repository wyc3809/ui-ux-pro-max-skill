/*
 * VCseed mark: the single source of every brand image (docs/BRAND.md). Two glass leaves, violet and mint,
 * cross at the base into a V; where they overlap the glass lets light through.
 *
 * Geometry lives on a 1024 grid. Everything that ships (app icons, store art, the in-app launch animation
 * layers, the intro video) is drawn by these functions, so the art never drifts between surfaces.
 */
(function () {
  const BRAND = {
    ink: ["#1C1C22", "#08080A"], // canvas: top → bottom
    violet: ["#B29BFF", "#5B3FD6"], // leaf tip → base (#5B3FD6 is the app accent)
    mint: ["#A6F7D3", "#16B577"],
    light: ["#F1EDFF", "#D2FBEA"], // the overlap
    rim: "rgba(255,255,255,0.38)",
    white: "#FFFFFF",
  };
  // Leaf = two circle arcs between base and tip. bulge 0.85 = slightly fuller than a quarter-arc lens.
  const LEAVES = {
    left: { base: [540, 792], tip: [250, 228], bulge: 0.85, colors: BRAND.violet },
    right: { base: [484, 792], tip: [774, 228], bulge: 0.85, colors: BRAND.mint },
  };
  /** Pivot for the grow animation: where the stems cross. */
  const PIVOT = [512, 792];

  function lens(ctx, b, t, bulge, u) {
    const [bx, by] = [b[0] * u, b[1] * u], [tx, ty] = [t[0] * u, t[1] * u];
    const dx = tx - bx, dy = ty - by, L = Math.hypot(dx, dy);
    const off = (L / 2) * bulge, r = Math.hypot(L / 2, off);
    const mx = (bx + tx) / 2, my = (by + ty) / 2, nx = -dy / L, ny = dx / L;
    const c1 = [mx + nx * off, my + ny * off], c2 = [mx - nx * off, my - ny * off];
    const ang = (c, p) => Math.atan2(p[1] - c[1], p[0] - c[0]);
    const minor = (c, p, q) => {
      const s0 = ang(c, p), s1 = ang(c, q);
      const cw = (((s1 - s0) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) < Math.PI;
      ctx.arc(c[0], c[1], r, s0, s1, !cw);
    };
    ctx.beginPath();
    ctx.moveTo(bx, by);
    minor(c1, [bx, by], [tx, ty]);
    minor(c2, [tx, ty], [bx, by]);
    ctx.closePath();
  }
  const leafPath = (ctx, k, u) => lens(ctx, LEAVES[k].base, LEAVES[k].tip, LEAVES[k].bulge, u);
  const grad = (ctx, a, b, stops) => {
    const g = ctx.createLinearGradient(a[0], a[1], b[0], b[1]);
    stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
    return g;
  };

  function background(ctx, S) {
    ctx.fillStyle = grad(ctx, [0, 0], [0, S], BRAND.ink);
    ctx.fillRect(0, 0, S, S);
    const r = ctx.createRadialGradient(S / 2, S * 0.05, 0, S / 2, S * 0.05, S * 0.85);
    r.addColorStop(0, "rgba(255,255,255,0.10)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = r;
    ctx.fillRect(0, 0, S, S);
  }

  /** One glass leaf: coloured glow underneath, gradient body, top sheen, rim light. */
  function leaf(ctx, k, u, opts = {}) {
    const L = LEAVES[k];
    const tip = [L.tip[0] * u, L.tip[1] * u], base = [L.base[0] * u, L.base[1] * u];
    if (opts.glow !== false) {
      ctx.save();
      leafPath(ctx, k, u);
      ctx.shadowColor = k === "left" ? "rgba(91,63,214,0.55)" : "rgba(22,181,119,0.45)";
      ctx.shadowBlur = 90 * u;
      ctx.shadowOffsetY = 30 * u;
      ctx.fillStyle = "rgba(0,0,0,1)";
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    leafPath(ctx, k, u);
    ctx.fillStyle = opts.mono ? opts.mono : grad(ctx, tip, base, L.colors);
    ctx.fill();
    if (!opts.mono) {
      ctx.clip();
      ctx.fillStyle = grad(ctx, [0, tip[1]], [0, base[1]], ["rgba(255,255,255,0.42)", "rgba(255,255,255,0)", "rgba(255,255,255,0)"]);
      ctx.fillRect(0, 0, 1024 * u, 1024 * u);
    }
    ctx.restore();
    if (!opts.mono) {
      ctx.save();
      leafPath(ctx, k, u);
      ctx.lineWidth = 5 * u;
      ctx.strokeStyle = BRAND.rim;
      ctx.stroke();
      ctx.restore();
    }
  }

  /** The overlap: both leaves intersected, filled with light (what glass does where two panes cross). */
  function overlap(ctx, u, opts = {}) {
    ctx.save();
    leafPath(ctx, "left", u);
    ctx.clip();
    leafPath(ctx, "right", u);
    ctx.clip();
    ctx.fillStyle = opts.mono ? opts.mono : grad(ctx, [0, 400 * u], [0, 792 * u], BRAND.light);
    ctx.fillRect(0, 0, 1024 * u, 1024 * u);
    ctx.restore();
  }

  /** The full mark (no background). opts.mono draws a single-colour silhouette (tinted / themed icons). */
  function mark(ctx, S, opts = {}) {
    const u = S / 1024;
    leaf(ctx, "left", u, opts);
    leaf(ctx, "right", u, opts);
    if (!opts.mono) overlap(ctx, u);
  }

  /**
   * The mark at time t (0–1) of the 1.6 s brand intro: both leaves rise from the pivot closed together (a seed),
   * open into the V with a soft overshoot, then the overlap lights up and a sheen crosses the glass.
   */
  function markAt(ctx, S, t) {
    const u = S / 1024;
    const ease = (x) => 1 - Math.pow(1 - x, 3);
    const spring = (x) => (x >= 1 ? 1 : 1 - Math.exp(-6 * x) * Math.cos(9 * x));
    const grow = spring(Math.min(1, t / 0.55));
    const open = spring(Math.max(0, Math.min(1, (t - 0.12) / 0.55)));
    const light = ease(Math.max(0, Math.min(1, (t - 0.5) / 0.2)));
    for (const k of ["left", "right"]) {
      const L = LEAVES[k];
      const restAngle = Math.atan2(L.tip[1] - L.base[1], L.tip[0] - L.base[0]) + Math.PI / 2; // 0 = pointing up
      ctx.save();
      ctx.translate(PIVOT[0] * u, PIVOT[1] * u);
      ctx.rotate(-restAngle * (1 - open));
      ctx.scale(grow, grow);
      ctx.translate(-PIVOT[0] * u, -PIVOT[1] * u);
      leaf(ctx, k, u);
      ctx.restore();
    }
    if (light > 0 && open > 0.98) {
      ctx.save();
      ctx.globalAlpha = light;
      overlap(ctx, u);
      ctx.restore();
    }
    const sheen = (t - 0.6) / 0.35;
    if (sheen > 0 && sheen < 1) {
      ctx.save();
      leafPath(ctx, "left", u);
      ctx.clip();
      const x = (-200 + sheen * 1400) * u;
      const g = ctx.createLinearGradient(x - 120 * u, 0, x + 120 * u, 0);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(0.5, "rgba(255,255,255,0.35)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S, S);
      ctx.restore();
      ctx.save();
      leafPath(ctx, "right", u);
      ctx.clip();
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S, S);
      ctx.restore();
    }
  }

  window.VCSEED = { BRAND, LEAVES, PIVOT, background, leaf, overlap, mark, markAt, leafPath };
})();
