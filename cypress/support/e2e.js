// Required file for Cypress tests

// https://github.com/wagmi-dev/viem/discussions/781
Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false prevents Cypress from failing the test
  if (err.message.includes('Chain "Celo" does not support contract "ensUniversalResolver"')) {
    console.log('Ignoring ENS error on CELO 🚀')
    return false
  }
})
