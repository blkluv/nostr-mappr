import { AuthManager } from '../../core/auth.js';
import { showToast, openModal, getConfirmModalHTML } from '../../ui/ui-controller.js';

export const UserActions = {
    /* Handles the Follow logic for Nostr users. */
    async followUser(pubkey, name) {
        if (!AuthManager.isLoggedIn()) {
            showToast("🔑 Inicia sesión para seguir usuarios.", "error");
            return;
        }

        if (!AuthManager.canSign()) {
            showToast("⚠️ Modo solo lectura. Conecta una extensión para seguir.", "info");
            return;
        }

        if (pubkey === AuthManager.userPubkey) {
            showToast("No puedes seguirte a ti mismo.", "error");
            return;
        }

        const displayName = AuthManager.getDisplayName(pubkey) || name;
        showToast(`✅ Siguiendo a ${name} (Próximamente)`, "success");
    },

    /* Handles the Zap (Lightning payment) initialization. */
    zapUser(pubkey, name, title) {
        if (!AuthManager.isLoggedIn()) {
            showToast("Conecta tu cuenta para enviar Zaps", "error");
            return;
        }

        // Zaps don't strictly require NIP-07 if we just open a lightning: link or use a separate provider,
        // but for now, we'll keep it consistent if it's tied to the logged-in user's lightning wallet.
        // Assuming current implementation needs a signature for NIP-57 Zap Request.
        if (!AuthManager.canSign()) {
            showToast("⚠️ Modo solo lectura. Conecta una extensión para enviar Zaps.", "info");
            return;
        }

        const displayName = AuthManager.getDisplayName(pubkey) || name;
        console.log(`Zap iniciado para ${displayName} por: ${title}`);
        showToast(`Enviando sats a ${displayName} por recomendar "${title}"`, "success");
    },

    /* Logic for deleting an existing anchor (Kind 5 request). */
    async deleteAnchor(eventId, mapManager, nostrService, processedEvents) {
        if (!AuthManager.canSign()) {
            showToast("⚠️ Modo solo lectura. No puedes borrar anclas.", "info");
            return;
        }

        const performDelete = async () => {
            try {
                const success = await nostrService.deleteEvent(eventId);
                if (success) {
                    const marker = mapManager.markers.get(eventId);
                    if (marker) {
                        mapManager.map.removeLayer(marker);
                        mapManager.markers.delete(eventId);
                    }
                    if (processedEvents) processedEvents.delete(eventId);
                    showToast("Solicitud de eliminación enviada", "success");
                } else {
                    showToast("El relay no pudo procesar la eliminación", "error");
                }
            } catch (err) {
                console.error("Error in deletion process:", err);
                showToast("Error inesperado al borrar", "error");
            }
        };

        openModal(getConfirmModalHTML(
            "¿Quieres eliminar permanentemente esta ancla? Esto enviará un evento Kind 5 a la red.",
            performDelete
        ));
    }
};