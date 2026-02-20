import { openModal, closeModal, getDraftModalHTML, getPublishModalHTML, showToast } from '../../ui/ui-controller.js';
import { AuthManager } from '../../core/auth.js';
import { ImageService } from '../../utils/image-service.js';

export const DraftController = {
    /* Array to store files locally before upload */
    selectedFiles: [],

    /* Opens the modal for a new draft (Orange Pin) */
    openDraftModal(lat, lng, mapManager, nostrService, journalManager) {
        if (mapManager && mapManager.map) mapManager.map.closePopup();
        openModal(getDraftModalHTML(lat, lng));

        DraftController.initPhotoLogic();
        DraftController.initDraftLogic(lat, lng, nostrService, journalManager);
    },

    /* Opens the modal for a direct Review (Violet Pin - PoP) */
    openReviewModal(lat, lng, mapManager, nostrService, journalManager) {
        if (mapManager && mapManager.map) mapManager.map.closePopup();
        openModal(getPublishModalHTML(lat, lng));

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

        DraftController.initPublishPhotoLogic();
        DraftController.initPublishLogic(eventId, lat, lng, nostrService, journalManager);
    },

    /* Minimalist logic for file selection with dedicated IDs to avoid conflicts */
    initPhotoLogic() {
        const zone = document.getElementById('draft-upload-zone');
        const input = document.getElementById('draft-photo');
        const previewContainer = document.getElementById('draft-preview-container');

        if (!zone || !input) return;

        DraftController.selectedFiles = [];
        zone.onclick = () => input.click();

        input.onchange = () => {
            const files = Array.from(input.files);
            files.forEach(file => {
                DraftController.selectedFiles.push(file);
                const thumb = document.createElement('div');
                thumb.className = 'relative w-16 h-16 group';

                thumb.innerHTML = `
                    <img src="${URL.createObjectURL(file)}" class="w-full h-full object-cover rounded-xl border border-slate-100 shadow-sm">
                    <span class="absolute -top-1.5 -right-1.5 bg-slate-900 text-white rounded-full w-5 h-5 flex items-center justify-center cursor-pointer text-[10px] font-black border-2 border-white shadow-md hover:scale-110 transition-transform">✕</span>
                `;

                thumb.querySelector('span').onclick = (e) => {
                    e.stopPropagation();
                    DraftController.selectedFiles = DraftController.selectedFiles.filter(f => f !== file);
                    thumb.remove();
                };
                if (previewContainer) previewContainer.appendChild(thumb);
            });
            input.value = '';
        };
    },

    initPublishPhotoLogic() {
        const zone = document.getElementById('pub-upload-zone');
        const input = document.getElementById('pub-photo');
        const previewContainer = document.getElementById('pub-preview-container');

        if (!zone || !input) return;

        DraftController.selectedFiles = [];
        zone.onclick = () => input.click();

        input.onchange = () => {
            const files = Array.from(input.files);
            files.forEach(file => {
                DraftController.selectedFiles.push(file);

                const thumb = document.createElement('div');
                thumb.className = 'relative w-full aspect-square group';

                thumb.innerHTML = `
                    <img src="${URL.createObjectURL(file)}" class="w-full h-full object-cover rounded-xl border border-slate-100 shadow-sm">
                    <span class="absolute -top-1.5 -right-1.5 bg-slate-900 text-white rounded-full w-5 h-5 flex items-center justify-center cursor-pointer text-[10px] font-black border-2 border-white shadow-md hover:scale-110 transition-transform">✕</span>
                `;

                thumb.querySelector('span').onclick = (e) => {
                    e.stopPropagation();
                    DraftController.selectedFiles = DraftController.selectedFiles.filter(f => f !== file);
                    thumb.remove();
                };

                if (previewContainer) previewContainer.appendChild(thumb);
            });
            input.value = '';
        };
    },

    /* Helper to save drafts locally in localStorage */
    saveLocalDraft(title, desc, cat, lat, lng, imageUrls) {
        try {
            const drafts = JSON.parse(localStorage.getItem('local_drafts') || '[]');
            const newDraft = {
                id: `local_${Date.now()}`,
                kind: 'local',
                content: `${title}\n\n${desc}`,
                tags: [
                    ["t", "spatial_anchor"],
                    ["t", cat],
                    ["g", `${lat},${lng}`],
                    ["title", title]
                ],
                pubkey: AuthManager.userPubkey,
                created_at: Math.floor(Date.now() / 1000)
            };
            imageUrls.forEach(url => newDraft.tags.push(["image", url]));

            drafts.push(newDraft);
            localStorage.setItem('local_draft_storage', JSON.stringify(drafts)); // Changed key to avoid conflict if any
            return true;
        } catch (err) {
            console.error("Local draft error:", err);
            return false;
        }
    },

    /* Logic to send the final Kind 1 event to Nostr */
    initPublishLogic(eventId, lat, lng, nostrService, journalManager) {
        const btn = document.getElementById('btn-do-publish');
        if (!btn) return;

        btn.onclick = async () => {
            const title = document.getElementById('pub-title').value.trim();
            const desc = document.getElementById('pub-description').value.trim();
            const cat = document.getElementById('pub-category').value || 'all';

            if (!title) return showToast("El título es obligatorio", "error");

            const isReadOnly = !AuthManager.canSign();
            btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> ${isReadOnly ? 'GUARDANDO LOCALMENTE...' : 'PUBLICANDO...'}`;
            btn.disabled = true;

            try {
                const imageUrls = [];
                for (const file of DraftController.selectedFiles) {
                    const url = await ImageService.upload(file);
                    imageUrls.push(url);
                }

                if (isReadOnly) {
                    const saved = DraftController.saveLocalDraft(title, desc, cat, lat, lng, imageUrls);
                    if (saved) {
                        showToast("¡Borrador local guardado!", "success");
                        DraftController.selectedFiles = [];
                        closeModal();
                        if (journalManager) journalManager.syncJournal();
                    }
                    return;
                }

                const publicEvent = {
                    kind: 1,
                    content: `${title}\n\n${desc}`,
                    tags: [
                        ["t", "spatial_anchor"],
                        ["t", cat],
                        ["g", `${lat},${lng}`],
                        ["title", title]
                    ],
                    created_at: Math.floor(Date.now() / 1000)
                };

                imageUrls.forEach(url => publicEvent.tags.push(["image", url]));

                const success = await nostrService.publishEvent(publicEvent);
                if (success) {
                    showToast("¡Ancla publicada con éxito!", "success");
                    DraftController.selectedFiles = [];
                    if (eventId && journalManager) {
                        await journalManager.deleteEntry(eventId);
                    }
                    closeModal();
                    if (journalManager) journalManager.syncJournal();
                } else {
                    throw new Error("Relays failed");
                }
            } catch (err) {
                console.error("Publish failed:", err);
                btn.disabled = false;
                btn.innerHTML = isReadOnly ? 'GUARDAR COMO LOCAL' : 'PUBLICAR EN NOSTR';
                showToast("Error al procesar", "error");
            }
        };
    },

    /* Logic to save a Draft (Kind 30024) to the Journal */
    initDraftLogic(lat, lng, nostrService, journalManager) {
        const btnSave = document.getElementById('btn-save-draft');
        if (!btnSave) return;

        btnSave.onclick = async () => {
            const title = document.getElementById('draft-title').value.trim();
            const cat = document.getElementById('draft-category').value || 'all';

            if (!title) return showToast("⚠️ Título obligatorio", "error");

            const isReadOnly = !AuthManager.canSign();
            btnSave.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> ${isReadOnly ? 'GUARDANDO LOCAL...' : 'GUARDANDO...'}`;
            btnSave.disabled = true;

            try {
                const imageUrls = [];
                for (const file of DraftController.selectedFiles) {
                    const url = await ImageService.upload(file);
                    imageUrls.push(url);
                }

                if (isReadOnly) {
                    const saved = DraftController.saveLocalDraft(title, "", cat, lat, lng, imageUrls);
                    if (saved) {
                        showToast("Borrador local guardado", "success");
                        DraftController.selectedFiles = [];
                        closeModal();
                        if (journalManager) journalManager.syncJournal();
                    }
                    return;
                }

                const draftEvent = {
                    kind: 30024,
                    content: `Draft: ${title}`,
                    tags: [
                        ["d", `draft_${Date.now()}`],
                        ["title", title],
                        ["t", "spatial_anchor"],
                        ["t", cat],
                        ["g", `${lat},${lng}`]
                    ],
                    created_at: Math.floor(Date.now() / 1000)
                };

                imageUrls.forEach(url => draftEvent.tags.push(["image", url]));

                const success = await nostrService.publishEvent(draftEvent);
                if (success) {
                    showToast("Borrador guardado", "success");
                    DraftController.selectedFiles = [];
                    closeModal();
                    if (journalManager) journalManager.syncJournal();
                }
            } catch (err) {
                console.error("Draft fail:", err);
                btnSave.disabled = false;
                btnSave.innerHTML = 'GUARDAR EN DIARIO';
                showToast("Error al guardar", "error");
            }
        };
    }
};