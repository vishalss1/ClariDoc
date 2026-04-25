/**
 * Ingest module - handles file upload and paste content
 */

import { postIngest } from './api.js';

/**
 * Initialize file upload handling
 * @param {HTMLInputElement} fileInput - The file input element
 * @param {HTMLTextAreaElement} textarea - The textarea to populate
 */
export function initIngest(fileInput, textarea) {
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['.md', '.txt'];
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();

    if (!validTypes.includes(fileExt)) {
      alert('Please upload a .md or .txt file');
      fileInput.value = '';
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      textarea.value = 'Loading...';
      const result = await postIngest(formData);
      textarea.value = result.content;
    } catch (err) {
      console.error('Ingest error:', err);
      textarea.value = `Error loading file: ${err.message}`;
    } finally {
      fileInput.value = ''; // Reset input
    }
  });
}
