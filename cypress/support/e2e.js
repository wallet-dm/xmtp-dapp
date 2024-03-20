// Required file for Cypress tests

/* eslint-disable consistent-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
// https://github.com/wagmi-dev/viem/discussions/781
Cypress.on("uncaught:exception", (err, runnable) => {
  // returning false prevents Cypress from failing the test
  if (
    err.message.includes(
      'Chain "Celo" does not support contract "ensUniversalResolver"',
    )
  ) {
    return false;
  }
  if(
    err.message.includes('ResizeObserver loop completed with undelivered notifications')
  ) {
    return false;
  }
});