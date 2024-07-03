"use strict";
class MemoryCache {
    constructor({ update, ttl }) {
        this.isOutdated = () => {
            return Date.now() - this.lastUpdatedAt >= this.ttl;
        };
        this.update = async () => {
            try {
                this.state = await this.updater();
                this.lastUpdatedAt = Date.now();
            }
            catch (e) {
                console.error('Failed to update cache:', e);
            }
        };
        this.read = async () => {
            if (!this.state || this.isOutdated()) {
                await this.update();
            }
            return this.state;
        };
        this.ttl = ttl;
        this.lastUpdatedAt = Date.now();
        this.updater = update;
    }
}

module.exports = {
    MemoryCache
};
