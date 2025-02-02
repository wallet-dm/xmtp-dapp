import { checkElement, startDemoEnv } from "../test_utils";

const testCases = [
  {
    size: "macbook-16",
    expectedLeftPanel: [
      "avatar",
      "messages-icon",
      "collapse-icon",
      "icon",
      "conversation-list-header",
      "empty-message-icon",
      "empty-message-header",
      "empty-message-subheader",
      "empty-message-cta",
    ],
    expectedRightPanel: [
      "learn-more-header",
      "get-started-header",
      "message-section-link",
      "message-icon",
      "community-section-link",
      "community-icon",
      "docs-section-link",
      "docs-icon",
    ],
  },
  {
    size: "iphone-x",
    expectedLeftPanel: [
      "avatar",
      "messages-icon",
      "collapse-icon",
      "icon",
      "conversation-list-header",
      "empty-message-icon",
      "empty-message-header",
      "empty-message-subheader",
      "empty-message-cta",
    ],
    expectedRightPanel: [],
  },
] as {
  size: Cypress.ViewportPreset;
  expectedLeftPanel: string[];
  expectedRightPanel: string[];
}[];

testCases.forEach(({ size, expectedLeftPanel, expectedRightPanel }) => {
  describe(
    `Connected Test Cases - ${size}`,
    {
      retries: {
        runMode: 2,
        openMode: 1,
      },
    },
    () => {
      beforeEach(() => {
        cy.viewport(size);
        startDemoEnv();
        // In connected flow, conversation list header should render before any tests run
        checkElement("conversation-list-header");
      });

      it("Shows expected left panel fields when logged in with a connected wallet and no existing messages", () => {
        expectedLeftPanel.forEach((element) => {
          checkElement(element);
        });
      });

      it("Shows expected right panel fields when logged in with a connected wallet and no existing messages", () => {
        expectedRightPanel.forEach((element) => {
          checkElement(element);
        });
      });

      it("Shows expected fields when expanding side nav while connected", () => {
        cy.get(`[data-testid="collapse-icon"]`).click();

        const elements = ["Messages", "Collapse", "wallet-address"];

        elements.forEach((element) => {
          checkElement(element);
        });

        cy.get(`[data-testid="icon"]`).click();
        cy.get(`[data-testid="disconnect-wallet-cta"]`).click();
      });

      it("Opens new message view when clicking the CTA from left panel", () => {
        // Need to break up the click chain for GitHub actions
        cy.get(`[data-testid=empty-message-cta]`).click();
        checkElement("message-input");
      });
    },
  );
});

describe("Disconnected Test Cases", () => {
  beforeEach(() => {
    cy.visit(Cypress.env("server_url"));
  });
  it("Shows expected fields when disconnected from a wallet", () => {
    const elements = [
      "xmtp-logo",
      "no-wallet-connected-header",
      "no-wallet-connected-subheader",
      "no-wallet-connected-cta",
      "no-wallet-connected-subtext",
    ];

    elements.forEach((element) => {
      checkElement(element);
    });
  });
});
