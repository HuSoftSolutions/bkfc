import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { FundProgress } from "@/lib/fundProgress";
import { formatMoney } from "@/lib/funds";

/**
 * Server-rendered fund progress graphic. Built with Satori-compatible JSX
 * (flexbox + inline SVG shapes only) so the same picture serves as the
 * downloadable social image, the on-page graphic, and the link preview.
 */

export const PORTRAIT = { width: 1080, height: 1350 } as const;
export const LANDSCAPE = { width: 1200, height: 630 } as const;

const NAVY = "#1e3a5f";
const NAVY_DARK = "#152a45";
const RED = "#c0392b";
const CREAM = "#f7f4ec";
const ROPE = "#c9a86a";

interface FontSpec {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700 | 900;
  style: "normal" | "italic";
}

const fontCache = new Map<string, Promise<ArrayBuffer | null>>();

/**
 * Fonts ship with the app (src/assets/fonts) so rendering never waits on
 * an external request. Read once per function instance.
 */
function loadLocalFont(file: string) {
  if (!fontCache.has(file)) {
    fontCache.set(
      file,
      readFile(join(process.cwd(), "src/assets/fonts", file))
        .then((buf) => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer)
        .catch((err) => {
          console.error(`Failed to load font ${file}:`, err);
          return null;
        })
    );
  }
  return fontCache.get(file)!;
}

async function loadFonts(): Promise<FontSpec[]> {
  const [oswald, playfair] = await Promise.all([
    loadLocalFont("Oswald-Bold.woff"),
    loadLocalFont("PlayfairDisplay-BoldItalic.woff"),
  ]);
  const fonts: FontSpec[] = [];
  if (oswald) fonts.push({ name: "Oswald", data: oswald, weight: 700, style: "normal" });
  if (playfair) fonts.push({ name: "Playfair", data: playfair, weight: 700, style: "italic" });
  return fonts;
}

function niceStep(goal: number) {
  const rough = goal / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  const mult = norm >= 5 ? 5 : norm >= 2.5 ? 2.5 : norm >= 2 ? 2 : 1;
  return mult * mag;
}

interface RenderOptions {
  fund: FundProgress;
  layout: "portrait" | "landscape";
  /** Public site origin, used to load the patch image. */
  origin: string;
  updatedLabel: string;
  ctaLabel: string;
}

function Wave({ y, width, opacity }: { y: number; width: number; opacity: number }) {
  const seg = width / 4;
  return (
    <svg
      width={width}
      height={40}
      viewBox={`0 0 ${width} 40`}
      style={{ position: "absolute", top: y - 20, left: 0 }}
    >
      <path
        d={`M0 20 Q ${seg / 2} 2 ${seg} 20 T ${seg * 2} 20 T ${seg * 3} 20 T ${seg * 4} 20`}
        fill="none"
        stroke="#ffffff"
        strokeOpacity={opacity}
        strokeWidth={4}
      />
    </svg>
  );
}

function LifeRing({ size, raised, pct, reached, headingFont, numberFont }: {
  size: number;
  raised: number;
  pct: number;
  reached: boolean;
  headingFont: string;
  numberFont: string;
}) {
  const r = size / 2;
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: "absolute", top: 0, left: 0 }}>
        <circle cx={r} cy={r} r={r - 6} fill="none" stroke={ROPE} strokeWidth={8} />
        <circle cx={r} cy={r} r={r - 30} fill="#ffffff" stroke="#d9d3c4" strokeWidth={4} />
        <circle
          cx={r}
          cy={r}
          r={r - 30}
          fill="none"
          stroke={RED}
          strokeWidth={r * 0.26}
          strokeDasharray={`${(r - 30) * 0.87} ${(r - 30) * 0.7}`}
          transform={`rotate(-20 ${r} ${r})`}
        />
        <circle cx={r} cy={r} r={r * 0.6} fill={CREAM} stroke="#d9d3c4" strokeWidth={4} />
      </svg>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: size * 0.02 }}>
        <div style={{ fontFamily: headingFont, fontSize: size * 0.065, color: NAVY, letterSpacing: 3 }}>
          RAISED SO FAR
        </div>
        <div style={{ fontFamily: numberFont, fontSize: size * (raised >= 1_000_000 ? 0.13 : 0.16), color: RED, lineHeight: 1.05 }}>
          {formatMoney(raised)}
        </div>
        <div style={{ fontFamily: headingFont, fontSize: size * 0.058, color: NAVY, letterSpacing: 1 }}>
          {reached ? "GOAL REACHED!" : `${Math.round(pct * 100)}% OF GOAL`}
        </div>
      </div>
    </div>
  );
}

function Thermometer({ goal, pct, tubeW, tubeH, headingFont, vertical }: {
  goal: number;
  pct: number;
  tubeW: number;
  tubeH: number;
  headingFont: string;
  vertical: boolean;
}) {
  const step = niceStep(goal);
  const majors: number[] = [];
  for (let v = 0; v <= goal + 1e-6; v += step) majors.push(v);
  if (majors[majors.length - 1] < goal - step * 0.05) majors.push(goal);
  const minors: number[] = [];
  for (let v = step / 4; v < goal; v += step / 4) {
    if (!majors.some((m) => Math.abs(m - v) < 1e-6)) minors.push(v);
  }
  const bulb = tubeW * 1.7;

  if (vertical) {
    return (
      <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start" }}>
        {/* Tube + bulb */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: bulb }}>
          <div
            style={{
              display: "flex",
              width: tubeW + 16,
              height: tubeH + 16,
              borderRadius: (tubeW + 16) / 2,
              backgroundColor: NAVY_DARK,
              padding: 8,
              position: "relative",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                width: tubeW,
                height: tubeH,
                borderRadius: tubeW / 2,
                backgroundColor: "#ffffff",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: tubeW,
                  height: Math.max(tubeW / 2, tubeH * pct),
                  background: `linear-gradient(90deg, #a93226 0%, ${RED} 50%, #a93226 100%)`,
                }}
              />
              {[...majors, ...minors].map((v) => (
                <div
                  key={v}
                  style={{
                    position: "absolute",
                    left: 0,
                    top: tubeH - (v / goal) * tubeH,
                    width: tubeW,
                    height: 2,
                    backgroundColor: NAVY_DARK,
                    opacity: 0.25,
                  }}
                />
              ))}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              width: bulb,
              height: bulb,
              borderRadius: bulb / 2,
              backgroundColor: NAVY_DARK,
              marginTop: -bulb * 0.45,
              padding: 12,
            }}
          >
            <div style={{ display: "flex", width: "100%", height: "100%", borderRadius: bulb / 2, backgroundColor: RED }} />
          </div>
        </div>
        {/* Scale */}
        <div style={{ display: "flex", position: "relative", width: 230, height: tubeH + 16, marginTop: 8 }}>
          {majors.map((v) => (
            <div
              key={v}
              style={{
                position: "absolute",
                left: 0,
                top: tubeH - (v / goal) * tubeH - 16,
                display: "flex",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", width: 30, height: 4, backgroundColor: NAVY, marginLeft: 14 }} />
              <div style={{ fontFamily: headingFont, fontSize: 30, color: NAVY, marginLeft: 12 }}>{formatMoney(v)}</div>
            </div>
          ))}
          {minors.map((v) => (
            <div
              key={v}
              style={{
                position: "absolute",
                left: 14,
                top: tubeH - (v / goal) * tubeH - 1,
                width: 16,
                height: 2,
                backgroundColor: NAVY,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Horizontal variant for the landscape/link-preview layout
  return (
    <div style={{ display: "flex", flexDirection: "column", width: tubeH + bulb }}>
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            width: bulb,
            height: bulb,
            borderRadius: bulb / 2,
            backgroundColor: NAVY_DARK,
            padding: 10,
            marginRight: -bulb * 0.4,
          }}
        >
          <div style={{ display: "flex", width: "100%", height: "100%", borderRadius: bulb / 2, backgroundColor: RED }} />
        </div>
        <div
          style={{
            display: "flex",
            width: tubeH + 16,
            height: tubeW + 16,
            borderRadius: (tubeW + 16) / 2,
            backgroundColor: NAVY_DARK,
            padding: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              width: tubeH,
              height: tubeW,
              borderRadius: tubeW / 2,
              backgroundColor: "#ffffff",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                display: "flex",
                height: tubeW,
                width: Math.max(tubeW / 2, tubeH * pct),
                background: `linear-gradient(180deg, #a93226 0%, ${RED} 50%, #a93226 100%)`,
              }}
            />
            {[...majors, ...minors].map((v) => (
              <div
                key={v}
                style={{
                  position: "absolute",
                  top: 0,
                  left: (v / goal) * tubeH,
                  height: tubeW,
                  width: 2,
                  backgroundColor: NAVY_DARK,
                  opacity: 0.25,
                }}
              />
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", position: "relative", height: 40, marginLeft: bulb * 0.6 + 8 }}>
        {(() => {
          // Drop labels that would overlap; always keep $0 and the goal.
          const gap = (step / goal) * tubeH;
          const every = Math.max(1, Math.ceil(110 / gap));
          const shown = majors.filter((v, i) => i % every === 0 || i === majors.length - 1);
          const last = shown[shown.length - 1];
          const prev = shown[shown.length - 2];
          const labels =
            prev !== undefined && ((last - prev) / goal) * tubeH < 110 ? shown.filter((v) => v !== prev) : shown;
          return labels.map((v) => (
            <div
              key={v}
              style={{
                position: "absolute",
                left: (v / goal) * tubeH - 50,
                top: 6,
                fontFamily: headingFont,
                fontSize: 22,
                color: NAVY,
                width: 100,
                display: "flex",
                justifyContent: "center",
              }}
            >
              {formatMoney(v)}
            </div>
          ));
        })()}
      </div>
    </div>
  );
}

export async function renderFundImage({ fund, layout, origin, updatedLabel, ctaLabel }: RenderOptions) {
  const fonts = await loadFonts();
  const headingFont = fonts.some((f) => f.name === "Oswald") ? "Oswald" : "sans-serif";
  const scriptFont = fonts.some((f) => f.name === "Playfair") ? "Playfair" : "serif";

  const goal = fund.goal > 0 ? fund.goal : Math.max(fund.raised, 1);
  const pct = Math.max(0, Math.min(1, fund.raised / goal));
  const reached = fund.goal > 0 && fund.raised >= fund.goal;
  const { width, height } = layout === "portrait" ? PORTRAIT : LANDSCAPE;
  const patchUrl = `${origin}/bkfc-patch.png`;

  const frame = (
    <div
      style={{
        position: "absolute",
        top: 18,
        left: 18,
        width: width - 36,
        height: height - 36,
        border: `6px solid ${NAVY}`,
        borderRadius: 12,
        display: "flex",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          width: width - 36 - 32,
          height: height - 36 - 32,
          border: `3px dashed ${ROPE}`,
          borderRadius: 8,
          display: "flex",
        }}
      />
    </div>
  );

  const body =
    layout === "portrait" ? (
      <div style={{ display: "flex", width, height, backgroundColor: CREAM, position: "relative", overflow: "hidden" }}>
        {/* Sea + dock */}
        <div
          style={{
            position: "absolute",
            top: 880,
            left: 0,
            width,
            height: 300,
            display: "flex",
            background: "linear-gradient(180deg, #d9e6ef 0%, #7fa6c2 100%)",
          }}
        />
        <Wave y={900} width={width} opacity={0.45} />
        <Wave y={960} width={width} opacity={0.33} />
        <Wave y={1020} width={width} opacity={0.21} />
        <div style={{ position: "absolute", top: 1180, left: 0, width, height: 170, backgroundColor: "#8b6b4a", display: "flex" }} />
        {[1220, 1260, 1300].map((y) => (
          <div key={y} style={{ position: "absolute", top: y, left: 0, width, height: 3, backgroundColor: "#6e5238", display: "flex" }} />
        ))}
        {frame}

        {/* Left column: goal + thermometer */}
        <div style={{ position: "absolute", top: 80, left: 70, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 160 }}>
            <div style={{ fontFamily: headingFont, fontSize: 56, color: RED, lineHeight: 1 }}>{formatMoney(goal)}</div>
            <div style={{ fontFamily: headingFont, fontSize: 30, color: NAVY, letterSpacing: 4, marginTop: 4 }}>GOAL</div>
            <div style={{ display: "flex", width: 90, height: 5, backgroundColor: RED, borderRadius: 3, marginTop: 4 }} />
          </div>
          <div style={{ display: "flex", marginTop: 40, marginLeft: 2 }}>
            <Thermometer goal={goal} pct={pct} tubeW={90} tubeH={800} headingFont={headingFont} vertical />
          </div>
        </div>

        {/* Right column */}
        <div
          style={{
            position: "absolute",
            top: 70,
            left: 470,
            width: 550,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <img src={patchUrl} width={140} height={140} alt="" />
          <div
            style={{
              fontFamily: headingFont,
              fontSize: fund.name.length > 22 ? 44 : 56,
              color: NAVY,
              letterSpacing: 2,
              textAlign: "center",
              marginTop: 16,
              lineHeight: 1.05,
              textTransform: "uppercase",
            }}
          >
            {fund.name}
          </div>
          <div style={{ fontFamily: scriptFont, fontSize: 36, color: RED, marginTop: 10, fontStyle: "italic", whiteSpace: "nowrap" }}>
            Together we can reach our goal!
          </div>
          <div style={{ display: "flex", width: 370, height: 3, backgroundColor: NAVY, marginTop: 18 }} />

          <div style={{ display: "flex", marginTop: 40 }}>
            <LifeRing size={470} raised={fund.raised} pct={pct} reached={reached} headingFont={headingFont} numberFont={headingFont} />
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              backgroundColor: NAVY,
              borderRadius: 10,
              width: 430,
              paddingTop: 22,
              paddingBottom: 22,
              marginTop: 44,
            }}
          >
            <div style={{ fontFamily: headingFont, fontSize: 30, color: "#ffffff", letterSpacing: 3 }}>THANK YOU FOR</div>
            <div style={{ fontFamily: scriptFont, fontSize: 48, color: "#ffffff", fontStyle: "italic", marginTop: 2 }}>Your Support!</div>
          </div>
        </div>

        {/* Footer ribbon */}
        <div
          style={{
            position: "absolute",
            top: 1200,
            left: 80,
            width: width - 160,
            height: 80,
            backgroundColor: NAVY,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ fontFamily: headingFont, fontSize: 28, color: "#ffffff", letterSpacing: 4 }}>
            EVERY DONATION MAKES A DIFFERENCE
          </div>
          <div style={{ fontFamily: headingFont, fontSize: 20, color: ROPE, letterSpacing: 1, marginTop: 2 }}>
            {[ctaLabel, updatedLabel].filter(Boolean).join("   •   ")}
          </div>
        </div>
      </div>
    ) : (
      <div style={{ display: "flex", width, height, backgroundColor: CREAM, position: "relative", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            top: 470,
            left: 0,
            width,
            height: 160,
            display: "flex",
            background: "linear-gradient(180deg, #d9e6ef 0%, #7fa6c2 100%)",
          }}
        />
        <Wave y={490} width={width} opacity={0.45} />
        <Wave y={540} width={width} opacity={0.3} />
        {frame}

        <div style={{ position: "absolute", top: 60, left: 70, width: 640, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
            <img src={patchUrl} width={110} height={110} alt="" />
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 24 }}>
              <div
                style={{
                  fontFamily: headingFont,
                  fontSize: fund.name.length > 22 ? 40 : 50,
                  color: NAVY,
                  letterSpacing: 2,
                  lineHeight: 1.05,
                  textTransform: "uppercase",
                }}
              >
                {fund.name}
              </div>
              <div style={{ fontFamily: scriptFont, fontSize: 28, color: RED, fontStyle: "italic", marginTop: 4, whiteSpace: "nowrap" }}>
                Together we can reach our goal!
              </div>
            </div>
          </div>
          <div style={{ display: "flex", marginTop: 50 }}>
            <Thermometer goal={goal} pct={pct} tubeW={70} tubeH={520} headingFont={headingFont} vertical={false} />
          </div>
          <div
            style={{
              display: "flex",
              backgroundColor: NAVY,
              borderRadius: 8,
              paddingLeft: 24,
              paddingRight: 24,
              paddingTop: 12,
              paddingBottom: 12,
              marginTop: 60,
              alignSelf: "flex-start",
              flexDirection: "column",
            }}
          >
            <div style={{ fontFamily: headingFont, fontSize: 24, color: "#ffffff", letterSpacing: 3 }}>
              EVERY DONATION MAKES A DIFFERENCE
            </div>
            <div style={{ fontFamily: headingFont, fontSize: 18, color: ROPE, marginTop: 2 }}>
              {[ctaLabel, updatedLabel].filter(Boolean).join("   •   ")}
            </div>
          </div>
        </div>

        <div style={{ position: "absolute", top: 70, left: 760, display: "flex" }}>
          <LifeRing size={400} raised={fund.raised} pct={pct} reached={reached} headingFont={headingFont} numberFont={headingFont} />
        </div>
        <div
          style={{
            position: "absolute",
            top: 500,
            left: 800,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: 320,
          }}
        >
          <div style={{ fontFamily: headingFont, fontSize: 24, color: NAVY, letterSpacing: 3 }}>GOAL</div>
          <div style={{ fontFamily: headingFont, fontSize: 48, color: RED, lineHeight: 1 }}>{formatMoney(goal)}</div>
        </div>
      </div>
    );

  return new ImageResponse(body, {
    width,
    height,
    fonts: fonts.length ? fonts : undefined,
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
      "Content-Disposition": `inline; filename="${fund.slug}-progress.png"`,
    },
  });
}
