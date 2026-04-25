import { streamTransform } from './api.js';
import { initIngest } from './ingest.js';
import { initLocale } from './locale.js';
import { appendChunk, finalizeRender, renderMarkdown, showSkeleton } from './render.js';

document.addEventListener('DOMContentLoaded', () => {
  const docInput = document.getElementById('doc-input');
  const fileInput = document.getElementById('file-input');
  const audienceButtons = Array.from(document.querySelectorAll('#audience-buttons button'));
  const languageSelect = document.getElementById('language-select');
  const transformBtn = document.getElementById('transform-btn');
  const loadingEl = document.getElementById('transform-loading');
  const outputSection = document.getElementById('transform-output-section');
  const originalPanel = document.getElementById('original-panel');
  const outputPanel = document.getElementById('output-panel');
  const copyBtn = document.getElementById('transform-copy-btn');
  const downloadBtn = document.getElementById('transform-download-btn');
  const toolShell = document.querySelector('.tool-shell');

  let activeAudience = 'junior';
  let transformedMarkdown = '';

  initLocale(languageSelect);
  initIngest(fileInput, docInput);
  originalPanel.innerHTML = '<p class="panel-hint">Original content will appear here after transform starts.</p>';
  setOutputActionsEnabled(copyBtn, downloadBtn, false);

  audienceButtons.forEach((button) => {
    button.addEventListener('click', () => {
      audienceButtons.forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');
      activeAudience = button.dataset.audience || 'junior';
    });
  });

  transformBtn?.addEventListener('click', async () => {
    const content = docInput.value.trim();
    if (!content) {
      alert('Please enter or upload documentation content');
      return;
    }

    transformBtn.disabled = true;
    transformBtn.textContent = 'Transforming...';
    loadingEl.classList.remove('hidden');
    toolShell?.classList.add('is-busy');
    outputSection.classList.remove('hidden');
    requestAnimationFrame(() => outputSection.classList.add('revealed'));
    outputPanel.classList.add('is-streaming');
    transformedMarkdown = '';
    setOutputActionsEnabled(copyBtn, downloadBtn, false);

    renderMarkdown(originalPanel, content);
    showSkeleton(outputPanel, 8);

    const outputBuffer = { current: '' };
    try {
      await streamTransform(
        {
          content,
          audience: activeAudience,
          target_language: languageSelect.value || 'English',
          source_language: 'English',
        },
        (chunk) => {
          appendChunk(outputPanel, chunk, outputBuffer);
          transformedMarkdown = outputBuffer.current;
          if (transformedMarkdown.trim()) {
            setOutputActionsEnabled(copyBtn, downloadBtn, true);
          }
        },
        () => {
          finalizeRender(outputPanel);
          outputPanel.classList.remove('is-streaming');
          transformedMarkdown = outputBuffer.current;
          setOutputActionsEnabled(copyBtn, downloadBtn, Boolean(transformedMarkdown.trim()));
        },
      );
    } catch (err) {
      outputPanel.innerHTML = `<p class="error-text">Error: ${escapeHtml(err.message)}</p>`;
      outputPanel.classList.remove('is-streaming');
      transformedMarkdown = '';
      setOutputActionsEnabled(copyBtn, downloadBtn, false);
    } finally {
      loadingEl.classList.add('hidden');
      toolShell?.classList.remove('is-busy');
      transformBtn.disabled = false;
      transformBtn.textContent = 'Transform';
    }
  });

  copyBtn?.addEventListener('click', async () => {
    if (!transformedMarkdown.trim()) return;
    const ok = await copyText(transformedMarkdown);
    if (ok) {
      const prev = copyBtn.textContent;
      copyBtn.textContent = 'Copied';
      setTimeout(() => {
        copyBtn.textContent = prev;
      }, 900);
    }
  });

  downloadBtn?.addEventListener('click', () => {
    if (!transformedMarkdown.trim()) return;
    downloadMarkdownFile('claridoc-transform-output.md', transformedMarkdown);
  });
});

function escapeHtml(input) {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
