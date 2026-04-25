/**
 * Transform module - handles audience selection and transform action
 */

import { streamTransform } from './api.js';

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
  transformBtn.addEventListener('click', async () => {
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

    // Render original content
    if (window.marked) {
      originalPanel.innerHTML = marked.parse(content);
    } else {
      originalPanel.textContent = content;
    }

    // Clear output panel
    outputPanel.innerHTML = '';
    transformBtn.disabled = true;
    transformBtn.textContent = 'Transforming...';

    let outputBuffer = '';

    try {
      await streamTransform(
        payload,
        // onChunk callback
        (chunk) => {
          outputBuffer += chunk;
          if (window.marked) {
            outputPanel.innerHTML = marked.parse(outputBuffer);
          } else {
            outputPanel.textContent = outputBuffer;
          }
          // Auto-scroll to bottom
          outputPanel.scrollTop = outputPanel.scrollHeight;
        },
        // onDone callback
        () => {
          transformBtn.disabled = false;
          transformBtn.textContent = 'Transform';
        }
      );
    } catch (err) {
      console.error('Transform error:', err);
      outputPanel.innerHTML = `<span style="color: var(--color-error)">Error: ${err.message}</span>`;
      transformBtn.disabled = false;
      transformBtn.textContent = 'Transform';
    }
  });
}
