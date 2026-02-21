import { store } from './store.js';
import { NostrService } from './nostr-service.js';
import { AuthManager } from './auth.js';
import { JournalManager } from './journal-manager.js';
import { MapManager } from '../features/map/ui-map.js';
import { initUI } from '../ui/ui-controller.js';
import { initFilters } from '../features/filters/filter-controller.js';
import { initSearch } from '../features/search/search-controller.js';
import { GeoUtils } from '../utils/geo-utils.js';

export class AppController {
    constructor() {
        this.relays = store.state.relays;
        this.coords = [33.7550, -84.3732]; // Rosario base

        this.map = new MapManager('map', this.coords);
        this.nostr = new NostrService(this.relays);
        this.journal = new JournalManager(this.map, this.nostr);

        // Expose to window for legacy onclick (will refactor later)
        window.map = this.map;
    }

    async init() {
        initUI(this.nostr);
        initFilters(this.map);
        initSearch(this.map);

        if (await AuthManager.isLoggedIn()) {
            const pubkey = AuthManager.userPubkey;
            store.setState({ isLoggedIn: true, user: { pubkey } });
            await this.journal.syncJournal();
        }

        this.startSubscription();
    }

    startSubscription() {
        this.nostr.subscribeToAnchors(async (event) => {
            const { processedEvents } = store.state;
            if (processedEvents.has(event.id)) return;

            processedEvents.add(event.id);
            store.setState({ processedEvents });

            const geoData = GeoUtils.getHashFromEvent(event);
            if (!geoData) return;

            const profile = await this.nostr.getUserProfile(event.pubkey);

            let lat, lng;
            if (geoData.isRaw) {
                lat = geoData.lat;
                lng = geoData.lon;
            } else {
                const decoded = GeoUtils.decode(geoData);
                lat = decoded.lat;
                lng = decoded.lon;
            }

            const category = event.tags.find(t => t[0] === 't' && t[1] !== 'spatial_anchor')?.[1] || 'all';
            const popupHTML = this.map.createPopupHTML(event, profile, category, false);

            this.map.addMarker(event.id, lat, lng, popupHTML, category, 'public');
        });
    }
}
