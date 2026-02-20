import { CATEGORIAS } from '../../core/categories.js';

export function initFilters(mapManager) {
    const filterContainer = document.getElementById('filter-bar-container');
    const scrollRight = document.getElementById('btn-scroll-right');
    const scrollLeft = document.getElementById('btn-scroll-left');

    if (!filterContainer) return;

    /* Renders Category Chips from the categories definition. */
    CATEGORIAS.forEach(cat => {
        const chip = document.createElement('div');
        // Initial Tailwind Classes
        chip.className = 'px-5 py-2.5 bg-white/80 backdrop-blur border border-slate-100 rounded-full text-[11px] font-black text-slate-500 hover:bg-slate-100 transition-all cursor-pointer whitespace-nowrap shadow-sm uppercase tracking-wider active:scale-95';
        chip.textContent = cat.label;

        chip.onclick = () => toggleFilter(cat.id, chip, mapManager);
        filterContainer.appendChild(chip);
    });

    /* Updates scroll button visibility based on container position. */
    const checkScroll = () => {
        const scrollPos = filterContainer.scrollLeft;
        const maxScroll = filterContainer.scrollWidth - filterContainer.clientWidth;

        if (scrollLeft) {
            const isVisible = scrollPos > 10;
            scrollLeft.classList.toggle('opacity-0', !isVisible);
            scrollLeft.classList.toggle('invisible', !isVisible);
        }
        if (scrollRight) {
            const isVisible = scrollPos < maxScroll - 10;
            scrollRight.classList.toggle('opacity-0', !isVisible);
            scrollRight.classList.toggle('invisible', !isVisible);
        }
    };

    if (scrollRight && scrollLeft) {
        scrollRight.onclick = () => filterContainer.scrollBy({ left: 300, behavior: 'smooth' });
        scrollLeft.onclick = () => filterContainer.scrollBy({ left: -300, behavior: 'smooth' });
        filterContainer.onscroll = checkScroll;
        setTimeout(checkScroll, 500); // Wait for rendering
    }
}

/* Toggles visibility of map markers based on selected category. */
function toggleFilter(id, element, mapManager) {
    const isActive = element.getAttribute('data-active') === 'true';

    // Reset all chips
    document.querySelectorAll('#filter-bar-container div').forEach(c => {
        c.setAttribute('data-active', 'false');
        c.className = 'px-5 py-2.5 bg-white/80 backdrop-blur border border-slate-100 rounded-full text-[11px] font-black text-slate-500 hover:bg-slate-100 transition-all cursor-pointer whitespace-nowrap shadow-sm uppercase tracking-wider active:scale-95';
    });

    const filterToApply = isActive ? 'all' : id;

    if (!isActive) {
        element.setAttribute('data-active', 'true');
        // Active Styles
        element.className = 'px-5 py-2.5 bg-indigo-600 border-indigo-500 text-white rounded-full text-[11px] font-black transition-all cursor-pointer whitespace-nowrap shadow-lg shadow-indigo-100 uppercase tracking-widest active:scale-95';
    }

    /* Filters markers by comparing category and assigning to correct layers. */
    mapManager.markers.forEach((marker) => {
        const markerCategory = String(marker.category).toLowerCase().trim();
        const filterId = String(filterToApply).toLowerCase().trim();

        if (filterId === 'all' || markerCategory === filterId) {
            if (marker.markerType === 'draft') {
                marker.addTo(mapManager.draftLayer);
            } else if (marker.markerType === 'temp') {
                marker.addTo(mapManager.map);
            } else {
                marker.addTo(mapManager.publicLayer);
            }
        } else {
            marker.remove();
        }
    });
}