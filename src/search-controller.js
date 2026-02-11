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

    /* Controls visibility of the 'X' clear button based on input length. */
    searchInput.addEventListener('input', () => {
        btnClear.style.display = searchInput.value.length > 0 ? 'block' : 'none';
    });

    /* Clears search results and resets the map selection state. */
    btnClear.addEventListener('click', () => {
        searchInput.value = '';
        btnClear.style.display = 'none';
        if (mapManager && typeof mapManager.clearSearchSelection === 'function') {
            mapManager.clearSearchSelection();
        }
        searchInput.focus();
    });
}