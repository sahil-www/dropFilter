/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Try not to write here anything that imports webpacks / vencord stuff. It's my personal logics.
// This is for basic conversion functions like to int and type shit
// only updated when watchModePreset is changed and once on start, that triggers handleWatchModeChange
// This array controls which notifications are fired on runtime in alertHandler

// ==============================
// STATEs - clear on stop()
// ==============================

let _url = "";

export function changeUrl(newUrl: string) {
    _url = newUrl;
}

export let _watchArray: string[] = [];
// Useless state... just lookup
// export let _actionMode: number = 1;

// Stores resolvers waiting for message updates
export let pendingMessageUpdateResolvers: Map<
    string,
    (msg: Message) => void
> | null = null;

export let pendingMessageInChannelResolvers: Map<
    string,
    (msg: Message) => void
> | null = null;

// .push and .stop
export let notifQueue: {
    push: (item: NotifyItem<any>) => void;
    stop: () => void;
    configure: (opts: {
        display?: (item: any) => void;
        clear?: () => void;
    }) => void;
} | null = null;

// ===============================

// This same type of queue is gonna be used for cooldown functionality -- DOUBT
// This queue is supposed to work this way:
// There will be a queue, ui will be calculated every addition, and after timeout of the current item
// The queue works this way: display is run if timeout occurs or a higher priority item gets added
// Filter only occurs on sort which means only during addition of new elements.
// So if array has an item that has essentially expired, but no new items have arrived since expiry, that item will be displayed

// ==============================



export function createPriorityNotifier<T>(opts: {
    display?: (item: T) => void;
    clear?: () => void;
} = {}) {
    let current: NotifyItem<T> | null = null;
    let timeout: any = null;
    const queue: NotifyItem<T>[] = [];
    let display = opts.display ?? (() => { });
    let clear = opts.clear ?? (() => { });

    function sortQueue() {
        const now = Date.now();

        const filtered = queue.filter(
            item => item.validity >= now + item.duration
        );

        filtered.sort((a, b) => b.priority - a.priority);

        // mutate original array
        queue.length = 0;
        queue.push(...filtered);
        console.log("Sorted Queue: ", queue);
    }

    // happens when timeout occurs
    function showNext() {
        if (queue.length === 0) {
            current = null;
            clear();
            return;
        }

        const next = queue.shift()!;
        current = next;

        display(next.value);
        console.log("Display url: ", next.value);

        timeout = setTimeout(() => {
            // clear();
            console.log("Timeout finished in showNext");
            current = null;
            showNext();
        }, next.duration);
    }

    // For future: I know you, you want to mix showNext() and this together such that push adds
    // and later calls showNext() - DON'T DO IT - this thing works, just skip it
    function push(item: NotifyItem<T>) {
        // If nothing showing → show immediately
        if (!current) {
            current = item;
            display(item.value);
            console.log("Display url in push: ", item.value);

            timeout = setTimeout(() => {
                // clear();
                console.log("Timeout finished in push");
                current = null;
                showNext();
            }, item.duration);

            return;
        }

        // If higher priority → interrupt
        if (item.priority > current.priority) {
            clearTimeout(timeout);
            // clear();

            // Put current back into queue
            // This push is different than your own push
            queue.push(current);
            sortQueue();

            current = item;

            display(item.value);
            console.log("Display url in push interrupt: ", item.value);

            timeout = setTimeout(() => {
                // clear();
                console.log("Timeout finished in push with higher priority");
                current = null;
                showNext();
            }, item.duration);

            return;
        }

        // If same priority → queue it (no interrupt)
        else if (item.priority <= current.priority) {
            queue.push(item);
            console.log("Added to queue: ", item.value);
            sortQueue();
            return;
        }
    }

    function stop() {
        clearTimeout(timeout);
        queue.length = 0;
        current = null;
        clear(); // optional: clears UI immediately
    }

    // Takes an object
    // If you want to make display or clear empty, pass empty functions
    // If you want not to change the previous display / clear, pass nothing
    function configure(opts: {
        display?: (item: T) => void;
        clear?: () => void;
    } = {}) {
        if (opts.display !== undefined) display = opts.display;
        if (opts.clear !== undefined) clear = opts.clear;
    }

    return {
        push, stop, configure
    };
}

// ==============================
// HANDLERS
// ==============================

// Used in onChange in settings and start() in index
// creates an array out of store.watchModePreset. If any of the array's elements' corresponding key value pairs in the flags object is true, notification is fired.
export function handleWatchMode(watchMode: number = 0, wishlistWatch: boolean = true, wishlistWatchMode: number = 1): void {
    switch (watchMode) {
        case -1:
            _watchArray = [];
            return;
        case 0:
            _watchArray = [
                "userDropFlag",
                "serverDropFlag",
                "personalEggFlag",
            ];
            break;

        case 1:
            _watchArray = [
                "serverDropFlag",
                "personalEggFlag",
            ];
            break;

        case 2:
            _watchArray = ["personalEggFlag"];
            break;

        // // priority - will develop later
        // case 3:
        //     _watchArray[0] = "personalEggFlag";
    }

    if (wishlistWatch) {
        _watchArray.push("heavyWishlistFlag");
        if (wishlistWatchMode <= 2) _watchArray.push("moderateWishlistFlag");
        if (wishlistWatchMode <= 1) _watchArray.push("wishlistFlag");
    }

    console.log(_watchArray);
}

// Not necessary... I could simply update the queue based on Action Mode, and stop it once on plugin stop
export function handleActionMode(mode: number): void {
    switch (mode) {
        case 1:
            if (notifQueue) {
                notifQueue.stop();
                notifQueue = null;
            }
            if (pendingMessageUpdateResolvers) {
                pendingMessageUpdateResolvers = null;
                pendingMessageInChannelResolvers = null;
            }
            break;
        case 2:
            function display(url: any) {
                history.pushState(null, "", url);
                window.dispatchEvent(new PopStateEvent("popstate"));
            }
            function clear() {
                if (_url !== "") {
                    history.pushState(null, "", _url);
                    window.dispatchEvent(new PopStateEvent("popstate"));
                }
            }
            // active - jump to message immediately
            if (!notifQueue) notifQueue = createPriorityNotifier({ display, clear });
            // Else change configuration
            else {
                notifQueue.configure({
                    display: display,
                    clear: clear,
                });
            }
            if (pendingMessageUpdateResolvers) {
                pendingMessageUpdateResolvers = null;
                pendingMessageInChannelResolvers = null;
            }
            break;
        case 3:
            // Notification - show desktop notifications
            if (!notifQueue) notifQueue = createPriorityNotifier();
            // Else change configuration
            else {
                notifQueue.configure({
                    display: undefined,
                    clear: undefined,
                });
            }
            if (pendingMessageUpdateResolvers) {
                pendingMessageUpdateResolvers = null;
                pendingMessageInChannelResolvers = null;
            }
            break;
        case 4:
            if (notifQueue) {
                notifQueue.stop();
                notifQueue = null;
            }
            if (!pendingMessageUpdateResolvers) {
                pendingMessageUpdateResolvers = new Map<
                    string,
                    (msg: Message) => void
                >();
                pendingMessageInChannelResolvers = new Map<
                    string,
                    (msg: Message) => void
                >();
            }
            break;
    }
}


// ==============================
// WAIT FUNCTION (CORE)
// ==============================

// Creates an entry in pendingResolvers, accepts msgid and timeout duration
// msgId is used as key in pendingResolvers and timeout is used in setTimeout within here: which will remove the entry after time passes
// every msgId has a function (declaration) alongside it, that function is described within pendingResolvers.set
// we will be calling the function associated with the msgId in the updateListener function context,
// thus we will have access to the updated message, which is the only required argument in the function that gets placed in the pendingResolvers
// !! since the func associated with msgId can be known as reolver function: it accepts updatedMsg and calls resolve(updatedMsg)
// !! Hence updatedMsg is returned upon resolution which could be awaited
// in this function we have these variables within scope: msgId (passed), timeoutId (created here), resolve/reject (provided by Promise)
// Temporarily required by TEMPUnobtainedEggsControl
export function waitForMessageUpdate(
    messageId: string,
    timeout: number = 6000
): Promise<Message> {

    return new Promise((resolve, reject) => {

        // ⏳ Timeout handling - Runs after timeout finishes - to clear pendingResolvers
        const timeoutId = setTimeout(() => {
            try {
                pendingMessageUpdateResolvers?.delete(messageId);
                reject(new Error("Timed out waiting for messageUpdate"));
            }
            catch (error) {
                console.log("Timeout finished but could not delete from pendingMessageUpdateResolvers, stop() may have reset: ", error);
            }
        }, timeout);

        // 📌 Store resolver
        pendingMessageUpdateResolvers?.set(messageId, (msg: Message) => {
            try {
                clearTimeout(timeoutId);
                pendingMessageUpdateResolvers?.delete(messageId);
                resolve(msg);
            }
            catch (error) {
                console.log("MessageUpdate about to be resolved, but error occured: ", error);
            }
        });

    });
}

// Mostly useless
export function waitForMessageInChannel(
    channelId: string,
    timeout: number = 5000
): Promise<Message> {

    return new Promise((resolve, reject) => {

        // ⏳ Timeout handling - Runs after timeout finishes - to clear pendingResolvers
        const timeoutId = setTimeout(() => {
            try {
                pendingMessageInChannelResolvers?.delete(channelId);
                reject(new Error("Timed out waiting for messageInChannel"));
            }
            catch (error) {
                console.log("Timeout finished but could not delete from pendingMessageInChannelResolvers, stop() may have reset: ", error);
            }
        }, timeout);

        // 📌 Store resolver
        pendingMessageInChannelResolvers?.set(channelId, (msg: Message) => {
            try {
                clearTimeout(timeoutId);
                pendingMessageInChannelResolvers?.delete(channelId);
                resolve(msg);
            }
            catch (error) {
                console.log("MessageInChannel about to be resolved, but error occured: ", error);
            }
        });

    });
}

export function clearCache() {
    _watchArray = [];
    if (notifQueue) {
        notifQueue.stop();
        notifQueue = null;
    }
    pendingMessageUpdateResolvers = null;
    pendingMessageInChannelResolvers = null;
    _url = "";
}
