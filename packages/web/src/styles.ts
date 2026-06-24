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
