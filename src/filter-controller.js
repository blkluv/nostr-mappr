import { CATEGORIAS } from './categories.js';

export function initFilters(mapManager) {
    const filterContainer = document.getElementById('filter-bar-container');
    const scrollRight = document.getElementById('btn-scroll-right');
    const scrollLeft = document.getElementById('btn-scroll-left');

    if (!filterContainer) return;

    /* Renders Category Chips from the categories definition. */
    CATEGORIAS.forEach(cat => {
        const chip = document.createElement('div');
        chip.className = 'filter-chip';
        chip.textContent = cat.label;
        
        chip.onclick = () => toggleFilter(cat.id, chip, mapManager);
        filterContainer.appendChild(chip);
    });

    /* Updates scroll button visibility based on container position. */
    const checkScroll = () => {
        const scrollPos = filterContainer.scrollLeft;
        const maxScroll = filterContainer.scrollWidth - filterContainer.clientWidth;
        
        if (scrollLeft) {
            scrollLeft.style.opacity = scrollPos > 5 ? "1" : "0";
            scrollLeft.style.visibility = scrollPos > 5 ? "visible" : "hidden";
        }
        if (scrollRight) {
            const showRight = scrollPos < maxScroll - 5;
            scrollRight.style.opacity = showRight ? "1" : "0";
            scrollRight.style.visibility = showRight ? "visible" : "hidden";
        }
    };

    if (scrollRight && scrollLeft) {
        scrollRight.onclick = () => filterContainer.scrollBy({ left: 240, behavior: 'smooth' });
        scrollLeft.onclick = () => filterContainer.scrollBy({ left: -240, behavior: 'smooth' });
        filterContainer.onscroll = checkScroll;
        setTimeout(checkScroll, 300); 
    }
}

/* Toggles visibility of map markers based on selected category. */
function toggleFilter(id, element, mapManager) {
    const wasAlreadyActive = element.classList.contains('active');
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));

    const filterToApply = wasAlreadyActive ? 'all' : id;

    if (!wasAlreadyActive) {
        element.classList.add('active');
    }

    /* Filters markers by comparing category and assigning to correct layers. */
    mapManager.markers.forEach((marker) => {
        const markerCategory = String(marker.category).toLowerCase().trim();
        const filterId = String(filterToApply).toLowerCase().trim();

        if (filterId === 'all' || markerCategory === filterId) {
            if (marker.markerType === 'draft') {
                marker.addTo(mapManager.draftLayer);
            } else {
                marker.addTo(mapManager.publicLayer);
            }
        } else {
            marker.remove(); 
        }
    });
}