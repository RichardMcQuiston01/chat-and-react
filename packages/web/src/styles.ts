/**
 * Returns the Shadow DOM stylesheet for the chat component.
 *
 * Consumers may theme the component via CSS custom properties on the host element.
 * Internal structure is exposed via `part` attributes for `::part()` overrides.
 */
export function getStyles(): string {
  return `
    :host {
      display: block;
      font-family: var(--chat-font, system-ui, sans-serif);
      height: 100%;
    }
    [part="container"] {
      background: var(--chat-bg, #f5f5f5);
      padding: var(--chat-spacing, 1rem);
      height: 100%;
      box-sizing: border-box;
      overflow-y: auto;
    }
    [part="message-list"] {
      display: flex;
      flex-direction: column;
      gap: var(--chat-spacing, 1rem);
    }
    [part="bubble-bot"] {
      background: var(--chat-bot-bubble-bg, #ffffff);
      border-radius: var(--chat-radius, 1rem);
      padding: 0.75rem 1rem;
      max-width: 80%;
      align-self: flex-start;
    }
    [part="bubble-user"] {
      background: var(--chat-user-bubble-bg, #0084ff);
      color: white;
      border-radius: var(--chat-radius, 1rem);
      padding: 0.75rem 1rem;
      max-width: 80%;
      align-self: flex-end;
    }
    [part="input-area"] {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.5rem 0;
    }
    [part="submit-btn"] {
      background: var(--chat-accent, #0084ff);
      color: white;
      border: none;
      border-radius: calc(var(--chat-radius, 1rem) / 2);
      padding: 0.5rem 1.25rem;
      cursor: pointer;
      align-self: flex-start;
      font: inherit;
    }
    [part="submit-btn"]:focus-visible {
      outline: 2px solid var(--chat-accent, #0084ff);
      outline-offset: 2px;
    }
    input[type="text"], textarea, select {
      border: 1px solid #ddd;
      border-radius: 0.5rem;
      padding: 0.5rem;
      font: inherit;
      width: 100%;
      box-sizing: border-box;
    }
    label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }
  `;
}
