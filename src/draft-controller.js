import { openModal, closeModal, getDraftModalHTML, getPublishModalHTML } from './ui-controller.js';
import { AuthManager } from './auth.js';

export const DraftController = {
    /* Opens the modal for a new draft (Orange Pin) */
    openDraftModal(lat, lng, mapManager, nostrService, journalManager) {
        if (mapManager && mapManager.map) mapManager.map.closePopup();
        openModal(getDraftModalHTML(lat, lng));

        const closeBtn = document.getElementById('btn-close-draft');
        if (closeBtn) closeBtn.onclick = () => closeModal();

        DraftController.initPhotoLogic();
        DraftController.initDraftLogic(lat, lng, nostrService, journalManager); /* Renamed from initSaveLogic */
    },

    /* Opens the modal for a direct Review (Violet Pin - PoP) */
    openReviewModal(lat, lng, mapManager, nostrService, journalManager) {
        if (mapManager && mapManager.map) mapManager.map.closePopup();
        openModal(getPublishModalHTML(lat, lng));

        const closeBtn = document.getElementById('btn-close-publish');
        if (closeBtn) closeBtn.onclick = () => closeModal();

        DraftController.initPublishPhotoLogic();
        DraftController.initPublishLogic(null, lat, lng, nostrService, journalManager);
    },

    /* Opens the modal to publish an existing draft (Rocket 🚀) */
    openPublishModal(eventId, lat, lng, mapManager, nostrService, journalManager) {
        if (mapManager && mapManager.map) mapManager.map.closePopup();
        
        const draftMarker = mapManager.markers.get(eventId);
        openModal(getPublishModalHTML(lat, lng));
        
        if (draftMarker) {
            const titleInput = document.getElementById('pub-title');
            const catSelect = document.getElementById('pub-category');
            if (titleInput) titleInput.value = draftMarker.titulo || "";
            if (catSelect) catSelect.value = draftMarker.categoria || "gastronomia";
        }

        const closeBtn = document.getElementById('btn-close-publish');
        if (closeBtn) closeBtn.onclick = () => closeModal();

        DraftController.initPublishPhotoLogic();
        DraftController.initPublishLogic(eventId, lat, lng, nostrService, journalManager);
    },

    /* Photo capture logic for the PUBLISH modal */
    initPublishPhotoLogic() {
        const fileInput = document.getElementById('pub-photo');
        const uploadZone = document.getElementById('pub-upload-zone');
        const previewContainer = document.getElementById('pub-preview-container');

        if (!uploadZone || !fileInput) return;

        uploadZone.onclick = () => fileInput.click();
        fileInput.onchange = (e) => {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const imgThumb = document.createElement('img');
                    imgThumb.src = event.target.result;
                    imgThumb.className = "preview-thumb-publish";
                    imgThumb.style.cssText = "width: 60px; height: 60px; object-fit: cover; border-radius: 8px; margin: 5px;";
                    if (previewContainer) previewContainer.appendChild(imgThumb);
                };
                reader.readAsDataURL(file);
            });
        };
    },

    /* Logic to send the final Kind 1 event to Nostr */
    initPublishLogic(eventId, lat, lng, nostrService, journalManager) {
        const btn = document.getElementById('btn-do-publish');
        if (!btn) return;

        btn.onclick = async () => {
            const title = document.getElementById('pub-title').value.trim();
            const desc = document.getElementById('pub-description').value.trim();
            const cat = document.getElementById('pub-category').value;

            if (!title) return showToast("Title is required", "error");

            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PUBLISHING...';
            btn.disabled = true;

            const publicEvent = {
                kind: 1,
                content: `${title}\n\n${desc}`,
                tags: [
                    ["t", "spatial_anchor"],
                    ["t", cat],
                    ["g", `${lat},${lng}`],
                    ["title", title],
                    ["p", AuthManager.userPubkey]
                ],
                created_at: Math.floor(Date.now() / 1000)
            };

            try {
                const success = await nostrService.publishEvent(publicEvent);
                if (success) {
                    /* If it comes from a draft, we clean it up */
                    if (eventId) { 
                        console.log("🗑️ Deleting draft anchor...");
                        await nostrService.deleteEvent(eventId); 
                        
                        const marker = journalManager.map.markers.get(eventId);                    
                        if (marker) {
                            journalManager.map.draftLayer.removeLayer(marker);
                            journalManager.map.markers.delete(eventId);
                        }
                        
                        /* Updated to use 'entries' instead of 'drafts' to match JournalManager */
                        journalManager.entries = journalManager.entries.filter(e => e.id !== eventId);
                    }
                    
                    showToast("🚀 Anchor successfully published!", "success");
                    closeModal();
                    
                    /* Updated to use 'syncJournal' instead of 'syncDrafts' */
                    setTimeout(() => journalManager.syncJournal(), 1000);
                }
            } catch (err) {
                console.error("Error publishing:", err);
                btn.disabled = false;
                btn.innerHTML = 'PUBLISH TO NOSTR';
            }
        };
    },

    /* Basic photo logic for drafts */
    initPhotoLogic() {
        const fileInput = document.getElementById('draft-photo');
        const uploadZone = document.getElementById('upload-zone');
        if (uploadZone && fileInput) uploadZone.onclick = () => fileInput.click();
    },

    /* Logic to save a Draft (Kind 30024) to the Journal */
    initDraftLogic(lat, lng, nostrService, journalManager) { /* Renamed from initSaveLogic */
        const btnSave = document.getElementById('btn-save-draft');
        if (!btnSave) return;

        btnSave.onclick = async () => {
            const titleInput = document.getElementById('draft-title');
            const categorySelect = document.getElementById('draft-category');
            
            const title = titleInput ? titleInput.value.trim() : "";
            const category = categorySelect ? categorySelect.value : "gastronomia";

            if (!title) {
                showToast("⚠️ Please enter a title for the draft", "error");
                return;
            }

            btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SAVING...';
            btnSave.disabled = true;

            try {
                const draftEvent = {
                    kind: 30024,
                    content: `Anchor Draft: ${title}`,
                    tags: [
                        ["d", `draft_${Date.now()}`],
                        ["title", title],
                        ["t", "spatial_anchor"],
                        ["t", category],
                        ["g", `${lat},${lng}`]
                    ],
                    created_at: Math.floor(Date.now() / 1000)
                };

                const success = await nostrService.publishEvent(draftEvent);

                if (success) {
                    /* Updated to use 'syncJournal' and entries list */
                    await journalManager.syncJournal(); 
                    showToast(`✅ "${title}" saved to your Journal`, "success");
                    closeModal();
                } else {
                    throw new Error("Relay rejected the event");
                }
            } catch (err) {
                console.error("Error saving draft:", err);
                showToast("❌ Could not save draft", "error");
                btnSave.disabled = false;
                btnSave.innerHTML = 'SAVE TO JOURNAL';
            }
        };
    }
};