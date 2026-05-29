'use client';

import { useRef } from 'react';
import { extractDominantColors } from '@/lib/colors/extractFromImage';

export const PALETTE_DOT_COUNT = 5;

export default function ColorPalettePicker({
  colors = [],
  activeColor,
  onColorsChange,
  onSelectColor,
  showHint = false,
}) {
  const colorInputRef = useRef(null);
  const display = colors.filter(Boolean).slice(0, PALETTE_DOT_COUNT);

  return (
    <div className="admin-palette-picker">
      <div className="admin-palette-dots">
        {display.map((hex, idx) => (
          <button
            key={`${hex}-${idx}`}
            type="button"
            className={`admin-palette-dot ${activeColor === hex ? 'active' : ''}`}
            style={{ backgroundColor: hex }}
            title={hex}
            aria-label={`Aplicar cor ${hex}`}
            onClick={() => onSelectColor(hex)}
          />
        ))}
        <button
          type="button"
          className="admin-palette-dot admin-palette-dot-add"
          title="Escolher cor personalizada"
          aria-label="Adicionar cor personalizada"
          onClick={() => colorInputRef.current?.click()}
        >
          +
        </button>
        <input
          ref={colorInputRef}
          type="color"
          className="admin-palette-hidden-color"
          value={activeColor || '#610C27'}
          onChange={(e) => {
            const hex = e.target.value;
            const next = [...colors.filter(Boolean)];
            if (!next.includes(hex)) next.unshift(hex);
            onColorsChange(next.slice(0, PALETTE_DOT_COUNT));
            onSelectColor(hex);
          }}
        />
      </div>
      {showHint ? (
        <p className="admin-help-text admin-palette-hint">
          Clique em uma bolinha para aplicar ao cardápio.
        </p>
      ) : null}
    </div>
  );
}

export async function extractPaletteFromLogoUrl(logoUrl) {
  return extractDominantColors(logoUrl, PALETTE_DOT_COUNT);
}
