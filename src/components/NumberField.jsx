import React from 'react';

export default function NumberField({ id, field, value, error, onChange }) {
  const hintId = field.hint ? `${id}-hint` : undefined;
  const describedBy = [hintId, error ? `${id}-err` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{field.label}</label>
      {field.hint && <span className="hint" id={hintId}>{field.hint}</span>}
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={field.step}
        value={value}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={describedBy}
        onChange={(e) => onChange(field.key, e.target.value)}
      />
      {error && (
        <span className="error" id={`${id}-err`} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
