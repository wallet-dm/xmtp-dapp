import { describe, expect, it } from "vitest";
import {
  ContentTypeScreenEffect,
  ScreenEffectCodec,
  type ScreenEffect,
} from "../codecs/ScreenEffectCodec";

const effect: ScreenEffect = { messageId: "abc123", effectType: "SNOW" };

describe("ScreenEffectCodec", () => {
  it("declares the screen effect content type", () => {
    expect(ContentTypeScreenEffect).toEqual({
      authorityId: "experimental.xmtp.org",
      typeId: "screenEffect",
      versionMajor: 1,
      versionMinor: 0,
    });
  });

  it("carries the effect in parameters with an empty content payload", () => {
    const encoded = new ScreenEffectCodec().encode(effect);

    expect(encoded.parameters).toEqual({
      messageId: "abc123",
      effectType: "SNOW",
    });
    expect(encoded.content).toEqual(new Uint8Array());
  });

  it("round-trips an effect", () => {
    const codec = new ScreenEffectCodec();

    expect(codec.decode(codec.encode(effect))).toEqual(effect);
  });

  it("does not trigger a push notification", () => {
    expect(new ScreenEffectCodec().shouldPush()).toBe(false);
  });
});
