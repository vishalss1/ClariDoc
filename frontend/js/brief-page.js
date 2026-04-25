import { analyzeBrief, streamBrief } from './api.js';
import { initIngest } from './ingest.js';
import { initLocale } from './locale.js';
import { appendChunk, finalizeRender, showSkeleton } from './render.js';

document.addEventListener('DOMContentLoaded', () => {
  const goalInput = document.getElementById('brief-goal');
  const docInput = document.getElementById('brief-doc');
  const fileInput = document.getElementById('brief-file-input');
  const audienceButtons = Array.from(document.querySelectorAll('#brief-audience-buttons button'));
  const languageSelect = document.getElementById('brief-language-select');
  const analyzeBtn = document.getElementById('brief-analyze-btn');
  const generateBtn = document.getElementById('brief-generate-btn');
  const copyBtn = document.getElementById('brief-copy-btn');
  const downloadBtn = document.getElementById('brief-download-btn');

  const processingEl = document.getElementById('brief-processing');
  const step1 = document.getElementById('brief-step-1');
  const step2 = document.getElementById('brief-step-2');
  const step3 = document.getElementById('brief-step-3');
  const stepIndicator = document.getElementById('brief-step-indicator');
  const gapPanel = document.getElementById('brief-gap-panel');
  const fileLoop = document.getElementById('brief-file-loop');
  const briefingPanel = document.getElementById('briefing-panel');
  const toolShell = document.querySelector('.tool-shell');

  let activeAudience = 'junior';
  let analyzed = false;
  let briefingMarkdown = '';

  initLocale(languageSelect);
  initIngest(fileInput, docInput);
  setOutputActionsEnabled(copyBtn, downloadBtn, false);

  audienceButtons.forEach((button) => {
    button.addEventListener('click', () => {
      audienceButtons.forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');
      activeAudience = button.dataset.audience || 'junior';
    });
  });

  analyzeBtn?.addEventListener('click', async () => {
    const goal = goalInput.value.trim();
    const doc = docInput.value.trim();

    if (!goal || !doc) {
      alert('Please provide goal and documentation.');
      return;
    }

    analyzed = false;
    briefingMarkdown = '';
    setOutputActionsEnabled(copyBtn, downloadBtn, false);
    generateBtn.disabled = true;
    hideStep(step3);
    briefingPanel.innerHTML = '';
    showStep(step1);
    showStep(step2);
    setActiveStep(1, stepIndicator);
    processingEl.classList.remove('hidden');
    toolShell?.classList.add('is-busy');
    showSkeleton(gapPanel, 6);
    showSkeleton(fileLoop, 4);

    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Analyzing...';

    try {
      const report = await analyzeBrief({
        goal,
        audience: activeAudience,
        doc,
        target_language: languageSelect.value || 'English',
      });

      renderGapReport(gapPanel, report);
      renderRequestedFiles(fileLoop, report.requested_files || []);
      analyzed = true;
      generateBtn.disabled = false;
      setActiveStep(2, stepIndicator);
    } catch (err) {
      gapPanel.innerHTML = `<p class="error-text">Error: ${escapeHtml(err.message)}</p>`;
      fileLoop.innerHTML = '';
    } finally {
      processingEl.classList.add('hidden');
      toolShell?.classList.remove('is-busy');
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = 'Analyze';
    }
  });

  generateBtn?.addEventListener('click', async () => {
    if (!analyzed) return;

    const goal = goalInput.value.trim();
    const doc = docInput.value.trim();
    const outputBuffer = { current: '' };
    const contextFiles = collectContextFiles(fileLoop);
    briefingMarkdown = '';
    setOutputActionsEnabled(copyBtn, downloadBtn, false);

    showStep(step3);
    setActiveStep(3, stepIndicator);
    showSkeleton(briefingPanel, 8);
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';
    processingEl.classList.remove('hidden');
    toolShell?.classList.add('is-busy');
    briefingPanel.classList.add('is-streaming');

    try {
      await streamBrief(
        {
          goal,
          audience: activeAudience,
          doc,
          target_language: languageSelect.value || 'English',
          context_files: contextFiles,
        },
        (chunk) => {
          appendChunk(briefingPanel, chunk, outputBuffer);
          briefingMarkdown = outputBuffer.current;
          if (briefingMarkdown.trim()) {
            setOutputActionsEnabled(copyBtn, downloadBtn, true);
          }
        },
        () => {
          finalizeRender(briefingPanel);
          briefingPanel.classList.remove('is-streaming');
          briefingMarkdown = outputBuffer.current;
          setOutputActionsEnabled(copyBtn, downloadBtn, Boolean(briefingMarkdown.trim()));
        },
      );
    } catch (err) {
      briefingPanel.innerHTML = `<p class="error-text">Error: ${escapeHtml(err.message)}</p>`;
      briefingPanel.classList.remove('is-streaming');
      briefingMarkdown = '';
      setOutputActionsEnabled(copyBtn, downloadBtn, false);
    } finally {
      processingEl.classList.add('hidden');
      toolShell?.classList.remove('is-busy');
      generateBtn.disabled = false;
      generateBtn.textContent = 'Generate Briefing';
    }
  });

  copyBtn?.addEventListener('click', async () => {
    if (!briefingMarkdown.trim()) return;
    const ok = await copyText(briefingMarkdown);
    if (ok) {
      const prev = copyBtn.textContent;
      copyBtn.textContent = 'Copied';
      setTimeout(() => {
        copyBtn.textContent = prev;
      }, 900);
    }
  });

  downloadBtn?.addEventListener('click', () => {
    if (!briefingMarkdown.trim()) return;
    downloadMarkdownFile('claridoc-brief-output.md', briefingMarkdown);
  });
});

function renderGapReport(panel, report) {
  const covered = (report.covered || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  const gaps = (report.gaps || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  const requested = (report.requested_files || [])
    .map((file) => `<li><strong>${escapeHtml(file.filename || '')}</strong>: ${escapeHtml(file.reason || '')}</li>`)
    .join('');

  panel.innerHTML = `
<h4>Covered</h4>
${covered ? `<ul>${covered}</ul>` : '<p>No covered items returned.</p>'}
<h4>Gaps</h4>
${gaps ? `<ul>${gaps}</ul>` : '<p>No gaps returned.</p>'}
<h4>Requested Files</h4>
${requested ? `<ul>${requested}</ul>` : '<p>No additional files requested.</p>'}
`;
}

function renderRequestedFiles(panel, requestedFiles) {
  if (!requestedFiles.length) {
    panel.innerHTML = '<p>No additional context files requested.</p>';
    return;
  }

  panel.innerHTML = requestedFiles.map((file, index) => `
<div class="context-file-item">
  <label class="context-file-label" for="context-file-${index}">${escapeHtml(file.filename || `context_${index + 1}`)}</label>
  <p class="context-file-reason">${escapeHtml(file.reason || '')}</p>
  <textarea
    id="context-file-${index}"
    class="context-file-textarea"
    data-filename="${escapeAttribute(file.filename || `context_${index + 1}`)}"
    placeholder="Paste file content..."
  ></textarea>
</div>
`).join('');
}

function collectContextFiles(panel) {
  const textareas = panel.querySelectorAll('.context-file-textarea');
  const files = [];
  textareas.forEach((textarea) => {
    const content = textarea.value.trim();
    if (!content) return;
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

function showStep(stepEl) {
  stepEl.classList.remove('hidden');
  requestAnimationFrame(() => stepEl.classList.add('revealed'));
}

function hideStep(stepEl) {
  stepEl.classList.remove('revealed');
  stepEl.classList.add('hidden');
}

function setActiveStep(step, indicatorEl) {
  if (!indicatorEl) return;
  const chips = indicatorEl.querySelectorAll('[data-step-indicator]');
  chips.forEach((chip) => {
    chip.classList.toggle('active', Number(chip.dataset.stepIndicator) === step);
  });
}

function setOutputActionsEnabled(copyBtn, downloadBtn, enabled) {
  if (copyBtn) copyBtn.disabled = !enabled;
  if (downloadBtn) downloadBtn.disabled = !enabled;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const fallback = document.createElement('textarea');
    fallback.value = text;
    fallback.style.position = 'fixed';
    fallback.style.opacity = '0';
    document.body.appendChild(fallback);
    fallback.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(fallback);
    return ok;
  }
}

function downloadMarkdownFile(filename, content) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
