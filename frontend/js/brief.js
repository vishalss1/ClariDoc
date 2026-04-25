/**
 * Brief mode module - handles analyze -> context file loop -> generate briefing
 */

import { analyzeBrief, streamBrief } from './api.js';
import { appendChunk, finalizeRender, renderMarkdown, showSkeleton } from './render.js';

/**
 * Initialize Brief mode interactions
 * @param {HTMLTextAreaElement} goalInput
 * @param {NodeList} audienceButtons
 * @param {HTMLSelectElement} languageSelect
 * @param {HTMLTextAreaElement} docTextarea
 * @param {HTMLElement} gapPanel
 * @param {HTMLElement} fileLoop
 * @param {HTMLElement} briefingPanel
 * @param {HTMLButtonElement} analyzeBtn
 * @param {HTMLButtonElement} generateBtn
 */
export function initBrief(
  goalInput,
  audienceButtons,
  languageSelect,
  docTextarea,
  gapPanel,
  fileLoop,
  briefingPanel,
  analyzeBtn,
  generateBtn
) {
  let activeAudience = 'junior';
  let lastReport = null;
  const step1 = document.getElementById('brief-step-1');
  const step2 = document.getElementById('brief-step-2');
  const step3 = document.getElementById('brief-step-3');
  const step4 = document.getElementById('brief-step-4');

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function markStepActive(stepEl) {
    [step1, step2, step3, step4].forEach(el => {
      if (!el) return;
      el.classList.remove('active-step');
    });
    stepEl?.classList.add('active-step');
  }

  audienceButtons.forEach(button => {
    button.addEventListener('click', () => {
      audienceButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      activeAudience = button.dataset.audience;
    });
  });

  goalInput.addEventListener('input', () => {
    if (!step1) return;
    step1.classList.toggle('has-content', goalInput.value.trim().length > 0);
  });

  analyzeBtn.addEventListener('click', async () => {
    const goal = goalInput.value.trim();
    const doc = docTextarea.value.trim();
    const targetLanguage = languageSelect.value || 'English';

    if (!goal) {
      alert('Please enter a goal');
      return;
    }

    if (!doc) {
      alert('Please paste documentation content');
      return;
    }

    if (step1) {
      step1.classList.add('has-content');
    }
    markStepActive(step2);

    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Analyzing...';
    generateBtn.disabled = true;
    lastReport = null;
    showSkeleton(gapPanel, 6);
    showSkeleton(fileLoop, 4);

    try {
      const report = await analyzeBrief({
        goal,
        audience: activeAudience,
        doc,
        target_language: targetLanguage,
      });

      await wait(300);
      lastReport = report;
      renderGapReport(gapPanel, report);
      renderRequestedFiles(fileLoop, report.requested_files || []);
      markStepActive(step3);
      generateBtn.disabled = false;
    } catch (err) {
      gapPanel.innerHTML = `<p class="error-text">Error: ${escapeHtml(err.message)}</p>`;
      fileLoop.innerHTML = 'Requested files will appear here after analysis.';
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = 'Analyze Gaps';
    }
  });

  generateBtn.addEventListener('click', async () => {
    if (!lastReport) {
      return;
    }

    const goal = goalInput.value.trim();
    const doc = docTextarea.value.trim();
    const targetLanguage = languageSelect.value || 'English';
    const contextFiles = collectContextFiles(fileLoop);

    markStepActive(step4);
    const payload = {
      goal,
      audience: activeAudience,
      doc,
      target_language: targetLanguage,
      context_files: contextFiles,
    };

    showSkeleton(briefingPanel, 7);
    const outputBuffer = { current: '' };

    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';

    try {
      await streamBrief(
        payload,
        (chunk) => appendChunk(briefingPanel, chunk, outputBuffer),
        () => {
          finalizeRender(briefingPanel);
          generateBtn.disabled = false;
          generateBtn.textContent = 'Generate Briefing';
        }
      );
    } catch (err) {
      briefingPanel.innerHTML = `<p class="error-text">Error: ${escapeHtml(err.message)}</p>`;
      generateBtn.disabled = false;
      generateBtn.textContent = 'Generate Briefing';
    }
  });
}

function renderGapReport(panel, report) {
  const covered = (report.covered || [])
    .map((item, i) => `<div class="brief-gap-card" style="animation-delay:${i * 70}ms;"><strong>Covered</strong><p>${escapeHtml(item)}</p></div>`)
    .join('');
  const gaps = (report.gaps || [])
    .map((item, i) => `<div class="brief-gap-card" style="animation-delay:${(i + 1) * 70}ms;"><strong>Gap</strong><p>${escapeHtml(item)}</p></div>`)
    .join('');
  const requested = (report.requested_files || [])
    .map((file, i) => `<div class="brief-gap-card" style="animation-delay:${(i + 2) * 70}ms;"><strong>${escapeHtml(file.filename || '')}</strong><p>${escapeHtml(file.reason || '')}</p></div>`)
    .join('');

  panel.innerHTML = `
    <section class="brief-report-section">
      <h4>Covered</h4>
      ${covered || '<p>No covered items returned.</p>'}
    </section>
    <section class="brief-report-section">
      <h4>Gaps</h4>
      ${gaps || '<p>No gaps returned.</p>'}
    </section>
    <section class="brief-report-section">
      <h4>Requested Files</h4>
      ${requested || '<p>No additional files requested.</p>'}
    </section>
  `;
}

function renderRequestedFiles(panel, requestedFiles) {
  if (!requestedFiles.length) {
    panel.innerHTML = '<p>No additional context files requested. You can generate immediately.</p>';
    return;
  }

  panel.innerHTML = requestedFiles
    .map((file, index) => {
      const filename = file.filename || `context_file_${index + 1}`;
      const reason = file.reason || '';
      return `
        <div class="context-file-item" style="animation-delay:${index * 70}ms;">
          <label class="context-file-label" for="context-file-${index}">
            ${escapeHtml(filename)}
          </label>
          <p class="context-file-reason">${escapeHtml(reason)}</p>
          <textarea
            id="context-file-${index}"
            class="context-file-textarea"
            data-filename="${escapeAttribute(filename)}"
            placeholder="Paste file content for ${escapeHtml(filename)}..."
          ></textarea>
        </div>
      `;
    })
    .join('');
}

function collectContextFiles(panel) {
  const textareas = panel.querySelectorAll('.context-file-textarea');
  const files = [];

  textareas.forEach(textarea => {
    const content = textarea.value.trim();
    if (!content) {
      return;
    }

    files.push({
      filename: textarea.dataset.filename || '',
      content,
    });
  });

  return files;
}

function escapeHtml(input) {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(input) {
  return escapeHtml(input).replace(/`/g, '&#96;');
}
