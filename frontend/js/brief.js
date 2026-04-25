/**
 * Brief mode module - handles analyze -> context file loop -> generate briefing
 */

import { analyzeBrief, streamBrief } from './api.js';
import { appendChunk, finalizeRender, renderMarkdown } from './render.js';

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

  audienceButtons.forEach(button => {
    button.addEventListener('click', () => {
      audienceButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      activeAudience = button.dataset.audience;
    });
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

    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Analyzing...';
    generateBtn.disabled = true;
    lastReport = null;

    try {
      const report = await analyzeBrief({
        goal,
        audience: activeAudience,
        doc,
        target_language: targetLanguage,
      });

      lastReport = report;
      renderGapReport(gapPanel, report);
      renderRequestedFiles(fileLoop, report.requested_files || []);
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

    const payload = {
      goal,
      audience: activeAudience,
      doc,
      target_language: targetLanguage,
      context_files: contextFiles,
    };

    renderMarkdown(briefingPanel, '');
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
  const covered = (report.covered || []).map(item => `<li>${escapeHtml(item)}</li>`).join('');
  const gaps = (report.gaps || []).map(item => `<li>${escapeHtml(item)}</li>`).join('');
  const requested = (report.requested_files || [])
    .map(
      file => `<li><strong>${escapeHtml(file.filename || '')}</strong><br><span>${escapeHtml(file.reason || '')}</span></li>`
    )
    .join('');

  panel.innerHTML = `
    <section class="brief-report-section">
      <h4>Covered</h4>
      ${covered ? `<ul>${covered}</ul>` : '<p>No covered items returned.</p>'}
    </section>
    <section class="brief-report-section">
      <h4>Gaps</h4>
      ${gaps ? `<ul>${gaps}</ul>` : '<p>No gaps returned.</p>'}
    </section>
    <section class="brief-report-section">
      <h4>Requested Files</h4>
      ${requested ? `<ul>${requested}</ul>` : '<p>No additional files requested.</p>'}
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
        <div class="context-file-item">
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
