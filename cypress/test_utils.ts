/* eslint-disable cypress/no-unnecessary-waiting */
import { ENVIRONMENT } from "../src/helpers";

/**
 * browser-sdk downloads an ~11MB WASM bundle and registers an installation on
 * the network before the app is usable, which is far slower than the V2 client
 * it replaced.
 */
export const TIMEOUT = 90000;

export const sizes = ["macbook-16", "iphone-x"] as Cypress.ViewportPreset[];

export const checkElement = (testId: string) =>
  cy.get(`[data-testid=${testId}]`, { timeout: TIMEOUT }).should("exist");

export const checkMissingElement = (testId: string) =>
  cy.get(`[data-testid=${testId}]`).should("not.exist");

export const checkLink = (testId: string, link: string) =>
  cy.get(`[data-testid=${testId}]`).should("have.attr", "href", link);

export const disconnectWallet = () => {
  checkElement("icon").click();
  checkElement("disconnect-wallet-cta").click();
};

export const startDemoEnv = () => {
  cy.visit(Cypress.env("server_url"));
  localStorage.setItem(ENVIRONMENT.DEMO, String(true));
};

/**
 * The address of the throwaway wallet demo mode connected.
 *
 * Tests message this address rather than a fixed one. A hardcoded peer has to
 * be a real registered inbox, and every CI run would register a new
 * installation against it until it hit XMTP's ten-installation cap. Demo mode
 * already mints a fresh wallet per run, so messaging itself keeps each run
 * self-contained and needs nothing provisioned up front.
 */
export const getDemoWalletAddress = () =>
  cy
    .window({ timeout: TIMEOUT })
    .should((win) => {
      // written once the mock connector finishes connecting
      expect(win.localStorage.getItem("wagmi.store"), "wagmi store").to.not.be
        .null;
    })
    .then((win) => {
      const raw = win.localStorage.getItem("wagmi.store") ?? "{}";
      const account = (
        JSON.parse(raw) as { state?: { data?: { account?: string } } }
      )?.state?.data?.account;
      expect(account ?? "", "connected demo wallet address").to.match(
        /^0x[0-9a-fA-F]{40}$/,
      );
      return account as string;
    });

/** Mirrors how AddressInputController renders a resolved recipient. */
export const expectedRecipientDisplay = (
  address: string,
  size: Cypress.ViewportPreset,
) =>
  size === "macbook-16"
    ? address
    : `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;

const enterWalletAddress = (testUser: string) => {
  checkElement("message-to-input").type(testUser, { delay: 1 });
};

const checkExpectedPreMessageFields = () => {
  cy.wait(1000);
  checkElement("message-input");
  checkElement("message-input-submit");
};

export const sendMessages = (
  numberOfTimes: number,
  message: string,
  testUser: string,
  differentMessageText: boolean,
) => {
  for (let i = 0; i < numberOfTimes; i++) {
    // Enters message
    checkElement("message-input").type(message, { delay: 1 });
    cy.wait(100);
    checkElement("message-input-submit");
    cy.get(`[data-testid=message-input-submit]`).click();
    cy.wait(1000);
    cy.get(`[data-testid=conversations-list-panel]`, {
      timeout: TIMEOUT,
    }).should("have.length", 1);
  }

  if (differentMessageText) {
    const differentMessage = "differentMessage";
    // Send additional different message, check that different message was returned in correct order
    checkElement("message-input").type(differentMessage, { delay: 1 });
    cy.wait(1000);
    checkElement("message-input-submit");
    cy.get(`[data-testid=message-input-submit]`).click();
  }
};

export const checkMessageOutput = (numberOfTimes: number, message: string) => {
  cy.get(`[data-testid=message-tile-container]`, { timeout: TIMEOUT })
    .children()
    .should("have.length", numberOfTimes || 1);

  cy.get(`[data-testid=message-tile-text]`, { timeout: TIMEOUT })
    .children()
    .last()
    .should("have.text", message);
};

const checkMostRecentMessageOutput = (
  numberOfTimes: number,
  differentMessage: string,
) => {
  cy.get(`[data-testid=message-tile-container]`, { timeout: TIMEOUT })
    .children()
    .should("have.length", numberOfTimes);

  cy.get(`[data-testid=message-tile-text]`, { timeout: TIMEOUT })
    .children()
    .eq(numberOfTimes - 1)
    .should("have.text", differentMessage);
};

export const sendAndEnterMessage = (
  testUser: string,
  message: string,
  numberOfTimes = 1,
  checkDifferentMessages = false,
) => {
  cy.wait(2000);
  checkElement("empty-message-cta");
  cy.get(`[data-testid=empty-message-cta]`).click({ timeout: TIMEOUT });
  enterWalletAddress(testUser);
  checkExpectedPreMessageFields();
  sendMessages(numberOfTimes, message, testUser, checkDifferentMessages);
  if (checkDifferentMessages) {
    const differentMessage = "differentMessage";
    // Send additional different message, check that different message was returned in correct order
    checkMostRecentMessageOutput(numberOfTimes + 1, differentMessage);
  } else {
    checkMessageOutput(numberOfTimes, message);
  }
};
