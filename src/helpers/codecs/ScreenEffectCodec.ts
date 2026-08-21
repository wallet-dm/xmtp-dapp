import type {
  ContentCodec,
  ContentTypeId,
  EncodedContent,
} from "@xmtp/content-type-primitives";

export type EffectType = "SNOW" | "RAIN";

export type ScreenEffect = {
  messageId: string;
  effectType: EffectType;
};

/**
 * Vendored from @xmtp/experimental-content-type-screen-effect@1.0.7.
 *
 * That package is unmaintained and pins @xmtp/content-type-primitives ^1.0.1,
 * where ContentTypeId is a class with .sameAs()/.toString() and codec methods
 * take a second `registry` argument. Primitives v3 — the version
 * @xmtp/browser-sdk depends on — makes ContentTypeId a plain object and drops
 * the registry argument, so the published codec is not structurally assignable
 * to ClientOptions["codecs"].
 *
 * The wire format is unchanged: the effect travels entirely in `parameters`
 * and `content` is an empty byte array, so messages sent by the old codec
 * decode with this one and vice versa.
 *
 * Compare against this content type with contentTypesAreEqual() from
 * @xmtp/content-type-primitives — there is no .sameAs() in v3.
 */
export const ContentTypeScreenEffect: ContentTypeId = {
  authorityId: "experimental.xmtp.org",
  typeId: "screenEffect",
  versionMajor: 1,
  versionMinor: 0,
};

export class ScreenEffectCodec implements ContentCodec<ScreenEffect> {
  get contentType(): ContentTypeId {
    return ContentTypeScreenEffect;
  }

  encode(content: ScreenEffect): EncodedContent {
    return {
      type: ContentTypeScreenEffect,
      parameters: {
        messageId: content.messageId,
        effectType: content.effectType,
      },
      content: new Uint8Array(),
    };
  }

  decode(content: EncodedContent): ScreenEffect {
    const { messageId, effectType } = content.parameters;
    return { messageId, effectType: effectType as EffectType };
  }

  fallback(): string | undefined {
    return undefined;
  }

  shouldPush(): boolean {
    return false;
  }
}

export default ScreenEffectCodec;
