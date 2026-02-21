import { AuthManager } from '../../core/auth.js';
import { CATEGORIES } from '../../core/categories.js';

export function initSearch(mapManager) {
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('btn-search');
    const btnClear = document.getElementById('btn-clear-search');

    if (!searchInput || !searchBtn || !btnClear) return;

    /* Logic to execute address search using mapManager. */
    async function executeSearch() {
        const query = searchInput.value.trim();
        if (!query) return;

        try {
            await mapManager.searchAddress(query);
            console.log(`Search successful: ${query}`);
        } catch (err) {
            window.showToast("📍 Sorry, we couldn't find that location", "error");
        }
    }

    searchBtn.onclick = executeSearch;

    searchInput.onkeypress = (e) => {
        if (e.key === 'Enter') executeSearch();
    };

    /* Controls visibility of the 'X' clear button using Tailwind classes. */
    searchInput.addEventListener('input', () => {
        const hasValue = searchInput.value.length > 0;
        btnClear.classList.toggle('hidden', !hasValue);
    });

    /* Clears search results and resets the map selection state. */
    btnClear.addEventListener('click', () => {
        searchInput.value = '';
        btnClear.classList.add('hidden');
        if (mapManager && typeof mapManager.clearSearchSelection === 'function') {
            mapManager.clearSearchSelection();
        }
        searchInput.focus();
    });
}