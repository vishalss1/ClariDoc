/**
 * ClariDoc Main Entry Point
 * Wires all modules on DOMContentLoaded
 */

import { initLocale } from './locale.js';
import { initIngest } from './ingest.js';
import { initTransform } from './transform.js';

document.addEventListener('DOMContentLoaded', () => {
  // Query DOM elements
  const docInput = document.getElementById('doc-input');
  const fileInput = document.getElementById('file-input');
  const languageSelect = document.getElementById('language-select');
  const audienceButtons = document.querySelectorAll('#audience-buttons button');
  const originalPanel = document.getElementById('original-panel');
  const outputPanel = document.getElementById('output-panel');

  // Initialize modules
  initLocale(languageSelect);
  initIngest(fileInput, docInput);
  initTransform(audienceButtons, languageSelect, docInput, originalPanel, outputPanel);

  console.log('ClariDoc initialized');
});
