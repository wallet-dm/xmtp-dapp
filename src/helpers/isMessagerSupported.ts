import { isRemoteAttachment, isText } from "@xmtp/browser-sdk";
import { contentTypesAreEqual } from "@xmtp/content-type-primitives";
import type { AppMessage } from "../contexts/XmtpContext";
import { ContentTypeScreenEffect } from "./codecs/ScreenEffectCodec";

/**
 * Determines if a message is supported by the app.
 *
 * Dispatch is on the SDK's type guards rather than content-type ids, since
 * browser-sdk decodes built-in types in the WASM bindings.
 */
export const isMessageSupported = (message: AppMessage) =>
  isText(message) ||
  isRemoteAttachment(message) ||
  contentTypesAreEqual(message.contentType, ContentTypeScreenEffect);
