"use client";

import { forwardRef } from "react";
import { formatMoney } from "@/lib/funds";

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

interface FundProgressCardProps {
  fundName: string;
  raised: number;
  goal: number;
  /** Shown in the footer, e.g. "Updated Sep 4, 2026". */
  updatedLabel?: string;
  /** Short call to action shown in the footer, e.g. the donate URL. */
  ctaLabel?: string;
  /** Data URI of the department patch; inlined so PNG export can render it. */
  patchDataUrl?: string;
  className?: string;
}

const NAVY = "#1e3a5f";
const NAVY_DARK = "#152a45";
const RED = "#c0392b";
const CREAM = "#f7f4ec";
const ROPE = "#c9a86a";

/**
 * Shareable "thermometer" progress graphic rendered as a single SVG so the
 * same markup powers the public fund page and the downloadable PNG.
 */
const FundProgressCard = forwardRef<SVGSVGElement, FundProgressCardProps>(
  function FundProgressCard(
    { fundName, raised, goal, updatedLabel, ctaLabel, patchDataUrl, className },
    ref
  ) {
    const safeGoal = goal > 0 ? goal : 1;
    const pct = Math.max(0, Math.min(1, raised / safeGoal));
    const reached = raised >= goal && goal > 0;

    // Thermometer geometry
    const tubeX = 150;
    const tubeW = 90;
    const tubeTop = 250;
    const tubeBottom = 1080;
    const tubeH = tubeBottom - tubeTop;
    const fillH = tubeH * pct;
    const fillY = tubeBottom - fillH;

    // Tick marks at "nice" round dollar steps (e.g. $5,000 for a $25,000 goal)
    const niceStep = (() => {
      const rough = safeGoal / 5;
      const mag = Math.pow(10, Math.floor(Math.log10(rough)));
      const norm = rough / mag;
      const mult = norm >= 5 ? 5 : norm >= 2.5 ? 2.5 : norm >= 2 ? 2 : 1;
      return mult * mag;
    })();
    const majorTicks: number[] = [];
    for (let v = 0; v <= safeGoal; v += niceStep) majorTicks.push(v);
    if (majorTicks[majorTicks.length - 1] < safeGoal - niceStep * 0.05) majorTicks.push(safeGoal);
    const minorTicks: number[] = [];
    for (let v = niceStep / 4; v < safeGoal; v += niceStep / 4) {
      if (!majorTicks.some((m) => Math.abs(m - v) < 1e-6)) minorTicks.push(v);
    }

    // Split long fund names onto two lines so they fit the right column
    const titleLines = (() => {
      const words = fundName.toUpperCase().split(/\s+/);
      if (fundName.length <= 16) return [words.join(" ")];
      const lines: string[] = [];
      let current = "";
      for (const w of words) {
        if ((current + " " + w).trim().length > 18 && current) {
          lines.push(current);
          current = w;
        } else {
          current = (current + " " + w).trim();
        }
      }
      if (current) lines.push(current);
      return lines.slice(0, 3);
    })();
    const titleSize = titleLines.some((l) => l.length > 14) ? 36 : 44;
    const titleTop = patchDataUrl ? 300 : 180;
    const titleBottom = titleTop + (titleLines.length - 1) * (titleSize + 8);

    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`}
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        className={className}
        role="img"
        aria-label={`${fundName}: ${formatMoney(raised)} raised of ${formatMoney(goal)} goal`}
        style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
      >
        <defs>
          <linearGradient id="fpc-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d9e6ef" />
            <stop offset="100%" stopColor="#7fa6c2" />
          </linearGradient>
          <linearGradient id="fpc-fill" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#a93226" />
            <stop offset="50%" stopColor={RED} />
            <stop offset="100%" stopColor="#a93226" />
          </linearGradient>
          <clipPath id="fpc-tube">
            <rect x={tubeX} y={tubeTop} width={tubeW} height={tubeH} rx={tubeW / 2} />
          </clipPath>
        </defs>

        {/* Background */}
        <rect width={CARD_WIDTH} height={CARD_HEIGHT} fill={CREAM} />
        <rect x={0} y={880} width={CARD_WIDTH} height={CARD_HEIGHT - 880} fill="url(#fpc-water)" />
        {/* Soft waves */}
        {[900, 960, 1020].map((y, i) => (
          <path
            key={y}
            d={`M0 ${y} Q 135 ${y - 18} 270 ${y} T 540 ${y} T 810 ${y} T 1080 ${y}`}
            fill="none"
            stroke="#ffffff"
            strokeOpacity={0.45 - i * 0.12}
            strokeWidth={4}
          />
        ))}
        {/* Dock planks */}
        <rect x={0} y={1180} width={CARD_WIDTH} height={CARD_HEIGHT - 1180} fill="#8b6b4a" />
        {[1180, 1220, 1260, 1300].map((y) => (
          <line key={y} x1={0} y1={y} x2={CARD_WIDTH} y2={y} stroke="#6e5238" strokeWidth={3} />
        ))}

        {/* Border */}
        <rect
          x={18}
          y={18}
          width={CARD_WIDTH - 36}
          height={CARD_HEIGHT - 36}
          fill="none"
          stroke={NAVY}
          strokeWidth={6}
          rx={12}
        />
        <rect
          x={34}
          y={34}
          width={CARD_WIDTH - 68}
          height={CARD_HEIGHT - 68}
          fill="none"
          stroke={ROPE}
          strokeWidth={3}
          strokeDasharray="14 10"
          rx={8}
        />

        {/* Goal label above thermometer */}
        <text x={tubeX + tubeW / 2} y={140} textAnchor="middle" fill={RED} fontSize={54} fontWeight={800}>
          {formatMoney(goal)}
        </text>
        <text
          x={tubeX + tubeW / 2}
          y={190}
          textAnchor="middle"
          fill={NAVY}
          fontSize={30}
          fontWeight={800}
          letterSpacing={3}
        >
          GOAL
        </text>
        <line x1={tubeX} y1={205} x2={tubeX + tubeW} y2={205} stroke={RED} strokeWidth={5} strokeLinecap="round" />

        {/* Thermometer tube */}
        <rect
          x={tubeX - 8}
          y={tubeTop - 8}
          width={tubeW + 16}
          height={tubeH + 16}
          rx={(tubeW + 16) / 2}
          fill={NAVY_DARK}
        />
        <rect x={tubeX} y={tubeTop} width={tubeW} height={tubeH} rx={tubeW / 2} fill="#ffffff" />
        <g clipPath="url(#fpc-tube)">
          <rect x={tubeX} y={fillY} width={tubeW} height={fillH + 60} fill="url(#fpc-fill)" />
          {/* Segment lines inside the fill */}
          {[...majorTicks, ...minorTicks].map((v) => {
            const y = tubeBottom - (v / safeGoal) * tubeH;
            return (
              <line
                key={v}
                x1={tubeX}
                y1={y}
                x2={tubeX + tubeW}
                y2={y}
                stroke={NAVY_DARK}
                strokeOpacity={0.25}
                strokeWidth={2}
              />
            );
          })}
        </g>
        {/* Bulb */}
        <circle cx={tubeX + tubeW / 2} cy={tubeBottom + 20} r={78} fill={NAVY_DARK} />
        <circle cx={tubeX + tubeW / 2} cy={tubeBottom + 20} r={66} fill={RED} />
        <circle cx={tubeX + tubeW / 2 - 18} cy={tubeBottom} r={14} fill="#ffffff" fillOpacity={0.35} />

        {/* Scale on the right of tube */}
        {majorTicks.map((v) => {
          const y = tubeBottom - (v / safeGoal) * tubeH;
          return (
            <g key={v}>
              <line x1={tubeX + tubeW + 22} y1={y} x2={tubeX + tubeW + 52} y2={y} stroke={NAVY} strokeWidth={4} />
              <text x={tubeX + tubeW + 64} y={y + 11} fill={NAVY} fontSize={30} fontWeight={700}>
                {formatMoney(v)}
              </text>
            </g>
          );
        })}
        {/* Minor ticks */}
        {minorTicks.map((v) => {
            const y = tubeBottom - (v / safeGoal) * tubeH;
            return (
              <line
                key={v}
                x1={tubeX + tubeW + 22}
                y1={y}
                x2={tubeX + tubeW + 38}
                y2={y}
                stroke={NAVY}
                strokeWidth={2}
              />
            );
          })}

        {/* Right column: title */}
        <g transform="translate(470 0)">
          {patchDataUrl && (
            <image href={patchDataUrl} x={200} y={70} width={150} height={150} preserveAspectRatio="xMidYMid meet" />
          )}
          {titleLines.map((line, i) => (
            <text
              key={i}
              x={275}
              y={titleTop + i * (titleSize + 8)}
              textAnchor="middle"
              fill={NAVY}
              fontSize={titleSize}
              fontWeight={900}
              letterSpacing={2}
            >
              {line}
            </text>
          ))}
          <text
            x={275}
            y={titleBottom + 60}
            textAnchor="middle"
            fill={RED}
            fontSize={38}
            fontWeight={700}
            fontStyle="italic"
          >
            Together we can reach our goal!
          </text>
          <line x1={90} y1={titleBottom + 95} x2={460} y2={titleBottom + 95} stroke={NAVY} strokeWidth={3} />

          {/* Life ring with raised amount */}
          <g transform="translate(275 640)">
            <circle r={230} fill="none" stroke={ROPE} strokeWidth={10} />
            <circle r={205} fill="#ffffff" stroke="#d9d3c4" strokeWidth={4} />
            <circle r={205} fill="none" stroke={RED} strokeWidth={58} strokeDasharray="200 122" strokeLinecap="butt" transform="rotate(-20)" />
            <circle r={140} fill={CREAM} stroke="#d9d3c4" strokeWidth={4} />
            <text y={-52} textAnchor="middle" fill={NAVY} fontSize={28} fontWeight={800} letterSpacing={2}>
              RAISED SO FAR
            </text>
            <text y={30} textAnchor="middle" fill={RED} fontSize={raised >= 1_000_000 ? 60 : 76} fontWeight={900}>
              {formatMoney(raised)}
            </text>
            <text y={82} textAnchor="middle" fill={NAVY} fontSize={26} fontWeight={700}>
              {reached ? "GOAL REACHED!" : `${Math.round(pct * 100)}% of goal`}
            </text>
          </g>

          {/* Thank you banner */}
          <rect x={60} y={930} width={430} height={150} rx={10} fill={NAVY} />
          <text x={275} y={990} textAnchor="middle" fill="#ffffff" fontSize={30} fontWeight={800} letterSpacing={2}>
            THANK YOU FOR
          </text>
          <text x={275} y={1050} textAnchor="middle" fill="#ffffff" fontSize={46} fontWeight={700} fontStyle="italic">
            Your Support!
          </text>
        </g>

        {/* Footer ribbon */}
        <rect x={80} y={1200} width={CARD_WIDTH - 160} height={80} fill={NAVY} />
        <polygon points={`40,1240 80,1200 80,1280`} fill={NAVY_DARK} />
        <polygon points={`${CARD_WIDTH - 40},1240 ${CARD_WIDTH - 80},1200 ${CARD_WIDTH - 80},1280`} fill={NAVY_DARK} />
        <text x={CARD_WIDTH / 2} y={1236} textAnchor="middle" fill="#ffffff" fontSize={26} fontWeight={800} letterSpacing={3}>
          EVERY DONATION MAKES A DIFFERENCE
        </text>
        <text x={CARD_WIDTH / 2} y={1268} textAnchor="middle" fill={ROPE} fontSize={20} fontWeight={600}>
          {[ctaLabel, updatedLabel].filter(Boolean).join("   •   ")}
        </text>
      </svg>
    );
  }
);

export default FundProgressCard;
