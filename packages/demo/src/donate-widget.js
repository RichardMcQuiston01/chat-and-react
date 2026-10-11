/**
 * Dismiss behaviour for the floating donate card.
 *
 * Deliberately tiny and dependency-free so it can be inlined in a <script> tag
 * on a static demo page.
 *
 * Persistence uses localStorage, wrapped in try/catch: Safari private mode and
 * some embedded webviews throw on access rather than returning null, and a
 * donation widget should never be the thing that breaks a demo.
 */
(function initDonateCard() {
  'use strict';

  var STORAGE_KEY = 'donate-card-dismissed';
  var card = document.getElementById('donateCard');
  if (!card) {
    return;
  }

  function readDismissed() {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === '1';
    } catch (error) {
      return false;
    }
  }

  function writeDismissed() {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch (error) {
      /* Non-fatal: the card just reappears next load. */
    }
  }

  if (readDismissed()) {
    card.hidden = true;
    return;
  }

  var dismissButton = card.querySelector('[data-donate-dismiss]');
  if (dismissButton) {
    dismissButton.addEventListener('click', function onDismiss() {
      card.hidden = true;
      writeDismissed();
    });
  }
})();
