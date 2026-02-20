/* --- 1. IMPORTS --- */
import { AppController } from './core/app-controller.js';
import { store } from './core/store.js';

/* Module Controllers */
import { DraftController } from './features/drafts/draft-controller.js';
import { UserActions } from './features/user/user-actions.js';
import { AuthManager } from './core/auth.js';

/* --- 2. BOOTSTRAP --- */
const app = new AppController();

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

/* --- 3. GLOBAL INTERFACE BRIDGES (Legacy Compatibility) --- */

window.centerMapAndOpenPopup = (eventId, lat, lng) => {
    import('./ui/ui-controller.js').then(ui => ui.closeModal());
    app.map.map.flyTo([lat, lng], 18, { animate: true, duration: 1.5 });

    const onMoveEnd = () => {
        setTimeout(() => {
            const marker = app.map.markers.get(eventId);
            if (marker) marker.openPopup();
            app.map.map.off('moveend', onMoveEnd);
        }, 100);
    };

    app.map.map.on('moveend', onMoveEnd);
};

window.openReviewModal = (lat, lng) => {
    DraftController.openReviewModal(lat, lng, app.map, app.nostr, app.journal);
};

window.openDraftModal = (lat, lng) => {
    DraftController.openDraftModal(lat, lng, app.map, app.nostr, app.journal);
};

window.fetchAndShowJournal = () => {
    app.journal.openJournal();
};

window.deleteEntry = (eventId) => {
    app.journal.deleteEntry(eventId);
};

window.completeAnchor = (eventId) => {
    const entry = app.journal.entries.find(e => e.id === eventId);
    if (entry) {
        const coords = entry.tags.find(t => t[0] === 'g')?.[1];
        if (coords) {
            const [lat, lng] = coords.split(',').map(Number);
            DraftController.openPublishModal(eventId, lat, lng, app.map, app.nostr, app.journal);
        }
    }
};

window.followUser = (pubkey, name) => {
    UserActions.followUser(pubkey, name);
};

window.zapUser = (pubkey, name, title) => {
    UserActions.zapUser(pubkey, name, title);
};

window.deleteAnchor = (eventId) => {
    UserActions.deleteAnchor(eventId, app.map, app.nostr, store.state.processedEvents);
};

/* --- 4. DIRECT DOM EVENTS (Buttons) --- */

document.getElementById('btn-quick-pop').onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!AuthManager.isLoggedIn()) {
        import('./ui/ui-controller.js').then(ui => ui.showToast("Log in to add new points", "error"));
        return;
    }

    const btn = e.currentTarget;
    const icon = btn.querySelector('i');
    const originalClass = "fas fa-map-pin";

    icon.className = "fas fa-spinner fa-spin";

    try {
        const pos = await app.map.getCurrentLocation();
        const lat = Number(pos.lat);
        const lng = Number(pos.lon);

        app.map.map.setView([lat, lng], 18);
        const tempMarker = app.map.addMarker('temp-pop', lat, lng, '', 'none', 'temp');

        tempMarker.bindPopup(`
            <div class="pop-decision-container">
                <strong>📍 Location Confirmed</strong>
                <p>How do you want to register this spot?</p>
                <div class="pop-btn-grid">
                    <button onclick="window.openReviewModal(${lat}, ${lng})" class="btn-pop-resena">📝 Review</button>
                    <button onclick="window.openDraftModal(${lat}, ${lng})" class="btn-pop-draft">💾 Draft</button>
                </div>
            </div>
        `, { closeButton: true, offset: [0, -10], closeOnClick: true }).openPopup();

    } catch (err) {
        console.error("PoP Error:", err);
    } finally {
        icon.className = originalClass;
    }
};

document.getElementById('btn-locate-me').onclick = async (e) => {
    e.stopPropagation();
    const icon = e.currentTarget.querySelector('i');
    app.map.clearSearchSelection();
    icon.className = "fas fa-spinner fa-spin";

    try {
        const pos = await app.map.getCurrentLocation();
        app.map.setView(pos.lat, pos.lon, 16);
        app.map.addMarker('temp-pop', pos.lat, pos.lon, '', 'none', 'temp').bindPopup('📍 You are here').openPopup();
    } catch (err) {
        console.error("Locate error:", err);
    } finally {
        icon.className = "fas fa-crosshairs";
    }
};