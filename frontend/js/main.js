/**
 * ClariDoc Main Entry Point
 * Wires all modules on DOMContentLoaded
 */

import { initLocale } from './locale.js';
import { initIngest } from './ingest.js';
import { initTransform } from './transform.js';
import { initBrief } from './brief.js';

document.addEventListener('DOMContentLoaded', () => {
  // Query DOM elements
  const modeButtons = document.querySelectorAll('#mode-buttons button');
  const clarifyView = document.getElementById('clarify-view');
  const briefView = document.getElementById('brief-view');

  const docInput = document.getElementById('doc-input');
  const fileInput = document.getElementById('file-input');
  const languageSelect = document.getElementById('language-select');
  const audienceButtons = document.querySelectorAll('#audience-buttons button');
  const originalPanel = document.getElementById('original-panel');
  const outputPanel = document.getElementById('output-panel');

  const briefGoal = document.getElementById('brief-goal');
  const briefDoc = document.getElementById('brief-doc');
  const briefAudienceButtons = document.querySelectorAll('#brief-audience-buttons button');
  const briefLanguageSelect = document.getElementById('brief-language-select');
  const briefGapPanel = document.getElementById('brief-gap-panel');
  const briefFileLoop = document.getElementById('brief-file-loop');
  const briefingPanel = document.getElementById('briefing-panel');
  const briefAnalyzeBtn = document.getElementById('brief-analyze-btn');
  const briefGenerateBtn = document.getElementById('brief-generate-btn');

  // Initialize modules
  initLocale(languageSelect);
  initLocale(briefLanguageSelect);
  initIngest(fileInput, docInput);
  initTransform(audienceButtons, languageSelect, docInput, originalPanel, outputPanel);
  initBrief(
    briefGoal,
    briefAudienceButtons,
    briefLanguageSelect,
    briefDoc,
    briefGapPanel,
    briefFileLoop,
    briefingPanel,
    briefAnalyzeBtn,
    briefGenerateBtn
  );

  modeButtons.forEach(button => {
    button.addEventListener('click', () => {
      modeButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      const mode = button.dataset.mode;
      if (mode === 'brief') {
        clarifyView.classList.add('hidden');
        briefView.classList.remove('hidden');
      } else {
        briefView.classList.add('hidden');
        clarifyView.classList.remove('hidden');
      }
    });
  });

  console.log('ClariDoc initialized');
});
