import { Interweave } from "interweave";
import { UrlMatcher } from "interweave-autolink";
import { EmojiMatcher, useEmojiData } from "interweave-emoji";
import type { MouseEvent } from "react";
import { isReply } from "@xmtp/browser-sdk";
import type { EnrichedReply, RemoteAttachment } from "@xmtp/browser-sdk";
import RemoteAttachmentMessageTile from "../component-library/components/RemoteAttachmentMessageTile/RemoteAttachmentMessageTile";
import type { AppMessage } from "../contexts/XmtpContext";

interface MessageContentControllerProps {
  message: AppMessage;
  isSelf: boolean;
}

/** Structural check — a reply's inner content arrives already decoded. */
const isRemoteAttachmentContent = (
  content: unknown,
): content is RemoteAttachment =>
  typeof content === "object" &&
  content !== null &&
  "url" in content &&
  "contentDigest" in content;

const TextContent = ({ content }: { content: string }) => {
  const [, source] = useEmojiData({
    compact: false,
    shortcodes: ["emojibase"],
  });

  return (
    <span className="interweave-content" data-testid="message-tile-text">
      <Interweave
        content={content}
        newWindow
        escapeHtml
        onClick={(event: MouseEvent<HTMLDivElement>) => event.stopPropagation()}
        matchers={[
          new UrlMatcher("url"),
          new EmojiMatcher("emoji", {
            convertEmoticon: true,
            convertShortcode: true,
            renderUnicode: true,
          }),
          // Commenting out email matching until this issue is resolved: https://github.com/milesj/interweave/issues/201
          // In the meantime, the experience still properly displays emails, just doesn't link to the expected `mailto:` view.
          // new EmailMatcher("email"),
        ]}
        emojiSource={source}
      />
    </span>
  );
};

/**
 * Renders decoded message content.
 *
 * Dispatch is on the decoded value rather than a content-type id, because
 * browser-sdk decodes built-in types inside the WASM bindings and hands back
 * the value directly. A reply carries its own decoded inner content, so it
 * renders through the same path rather than by synthesising a nested message.
 */
const renderContent = (
  content: unknown,
  fallback: string | undefined,
  isSelf: boolean,
) => {
  if (typeof content === "string") {
    return <TextContent content={content} />;
  }

  if (isRemoteAttachmentContent(content)) {
    return (
      <RemoteAttachmentMessageTile remoteAttachment={content} isSelf={isSelf} />
    );
  }

  // content type not supported by this app, show whatever the sender provided
  return <span>{fallback}</span>;
};

const MessageContentController = ({
  message,
  isSelf,
}: MessageContentControllerProps) => {
  if (isReply(message)) {
    const reply = message.content as EnrichedReply | undefined;
    return renderContent(reply?.content, message.fallback, isSelf);
  }

  return renderContent(message.content, message.fallback, isSelf);
};

export default MessageContentController;
