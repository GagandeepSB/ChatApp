const { test, expect } = require('@playwright/test')
const { uniqueEmail, signupAndReachChat } = require('./helpers')

test.describe('Contacts', () => {
  test('search contacts — registered user appears in results', async ({ browser }) => {
    // Create two browser contexts (two independent users)
    const ctxA = await browser.newContext()
    const ctxB = await browser.newContext()
    const pageA = await ctxA.newPage()
    const pageB = await ctxB.newPage()

    try {
      const t = Date.now()
      const emailA = `contactA${t}@e2e.test`
      const emailB = `contactB${t}@e2e.test`
      const PASSWORD = 'TestPassword123!'

      // Sign up both users (B needs to exist before A searches)
      const { signup, setupProfile } = require('./helpers')
      await signup(pageB, emailB, PASSWORD)
      await setupProfile(pageB, 'Betty', 'Contact')
      // A signs up and reaches chat
      await signup(pageA, emailA, PASSWORD)
      await setupProfile(pageA, 'Alpha', 'Contact')

      // A opens the DM search dialog
      await pageA.locator('button[data-state="closed"]').first().click()
      await pageA.waitForTimeout(500)

      // Search for Betty
      await pageA.locator('input[placeholder="Search Contacts"]').fill('Betty')
      await pageA.waitForTimeout(2000)

      // Betty should appear in results
      await expect(pageA.locator('[role="dialog"] div.flex.gap-3.items-center.cursor-pointer')).toContainText('Betty Contact', { timeout: 10000 })
    } finally {
      await ctxA.close()
      await ctxB.close()
    }
  })

  test('contacts with messages appear in sidebar', async ({ browser }) => {
    const ctxA = await browser.newContext()
    const ctxB = await browser.newContext()
    const pageA = await ctxA.newPage()
    const pageB = await ctxB.newPage()

    try {
      const t = Date.now()
      const emailA = `dmA${t}@e2e.test`
      const emailB = `dmB${t}@e2e.test`
      const PASSWORD = 'TestPassword123!'
      const { signup, setupProfile } = require('./helpers')

      // Create both users
      await signup(pageB, emailB, PASSWORD)
      await setupProfile(pageB, 'Sidra', 'Bar')

      await signup(pageA, emailA, PASSWORD)
      await setupProfile(pageA, 'Alf', 'Foo')

      // A opens DM search and selects Sidra
      await pageA.locator('button[data-state="closed"]').first().click()
      await pageA.waitForTimeout(500)
      await pageA.locator('input[placeholder="Search Contacts"]').fill('Sidra')
      await pageA.waitForTimeout(2000)

      // Click on Sidra's contact entry
      await pageA.locator('[role="dialog"] div.flex.gap-3.items-center.cursor-pointer')
        .filter({ hasText: 'Sidra Bar' }).first().click()
      await pageA.waitForTimeout(1000)

      // Now in chat window — send a message
      const msgInput = pageA.locator('input[placeholder="Enter message"]')
      await msgInput.waitFor({ state: 'visible', timeout: 10000 })
      await msgInput.fill('Hello Sidra!')
      await pageA.keyboard.press('Enter')
      await pageA.waitForTimeout(2000)

      // Sidra should appear in the DIRECT MESSAGES sidebar
      await expect(pageA.locator('body')).toContainText('Sidra Bar')
    } finally {
      await ctxA.close()
      await ctxB.close()
    }
  })
})
