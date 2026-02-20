import { AuthManager } from '../../core/auth.js';
import { showToast, openModal, getConfirmModalHTML } from '../../ui/ui-controller.js';

export const UserActions = {
    /* Handles the Follow logic for Nostr users. */
    async followUser(pubkey, name) {
        if (!AuthManager.isLoggedIn()) {
            showToast("🔑 Sign in to follow users.", "error");
            return;
        }

        if (!AuthManager.canSign()) {
            showToast("⚠️ Read-only mode. Connect an extension to follow.", "info");
            return;
        }

        if (pubkey === AuthManager.userPubkey) {
            showToast("You cannot follow yourself.", "error");
            return;
        }

        const displayName = AuthManager.getDisplayName(pubkey) || name;
        showToast(`✅ Following ${name} (Coming soon)`, "success");
    },

    /* Handles the Zap (Lightning payment) initialization. */
    zapUser(pubkey, name, title) {
        if (!AuthManager.isLoggedIn()) {
            showToast("Connect your account to send Zaps", "error");
            return;
        }

        // Zaps don't strictly require NIP-07 if we just open a lightning: link or use a separate provider,
        // but for now, we'll keep it consistent if it's tied to the logged-in user's lightning wallet.
        // Assuming current implementation needs a signature for NIP-57 Zap Request.
        if (!AuthManager.canSign()) {
            showToast("⚠️ Read-only mode. Connect an extension to send Zaps.", "info");
            return;
        }

        const displayName = AuthManager.getDisplayName(pubkey) || name;
        console.log(`Zap initiated for ${displayName} for: ${title}`);
        showToast(`Sending sats to ${displayName} for recommending "${title}"`, "success");
    },

    /* Logic for deleting an existing anchor (Kind 5 request). */
    async deleteAnchor(eventId, mapManager, nostrService, processedEvents) {
        if (!AuthManager.canSign()) {
            showToast("⚠️ Read-only mode. You cannot delete anchors.", "info");
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
                    showToast("Deletion request sent", "success");
                } else {
                    showToast("Relay could not process deletion", "error");
                }
            } catch (err) {
                console.error("Error in deletion process:", err);
                showToast("Unexpected error while deleting", "error");
            }
        };

        openModal(getConfirmModalHTML(
            "Do you want to permanently delete this anchor? This will send a Kind 5 event to the network.",
            performDelete
        ));
    }
};