/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Try not to write here anything that imports webpacks / vencord stuff. It's my personal logics.
// ========= NEW FUNC =============

type ButtonComponent = {
    type: number; // 2 = button
    label?: string;
    custom_id?: string;
    style?: number;
    disabled?: boolean;
};

type ActionRow = {
    type: number; // 1 = action row
    components: ButtonComponent[];
};

type Message = {
    id: string;
    guild_id: string;
    channel_id: string;
    content?: string;
    author?: { id: string; };
    components?: ActionRow[];
};

// Runs display() for every item in queue in priority order with expiration.
type NotifyItem<T> = {
    value: T;
    priority: number;
    duration: number; // ms
    validity: number; // set during creating of this item, used for auto removal from queue if validity - Date.now() < duration, if not already removed by priority
};
