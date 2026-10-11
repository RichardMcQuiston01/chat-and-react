/** Returns the Shadow DOM stylesheet for the chat component. */
export function getStyles(): string {
  return `
:host {
  --car-bg: #f5f5f5;
  --car-bubble-bg: #ffffff;
  --car-bubble-user-bg: #0070f3;
  --car-accent: #0070f3;
  --car-radius: 8px;
  --car-font: system-ui, sans-serif;
}

.car-chat {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--car-bg);
  font-family: var(--car-font);
}

.car-page {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.car-bubble {
  background: var(--car-bubble-bg);
  border-radius: var(--car-radius);
  padding: 10px 14px;
  max-width: 80%;
  align-self: flex-start;
}

.car-bubble--user {
  background: var(--car-bubble-user-bg);
  color: #ffffff;
  align-self: flex-end;
}

.car-input-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.car-input {
  border: 1px solid #cccccc;
  border-radius: var(--car-radius);
  padding: 8px 10px;
  font-family: var(--car-font);
  font-size: 1rem;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}

.car-input[type="radio"],
.car-input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.car-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.car-option-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.4em;
  height: 1.4em;
  padding: 0 4px;
  border: 1px solid #cccccc;
  border-radius: 4px;
  font-size: 0.8rem;
  line-height: 1;
  color: #666666;
  box-sizing: border-box;
}

.car-bubble--fading {
  opacity: 0;
  transition: opacity 0.3s ease;
}

.car-bubble--user .car-edit {
  margin-left: 10px;
  padding: 0 4px;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  opacity: 0.7;
}

.car-bubble--user .car-edit:hover,
.car-bubble--user .car-edit:focus-visible {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .car-bubble--fading {
    transition: none;
  }
}

.car-input:focus {
  border-color: var(--car-accent);
}

.car-btn-submit {
  background: var(--car-accent);
  color: #ffffff;
  border: none;
  border-radius: var(--car-radius);
  padding: 8px 18px;
  font-size: 1rem;
  cursor: pointer;
  align-self: flex-end;
}
  `.trim();
}
