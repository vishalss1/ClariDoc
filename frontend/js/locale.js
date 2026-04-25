/**
 * Locale module - handles language dropdown initialization
 */

import { getLocale } from './api.js';

/**
 * Initialize the language dropdown on page load
 * @param {HTMLSelectElement} languageSelect - The language select element
 */
export async function initLocale(languageSelect) {
  try {
    const data = await getLocale();

    // Clear existing options
    languageSelect.innerHTML = '';

    // Populate with languages from API
    data.languages.forEach((lang, index) => {
      const option = document.createElement('option');
      option.value = lang;
      option.textContent = lang;
      // Default to English
      if (lang === 'English') {
        option.selected = true;
      }
      languageSelect.appendChild(option);
    });
  } catch (err) {
    console.error('Failed to load languages:', err);
    languageSelect.innerHTML = '<option value="">Error loading languages</option>';
  }
}
