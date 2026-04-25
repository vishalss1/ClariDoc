/**
 * Transform module - handles audience selection and transform action
 */

import { streamTransform } from './api.js';
import { renderMarkdown, appendChunk, finalizeRender, showSkeleton } from './render.js';

/**
 * Initialize audience selector and transform button
 * @param {NodeList} buttons - Audience button elements
 * @param {HTMLSelectElement} languageSelect - Language dropdown
 * @param {HTMLTextAreaElement} textarea - Input textarea
 * @param {HTMLElement} originalPanel - Original content panel
 * @param {HTMLElement} outputPanel - Transformed output panel
 */
export function initTransform(buttons, languageSelect, textarea, originalPanel, outputPanel) {
  let activeAudience = 'junior';
  const flow = document.getElementById('clarify-view');
  const stepEls = Array.from(document.querySelectorAll('#transform-steps .flow-step'));
  const outputSection = document.getElementById('clarify-output-section');

  function setFlowState(state) {
    if (!flow) return;
    flow.classList.remove('idle', 'loading', 'active', 'streaming', 'done');
    flow.classList.add(state);
  }

  function setStep(activeStep) {
    stepEls.forEach((stepEl, index) => {
      const step = index + 1;
      stepEl.classList.toggle('active', step === activeStep);
      stepEl.classList.toggle('completed', step < activeStep);
    });
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Audience button click handlers
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons
      buttons.forEach(btn => btn.classList.remove('active'));
      // Add active class to clicked button
      button.classList.add('active');
      activeAudience = button.dataset.audience;
    });
  });

  // Transform button click handler
  const transformBtn = document.getElementById('transform-btn');
  let transformInFlight = false;
  if (transformBtn.dataset.boundClick === '1') {
    return;
  }
  transformBtn.dataset.boundClick = '1';
  transformBtn.addEventListener('click', async (event) => {
    event.preventDefault();
    if (transformInFlight) {
      return;
    }

    const content = textarea.value.trim();

    if (!content) {
      alert('Please enter or upload documentation content');
      return;
    }

    const targetLanguage = languageSelect.value || 'English';

    // Determine source language (simplified - default to English)
    const sourceLanguage = 'English';

    // Build transform payload
    const payload = {
      content: content,
      audience: activeAudience,
      target_language: targetLanguage,
      source_language: sourceLanguage,
    };

    setFlowState('loading');
    setStep(1);

    // Render original content
    renderMarkdown(originalPanel, content);

    // Stage transition: Input -> Processing -> Output
    await wait(120);
    setStep(2);
    showSkeleton(outputPanel, 7);
    if (outputSection) {
      outputSection.style.pointerEvents = 'none';
    }

    transformBtn.disabled = true;
    transformBtn.textContent = 'Processing...';
    transformInFlight = true;

    const outputBuffer = { current: '' };

    try {
      await wait(600);
      setStep(3);
      setFlowState('active');
      if (outputSection) {
        outputSection.style.pointerEvents = 'auto';
      }

      await streamTransform(
        payload,
        // onChunk callback
        (chunk) => {
          setFlowState('streaming');
          appendChunk(outputPanel, chunk, outputBuffer);
        },
        // onDone callback
        () => {
          finalizeRender(outputPanel);
          setFlowState('done');
          transformBtn.disabled = false;
          transformBtn.textContent = 'Transform';
          transformInFlight = false;
        }
      );
    } catch (err) {
      console.error('Transform error:', err);
      outputPanel.innerHTML = `<span style="color: var(--color-error)">Error: ${err.message}</span>`;
      setFlowState('idle');
      setStep(1);
      transformBtn.disabled = false;
      transformBtn.textContent = 'Transform';
      transformInFlight = false;
    }
  });
}
