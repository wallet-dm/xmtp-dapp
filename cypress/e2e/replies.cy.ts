import {
  startDemoEnv,
  sendAndEnterMessage,
  checkElement,
  sendMessages,
  checkMessageOutput,
  checkMissingElement,
  getDemoWalletAddress,
  sizes,
} from "../test_utils";

sizes.forEach((size) => {
  describe(
    `Replies Test Cases - ${size}`,
    {
      retries: {
        runMode: 3,
        openMode: 2,
      },
    },
    () => {
      const shortMessage = "hello";
      const replyMessage = "this is a reply";
      beforeEach(() => {
        cy.viewport(size);
        startDemoEnv();
        checkElement("conversation-list-header");
        getDemoWalletAddress().then((peer) => {
          sendAndEnterMessage(peer, shortMessage);
        });
        checkElement("message-tile-text").children().first().click();
        checkElement("reply-bar");
        checkElement("reply-icon").click();
        checkElement("replies-container");
      });

      it("can reply to a message", () => {
        sendMessages(1, replyMessage, "", false);
        checkMessageOutput(2, replyMessage);
      });
      it("can send multiple replies to a message", () => {
        sendMessages(1, replyMessage, "", false);
        sendMessages(1, "here is another reply", "", false);
        checkMessageOutput(3, "here is another reply");
      });
      it("can toggle replies view", () => {
        // Click X
        checkElement("replies-close-icon").click();

        // Reply view should be hidden now
        checkMissingElement("replies-container");
        checkElement("address-container");
      });
      it("cannot reply to a reply", () => {
        checkElement("message-tile-text").children().first();
        checkMissingElement("reply-icon");
      });

      it("cannot toggle replies view when there are no replies", () => {
        checkElement("replies-close-icon").click();

        // There shouldn't be a view replies CTA before there are replies
        checkMissingElement("view-replies-cta");

        // Click into replies
        checkElement("reply-icon").click();
        checkElement("replies-container");

        // Send reply
        sendMessages(1, replyMessage, "", false);

        // Exit
        checkElement("replies-close-icon").click();

        // View replies CTA should appear
        checkElement("view-replies-cta");

        // When clicking into it, it should go to replies view
        checkElement("view-replies-cta").click();
        checkElement("replies-container");
      });
    },
  );
});
