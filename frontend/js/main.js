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
  const appSection = document.getElementById('app');
  const modeButtons = document.querySelectorAll('#mode-buttons button');
  const clarifyView = document.getElementById('clarify-view');
  const briefView = document.getElementById('brief-view');
  const navClarifyLink = document.getElementById('nav-clarify-link');
  const navBriefLink = document.getElementById('nav-brief-link');
  const navStartBtn = document.getElementById('nav-start-btn');
  const heroStartBtn = document.getElementById('hero-start-btn');
  const heroBriefBtn = document.getElementById('hero-brief-btn');
  const footerStartBtn = document.getElementById('footer-start-btn');
  const footerBriefBtn = document.getElementById('footer-brief-btn');

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

  function setMode(mode) {
    modeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    if (mode === 'brief') {
      clarifyView.classList.add('hidden');
      briefView.classList.remove('hidden');
    } else {
      briefView.classList.add('hidden');
      clarifyView.classList.remove('hidden');
    }
  }

  function goToMode(mode) {
    setMode(mode);
    if (appSection) {
      appSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  modeButtons.forEach(button => {
    button.addEventListener('click', () => {
      setMode(button.dataset.mode);
    });
  });

  navClarifyLink?.addEventListener('click', () => goToMode('clarify'));
  navBriefLink?.addEventListener('click', () => goToMode('brief'));
  navStartBtn?.addEventListener('click', () => goToMode('clarify'));
  heroStartBtn?.addEventListener('click', () => goToMode('clarify'));
  heroBriefBtn?.addEventListener('click', () => goToMode('brief'));
  footerStartBtn?.addEventListener('click', () => goToMode('clarify'));
  footerBriefBtn?.addEventListener('click', () => goToMode('brief'));

  console.log('ClariDoc initialized');
});
