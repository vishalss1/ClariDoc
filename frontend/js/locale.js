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
    const languages = Array.isArray(data.languages) ? [...data.languages] : [];

    // Ensure Hinglish is always shown right after English in the dropdown.
    const englishIndex = languages.indexOf('English');
    const hinglishIndex = languages.indexOf('Hinglish');
    if (hinglishIndex !== -1) {
      languages.splice(hinglishIndex, 1);
    }
    if (englishIndex !== -1) {
      languages.splice(englishIndex + 1, 0, 'Hinglish');
    } else if (hinglishIndex === -1) {
      languages.unshift('Hinglish');
    }

    // Clear existing options
    languageSelect.innerHTML = '';

    // Populate with languages from API
    languages.forEach((lang) => {
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
