import type { KeyboardEventHandler } from "react";
import { useCallback, useMemo } from "react";
import type { Attachment, RemoteAttachment } from "@xmtp/browser-sdk";
import Zoom from "react-medium-image-zoom";
import { useTranslation } from "react-i18next";
import { PaperClipIcon } from "@heroicons/react/outline";
import {
  getContentTypeFromFileName,
  humanFileSize,
} from "../../../helpers/attachments";
import useRemoteAttachment from "../../../hooks/useRemoteAttachment";
import "react-medium-image-zoom/dist/styles.css";

type RemoteAttachmentMessageTileProps = {
  remoteAttachment: RemoteAttachment;
  isSelf: boolean;
};

/**
 * Creating object URLs from blobs is non-deterministic, so we store the
 * generated URLs in a cache so that they can be reused, which results in
 * a more consistent rendering of images/data and less memory usage.
 */
const blobCache = new WeakMap<Uint8Array, string>();

const getBlobUrl = (attachment: Attachment) => {
  if (!blobCache.get(attachment.content)) {
    blobCache.set(
      attachment.content,
      URL.createObjectURL(
        new Blob([Buffer.from(attachment.content)], {
          type: attachment.mimeType,
        }),
      ),
    );
  }

  return blobCache.get(attachment.content);
};

const RemoteAttachmentMessageTile = ({
  remoteAttachment,
  isSelf,
}: RemoteAttachmentMessageTileProps) => {
  const { t } = useTranslation();
  const { attachment, status, load } = useRemoteAttachment(remoteAttachment);
  const fileSize = humanFileSize(remoteAttachment.contentLength);

  const contentType = getContentTypeFromFileName(
    remoteAttachment.filename ?? "",
  );

  const blobUrl = useMemo(() => {
    if (attachment) {
      return getBlobUrl(attachment);
    }
    return undefined;
  }, [attachment]);

  const handleReload = useCallback(() => {
    void load();
  }, [load]);

  const handleReloadKeyDown = useCallback<KeyboardEventHandler<HTMLDivElement>>(
    (e) => {
      if (e.key === "Enter") {
        void handleReload();
      }
    },
    [handleReload],
  );

  const hasError = status === "error";

  return hasError ? (
    <div
      className={`text-gray-500 flex gap-1 flex-col ${
        isSelf ? "items-end" : "items-start"
      }`}>
      <div>{t("status_messaging.gateway_error")}</div>
      <div className="text-xs flex align-center font-bold gap-1">
        <div
          role="button"
          tabIndex={0}
          onClick={handleReload}
          onKeyDown={handleReloadKeyDown}
          className="underline text-indigo-600">
          {t("messages.attachment_reload")}
        </div>
      </div>
    </div>
  ) : (
    <div>
      {status === "loading" ? t("status_messaging.loading") : null}
      {status === "loaded" && blobUrl ? (
        <Zoom>
          {contentType === "video" ? (
            <video controls autoPlay>
              <source src={blobUrl} type="video/mp4" />
              {t("attachments.video_messages_not_supported")}
            </video>
          ) : contentType === "application" ? (
            <object
              data={blobUrl}
              type="application/pdf"
              width="100%"
              height="500px">
              <p>{t("attachments.unable_to_display")}</p>
              <a href={blobUrl}>{t("attachments.download_instead")}</a>
            </object>
          ) : contentType === "image" ? (
            <img
              src={blobUrl}
              className="max-h-80 rounded-lg"
              alt={remoteAttachment.filename}
            />
          ) : contentType === "audio" ? (
            <audio controls src={blobUrl} className="max-w-full">
              <a href={blobUrl}>{t("attachments.download_instead")}</a>
            </audio>
          ) : (
            <div className="flex font-bold underline">
              <PaperClipIcon width={16} />
              <a href={blobUrl} target="_blank" rel="noopener noreferrer">
                {remoteAttachment.filename} ({fileSize})
              </a>
            </div>
          )}
        </Zoom>
      ) : null}
      {status === "init" || status === "autoloadMaxFileSizeExceeded" ? (
        <div
          className={`flex flex-col gap-1 ${
            isSelf ? "items-end" : "items-start"
          }`}>
          {remoteAttachment.filename} - {fileSize}
          <div
            role="button"
            tabIndex={0}
            className="text-xs underline"
            onClick={handleReload}
            onKeyDown={handleReloadKeyDown}>
            {t("messages.attachment_cta")}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default RemoteAttachmentMessageTile;
