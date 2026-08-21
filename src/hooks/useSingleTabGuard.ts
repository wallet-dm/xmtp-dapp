import { useCallback, useEffect, useRef, useState } from "react";

/**
 * browser-sdk stores its local database in OPFS via SQLite's SyncAccessHandle
 * Pool VFS, which does not support more than one simultaneous connection. If a
 * second tab opens a client against the same database the results are
 * undefined, so the app must allow exactly one active tab at a time.
 *
 * Exclusivity is held with the Web Locks API: the active tab holds an exclusive
 * lock for as long as it is mounted, and the browser releases it automatically
 * if that tab is closed or crashes.
 *
 * Taking over is two-phase. A BroadcastChannel message asks the incumbent to
 * stand down so it can shut its client down cleanly; if nothing gives up the
 * lock within a short grace period, the lock is stolen outright. The steal
 * matters — without it, a holder that cannot respond (a crashed renderer, a tab
 * running an older build, a window the user cannot find) would leave them stuck
 * on the blocking screen with no way forward.
 */
const LOCK_NAME = "wallet-dm:xmtp-db";
const CHANNEL_NAME = "wallet-dm:tabs";

const YIELD_MESSAGE = "yield";

/** How long an incumbent gets to release cooperatively before we steal. */
const YIELD_GRACE_MS = 400;

export type TabStatus = "checking" | "active" | "blocked";

type HoldMode =
  /** take the lock only if nobody holds it, so we can tell "blocked" apart */
  | "probe"
  /** wait in line; resolves if the holder closes or releases */
  | "queue"
  /** preempt the current holder — only ever on an explicit user action */
  | "steal";

export const useSingleTabGuard = () => {
  const [status, setStatus] = useState<TabStatus>("checking");
  // resolving this promise releases the Web Lock this tab is holding
  const releaseRef = useRef<(() => void) | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  // set once the effect tears down so late lock grants don't revive the tab
  const unmountedRef = useRef(false);
  // read inside timers, where `status` would be a stale closure
  const statusRef = useRef<TabStatus>("checking");
  const holdRef = useRef<((mode: HoldMode) => void) | null>(null);
  /**
   * Cancels the outstanding queued request. Without this, every block/yield
   * cycle would leave another request waiting in line forever, and a stale one
   * could later be granted and flip a blocked tab back to active.
   */
  const queuedRef = useRef<AbortController | null>(null);

  const updateStatus = useCallback((next: TabStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  useEffect(() => {
    unmountedRef.current = false;

    // Web Locks is unavailable on some older browsers. Degrade to single-tab
    // trust rather than locking the user out of the app entirely.
    if (typeof navigator === "undefined" || !navigator.locks) {
      updateStatus("active");
      return undefined;
    }

    const hold = (mode: HoldMode) => {
      // only ever one request waiting in line
      queuedRef.current?.abort();
      queuedRef.current = null;

      const options: LockOptions =
        mode === "probe"
          ? { ifAvailable: true, mode: "exclusive" }
          : mode === "steal"
            ? { mode: "exclusive", steal: true }
            : { mode: "exclusive" };

      let controller: AbortController | null = null;
      if (mode === "queue") {
        controller = new AbortController();
        queuedRef.current = controller;
        options.signal = controller.signal;
      }

      navigator.locks
        .request(LOCK_NAME, options, (lock) => {
          // only a "probe" can come back empty-handed
          if (!lock) {
            updateStatus("blocked");
            // queue behind the holder so we recover if they simply close
            hold("queue");
            return undefined;
          }
          queuedRef.current = null;
          return new Promise<void>((release) => {
            if (unmountedRef.current) {
              release();
              return;
            }
            releaseRef.current = release;
            updateStatus("active");
          });
        })
        .catch(() => {
          // Either we cancelled this request to replace it, or another tab
          // stole the lock. A cancellation is bookkeeping and must not queue
          // again, or the two would chase each other indefinitely.
          if (controller?.signal.aborted) {
            return;
          }
          releaseRef.current = null;
          if (!unmountedRef.current) {
            updateStatus("blocked");
            hold("queue");
          }
        });
    };

    holdRef.current = hold;

    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;

    channel.onmessage = (event: MessageEvent<string>) => {
      // another tab wants control; drop the lock and queue up behind it
      if (event.data === YIELD_MESSAGE && releaseRef.current) {
        releaseRef.current();
        releaseRef.current = null;
        updateStatus("blocked");
        hold("queue");
      }
    };

    hold("probe");

    return () => {
      unmountedRef.current = true;
      queuedRef.current?.abort();
      queuedRef.current = null;
      releaseRef.current?.();
      releaseRef.current = null;
      holdRef.current = null;
      channel.close();
      channelRef.current = null;
    };
  }, [updateStatus]);

  /**
   * Take control of the local database. Asks the incumbent to release first so
   * it can close its client cleanly, then steals the lock if that goes
   * unanswered.
   */
  const takeOver = useCallback(() => {
    channelRef.current?.postMessage(YIELD_MESSAGE);
    window.setTimeout(() => {
      if (!unmountedRef.current && statusRef.current !== "active") {
        holdRef.current?.("steal");
      }
    }, YIELD_GRACE_MS);
  }, []);

  return { status, takeOver };
};

export default useSingleTabGuard;
