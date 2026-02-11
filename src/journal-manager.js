import { AuthManager } from './auth.js';
import { openModal, closeModal, getJournalModalHTML, getConfirmModalHTML } from './ui-controller.js';
import { showToast } from './ui-controller.js';

/* JournalManager: Handles the logic for the user's personal logbook, managing both public anchors and drafts. */
export class JournalManager {
    constructor(mapManager, nostrService) {
        this.map = mapManager;
        this.nostr = nostrService;
        this.entries = []; 
        this.isSyncing = false;
    }

    /* Synchronizes logbook entries from the network and renders them on the map. */
    async syncJournal() { 
        if (!AuthManager.isLoggedIn() || this.isSyncing) return; 

        this.isSyncing = true;
        
        const filters = {
            kinds: [1, 30024], 
            authors: [AuthManager.userPubkey],
            "#t": ["spatial_anchor"]
        };

        try {
            const newEvents = await this.nostr.fetchEvents(filters);
            
            /* Check for actual changes: only process if the count differs. */
            if (newEvents.length === this.entries.length) {
                this.isSyncing = false;
                return; 
            }

            this.entries = newEvents.sort((a, b) => b.created_at - a.created_at);
            this.map.clearDraftLayers(); 
            this.entries.forEach(event => this.renderEntry(event)); 
            
        } catch (err) {
            console.error("Journal sync error", err);
        } finally {
            this.isSyncing = false;
        }
    }

    /* Renders a single journal entry on the map using the MapManager logic. */
    renderEntry(event) { 
        const coordsTag = event.tags.find(t => t[0] === 'g')?.[1];
        if (!coordsTag) return;

        const [lat, lng] = coordsTag.split(',');
        const category = event.tags.find(t => t[0] === 't' && t[1] !== 'spatial_anchor')?.[1] || 'all';

        const profile = AuthManager.profileCache[event.pubkey] || null;

        const isDraft = event.kind === 30024;
        const popupHTML = this.map.createPopupHTML(event, profile, category, isDraft);

        const type = isDraft ? 'draft' : 'public';
        this.map.addMarker(event.id, parseFloat(lat), parseFloat(lng), popupHTML, category, type);
    }

    /* Opens the journal modal with current data and updates content in background. */
    async openJournal() {
        if (!AuthManager.isLoggedIn()) {
            showToast("🔑 You must connect your Nostr identity.", "error");
            return;
        }

        /* 1. Initial render with local data. */
        openModal(getJournalModalHTML(this.entries));
        
        /* 2. Background synchronization. */
        await this.syncJournal(); 
        
        /* 3. Re-render only if modal is still open and data has updated. */
        const modalContent = document.getElementById('modal-content');
        if (modalContent) {
            modalContent.innerHTML = getJournalModalHTML(this.entries);
            this.setupJournalEvents();
        }
    }

    /* Sets up the event listeners for the journal modal UI. */
    setupJournalEvents() {
        const closeBtn = document.getElementById('btn-close-journal');
        if (closeBtn) closeBtn.onclick = () => closeModal();
    }

    /* Deletes an entry (Kind 5) and removes its visual representation from the map. */
    async deleteEntry(eventId) { 
        const performDelete = async () => {
            const success = await this.nostr.deleteEvent(eventId);
            
            if (success) {
                const marker = this.map.markers.get(eventId);
                if (marker) {
                    this.map.draftLayer.removeLayer(marker);
                    this.map.publicLayer.removeLayer(marker);
                    this.map.markers.delete(eventId);
                }
                
                this.entries = this.entries.filter(entry => entry.id !== eventId);
                showToast("🗑️ Deleted successfully", "success");
                
                this.openJournal(); 
            } else {
                showToast("❌ Could not process deletion", "error");
            }
        };

        openModal(getConfirmModalHTML(
            "Do you want to permanently delete this anchor? This will send a deletion request to the relays.", 
            performDelete
        ));
    }
}