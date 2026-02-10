import { openModal, closeModal, getDraftModalHTML } from './ui-controller.js';
import { AuthManager } from './auth.js';

export const DraftController = {
    abrirModal(lat, lng, mapManager, nostrService, journalManager) {
        // 1. Limpieza visual previa
        if (mapManager && mapManager.map) mapManager.map.closePopup();
        
        // 2. Render de la UI
        openModal(getDraftModalHTML(lat, lng));

        // 3. Vinculación de UI
        const closeBtn = document.getElementById('btn-close-draft');
        if (closeBtn) closeBtn.onclick = () => closeModal();

        this.initPhotoLogic();
        this.initSaveLogic(lat, lng, nostrService, journalManager);
    },

    initPhotoLogic() {
        const fileInput = document.getElementById('draft-photo');
        const previewContainer = document.getElementById('preview-container');
        const uploadZone = document.getElementById('upload-zone');
        
        if (!uploadZone || !fileInput) return;

        uploadZone.onclick = () => fileInput.click();

        fileInput.onchange = (e) => {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const base64 = event.target.result;
                    const imgThumb = document.createElement('img');
                    imgThumb.src = base64;
                    imgThumb.style.cssText = "width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 2px solid #8e44ad; margin-bottom: 5px;";
                    previewContainer.appendChild(imgThumb);
                };
                reader.readAsDataURL(file);
            });

            const label = uploadZone.querySelector('p');
            if (label) label.textContent = `${files.length} fotos seleccionadas`;
        };
    },

    initSaveLogic(lat, lng, nostrService, journalManager) {
        const btnSave = document.getElementById('btn-save-draft');
        if (!btnSave) return;

        btnSave.onclick = async () => {
            const title = document.getElementById('draft-title')?.value.trim();
            const categoria = document.getElementById('draft-category')?.value;

            if (!title) return alert("Por favor, ponle un nombre al lugar.");

            btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> FIRMANDO...';
            btnSave.disabled = true;

            try {
                const eventoBorrador = {
                    kind: 30024,
                    pubkey: AuthManager.userPubkey,
                    content: `Borrador de anclaje creado desde la app.`,
                    tags: [
                        ["d", `anchor_${Date.now()}`],
                        ["title", title],                  
                        ["g", `${lat},${lng}`],            
                        ["t", "spatial_anchor"],            
                        ["t", categoria],
                    ],
                    created_at: Math.floor(Date.now() / 1000)
                };

                const exito = await nostrService.publishEvent(eventoBorrador);

                if (exito) {
                    journalManager.syncDrafts();
                    alert(`✅ "${title}" guardado en tu Diario.`);
                    closeModal();
                }
            } catch (err) {
                console.error("Error al firmar:", err);
                alert("❌ Error de firma.");
                btnSave.innerHTML = 'GUARDAR EN DIARIO';
                btnSave.disabled = false;
            }
        };
    }
};