import { AuthManager } from './auth.js';
import { showToast, openModal, getConfirmModalHTML } from './ui-controller.js';

export const UserActions = {
    /* Handles the Follow logic for Nostr users. */
    async followUser(pubkey, name) {
        if (!AuthManager.isLoggedIn()) {
            showToast("🔑 Log in to follow other users.", "error");
            return;
        }

        if (pubkey === AuthManager.userPubkey) {
            showToast("❌ You cannot follow yourself.", "error");
            return;
        }

        const displayName = AuthManager.getDisplayName(pubkey) || name;
        showToast(`✅ Following ${name} (Coming Soon)`, "success");
    },

    /* Handles the Zap (Lightning payment) initialization. */
    zapUser(pubkey, name, title) {
        if (!AuthManager.isLoggedIn()) {
            showToast("⚡ Connect your account to send Zaps", "error");
            return;
        }

        const displayName = AuthManager.getDisplayName(pubkey) || name;
        console.log(`⚡ Zap initiated for ${displayName} for: ${title}`);
        showToast(`⚡ Sending sats to ${displayName} for recommending "${title}"`, "success");
    },

    /* Logic for deleting an existing anchor (Kind 5 request). */
    async deleteAnchor(eventId, mapManager, nostrService, processedEvents) {
        const performDelete = async () => {
            try {
                /* Kind 5: Deletion request in Nostr network. */
                const success = await nostrService.deleteEvent(eventId); 

                if (success) {
                    /* Visual removal from the map manager. */
                    const marker = mapManager.markers.get(eventId);
                    if (marker) {
                        mapManager.map.removeLayer(marker);
                        mapManager.markers.delete(eventId);
                    }
                    
                    if (processedEvents) processedEvents.delete(eventId);
                    showToast("✅ Deletion request sent", "success");
                } else {
                    showToast("❌ Relay could not process the deletion", "error");
                }
            } catch (err) {
                console.error("Error in deletion process:", err);
                showToast("❌ Unexpected error while deleting", "error");
            }
        };

        /* Open custom glass modal for confirmation. */
        openModal(getConfirmModalHTML(
            "Do you want to permanently delete this anchor? This will send a Kind 5 event to the network.", 
            performDelete
        ));
    }
};