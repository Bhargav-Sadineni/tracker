import { useState, useEffect } from 'react';
import { COLOR_PALETTE } from '../lib/constants';

export default function ColorPicker({
  value = '#6366f1',
  onChange,
  label = 'Color Tag',
  helperText,
}) {
  const [hexInput, setHexInput] = useState(
    (value || '#6366f1').replace(/^#/, '').toUpperCase()
  );

  // Sync internal hex input if parent value changes
  useEffect(() => {
    if (value) {
      setHexInput(value.replace(/^#/, '').toUpperCase());
    }
  }, [value]);

  const handleHexChange = (e) => {
    const raw = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6).toUpperCase();
    setHexInput(raw);
    if (raw.length === 6) {
      onChange('#' + raw);
    } else if (raw.length === 3) {
      // 3-digit shorthand #RGB -> #RRGGBB
      const full = raw.split('').map((ch) => ch + ch).join('');
      onChange('#' + full);
    }
  };

  const handleNativePicker = (e) => {
    const picked = e.target.value;
    setHexInput(picked.replace(/^#/, '').toUpperCase());
    onChange(picked);
  };

  const isValid7Hex = value && /^#[0-9a-fA-F]{6}$/.test(value);
  const isPresetSelected = COLOR_PALETTE.some(
    (c) => c.hex.toLowerCase() === (value || '').toLowerCase()
  );

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </label>
          {helperText && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500">{helperText}</p>
          )}
        </div>
        {/* Live Color Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
          <span
            className="w-3 h-3 rounded-full border border-black/10 dark:border-white/20 shadow-inner flex-shrink-0"
            style={{ backgroundColor: value || '#6366f1' }}
          />
          <span>{value ? value.toUpperCase() : '#6366F1'}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* Preset Palettes */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {COLOR_PALETTE.map((c) => {
            const isSelected = (value || '').toLowerCase() === c.hex.toLowerCase();
            return (
              <button
                key={c.hex}
                type="button"
                title={`${c.name} (${c.hex})`}
                onClick={() => {
                  setHexInput(c.hex.replace(/^#/, '').toUpperCase());
                  onChange(c.hex);
                }}
                style={{ backgroundColor: c.hex }}
                className={`h-7 w-7 rounded-full transition-all duration-150 flex items-center justify-center hover:scale-110 active:scale-95 ${
                  isSelected
                    ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-110 shadow-md'
                    : 'opacity-85 hover:opacity-100 hover:shadow-sm'
                }`}
              >
                {isSelected && (
                  <span className="text-white text-xs font-bold drop-shadow leading-none">✓</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Vertical divider */}
        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block mx-0.5" />

        {/* Manual Color Picker Controls */}
        <div className="flex items-center gap-2">
          {/* Native HTML5 Color Picker */}
          <label
            title="Click to open full color spectrum wheel"
            className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border cursor-pointer transition-all ${
              !isPresetSelected
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/30 font-semibold'
                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
            }`}
          >
            <div
              className="w-4 h-4 rounded-full border border-black/15 dark:border-white/20 shadow-inner flex-shrink-0"
              style={{ backgroundColor: value || '#6366f1' }}
            />
            <span className="text-xs font-semibold">Custom</span>
            <input
              type="color"
              value={isValid7Hex ? value : '#6366f1'}
              onChange={handleNativePicker}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
          </label>

          {/* Manual Hex Text Input */}
          <div className="flex items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition shadow-sm">
            <span className="text-xs font-mono font-bold text-slate-400 select-none mr-1">#</span>
            <input
              type="text"
              maxLength={6}
              value={hexInput}
              onChange={handleHexChange}
              placeholder="6366F1"
              title="Type or paste custom hex color (e.g. FF5733)"
              className="w-16 bg-transparent text-xs font-mono font-bold text-slate-800 dark:text-slate-100 uppercase focus:outline-none placeholder-slate-400 tracking-wider"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
