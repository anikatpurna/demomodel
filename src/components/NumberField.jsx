import React from 'react';

export default function NumberField({ id, field, value, error, onChange }) {
  return (
    <div className="field">
      <label htmlFor={id}>{field.label}</label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={field.step}
        value={value}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${id}-err` : undefined}
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
