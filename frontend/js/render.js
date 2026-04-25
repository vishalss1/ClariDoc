/**
 * Render module - handles markdown rendering and stream output
 */

/**
 * Render markdown content to HTML
 * @param {HTMLElement} panel - The panel element to render into
 * @param {string} content - Markdown content to render
 */
export function renderMarkdown(panel, content) {
  if (window.marked) {
    panel.innerHTML = marked.parse(content);
  } else {
    panel.textContent = content;
  }
}

/**
 * Append a chunk to the output buffer and re-render
 * @param {HTMLElement} panel - The panel element
 * @param {string} chunk - New chunk content to append
 * @param {string} outputBuffer - Current output buffer (passed by reference via object)
 */
export function appendChunk(panel, chunk, outputBuffer) {
  outputBuffer.current += chunk;
  if (window.marked) {
    panel.innerHTML = marked.parse(outputBuffer.current);
  } else {
    panel.textContent = outputBuffer.current;
  }
  // Auto-scroll to bottom
  panel.scrollTop = panel.scrollHeight;
}

/**
 * Finalize render after stream ends
 * @param {HTMLElement} panel - The panel element
 */
export function finalizeRender(panel) {
  // Ensure final render is complete
  panel.scrollTop = panel.scrollHeight;
}
