import { describe, expect, it } from "vitest";
import type { AppMessage } from "../../contexts/XmtpContext";
import { getRepliedToIds } from "../../hooks/useReplies";

const contentType = (typeId: string) => ({
  authorityId: "xmtp.org",
  typeId,
  versionMajor: 1,
  versionMinor: 0,
});

const textMessage = (id: string, numReplies = 0n) =>
  ({
    id,
    contentType: contentType("text"),
    content: `message ${id}`,
    numReplies,
  }) as unknown as AppMessage;

const replyMessage = (id: string, referenceId: string) =>
  ({
    id,
    contentType: contentType("reply"),
    content: { referenceId, content: `reply ${id}` },
    numReplies: 0n,
  }) as unknown as AppMessage;

describe("getRepliedToIds", () => {
  it("returns the ids of messages that have replies", () => {
    const messages = [
      textMessage("parent"),
      textMessage("unrelated"),
      replyMessage("r1", "parent"),
    ];

    expect(getRepliedToIds(messages)).toEqual(new Set(["parent"]));
  });

  it("collapses several replies to the same parent", () => {
    const messages = [
      textMessage("parent"),
      replyMessage("r1", "parent"),
      replyMessage("r2", "parent"),
    ];

    expect(getRepliedToIds(messages)).toEqual(new Set(["parent"]));
  });

  it("ignores messages that are not replies", () => {
    expect(getRepliedToIds([textMessage("a"), textMessage("b")])).toEqual(
      new Set(),
    );
  });

  it("ignores a reply with no reference", () => {
    const malformed = {
      id: "r1",
      contentType: contentType("reply"),
      content: undefined,
      numReplies: 0n,
    } as unknown as AppMessage;

    expect(getRepliedToIds([textMessage("parent"), malformed])).toEqual(
      new Set(),
    );
  });

  /**
   * The reason this is derived rather than read from `message.numReplies`:
   * that count is captured when a message is fetched, so a parent already on
   * screen when a reply streams in keeps reporting zero and its "view replies"
   * affordance never appears.
   */
  it("reports a parent whose own numReplies count is stale", () => {
    const parent = textMessage("parent", 0n);
    const messages = [parent, replyMessage("r1", "parent")];

    expect(parent.numReplies).toBe(0n);
    expect(getRepliedToIds(messages).has("parent")).toBe(true);
  });
});
