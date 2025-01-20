"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventBus = exports.EventBus = exports.EventPriority = exports.EventType = void 0;
const DatabaseAdapter_1 = require("../database/DatabaseAdapter");
const EventBus_1 = require("./EventBus");
Object.defineProperty(exports, "EventType", { enumerable: true, get: function () { return EventBus_1.EventType; } });
Object.defineProperty(exports, "EventPriority", { enumerable: true, get: function () { return EventBus_1.EventPriority; } });
Object.defineProperty(exports, "EventBus", { enumerable: true, get: function () { return EventBus_1.EventBus; } });
// Create singleton database instance
const db = new DatabaseAdapter_1.DatabaseAdapter({}, {
    type: 'sqlite',
    connection: ':memory:'
});
// Export singleton instance
exports.eventBus = new EventBus_1.EventBus(db);
