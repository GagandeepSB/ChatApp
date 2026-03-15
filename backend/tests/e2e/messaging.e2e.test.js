const { test, expect } = require('@playwright/test')

// The purple send button selector (bg-[#8417ff] class)
const SEND_BTN = 'button[class*="8417ff"]'

test.describe('Messaging', () => {
  test('User A sends a DM to User B — User B sees message', async ({ browser }) => {
    const ctxA = await browser.newContext()
    const ctxB = await browser.newContext()
    const pageA = await ctxA.newPage()
    const pageB = await ctxB.newPage()

    try {
      const t = Date.now()
      const emailA = `msgA${t}@e2e.test`
      const emailB = `msgB${t}@e2e.test`
      const PASSWORD = 'TestPassword123!'
      const { signup, setupProfile } = require('./helpers')

      // Create User B first (so A can find them)
      await signup(pageB, emailB, PASSWORD)
      await setupProfile(pageB, 'Bob', 'Receive')

      // Create User A
      await signup(pageA, emailA, PASSWORD)
      await setupProfile(pageA, 'Alice', 'Send')

      // A opens DM search and starts chat with B
      await pageA.locator('button[data-state="closed"]').first().click()
      await pageA.waitForTimeout(500)
      await pageA.locator('input[placeholder="Search Contacts"]').fill('Bob')
      await pageA.waitForTimeout(2000)
      await pageA.locator('[role="dialog"] div.flex.gap-3.items-center.cursor-pointer')
        .filter({ hasText: 'Bob Receive' }).first().click()
      await pageA.waitForTimeout(1000)

      // A sends a message
      const msgInput = pageA.locator('input[placeholder="Enter message"]')
      await msgInput.waitFor({ state: 'visible', timeout: 10000 })
      const testMsg = `Hello Bob! ${t}`
      await msgInput.fill(testMsg)
      // Click the purple send button (Enter key does not submit in this app)
      await pageA.locator(SEND_BTN).click()
      await pageA.waitForTimeout(1500)

      // A should see the message on screen
      await expect(pageA.locator('body')).toContainText(testMsg)

      // B opens DM search and goes to chat with A
      await pageB.locator('button[data-state="closed"]').first().click()
      await pageB.waitForTimeout(500)
      await pageB.locator('input[placeholder="Search Contacts"]').fill('Alice')
      await pageB.waitForTimeout(2000)
      await pageB.locator('[role="dialog"] div.flex.gap-3.items-center.cursor-pointer')
        .filter({ hasText: 'Alice Send' }).first().click()
      await pageB.waitForTimeout(2000)

      // B should see the message that A sent
      await expect(pageB.locator('body')).toContainText(testMsg, { timeout: 15000 })
    } finally {
      await ctxA.close()
      await ctxB.close()
    }
  })

  test('Message persists after page reload', async ({ browser }) => {
    const ctxA = await browser.newContext()
    const ctxB = await browser.newContext()
    const pageA = await ctxA.newPage()
    const pageB = await ctxB.newPage()

    try {
      const t = Date.now()
      const emailA = `persistA${t}@e2e.test`
      const emailB = `persistB${t}@e2e.test`
      const PASSWORD = 'TestPassword123!'
      const { signup, setupProfile } = require('./helpers')

      // Create B first
      await signup(pageB, emailB, PASSWORD)
      await setupProfile(pageB, 'Barb', 'Persist')

      // Create A
      await signup(pageA, emailA, PASSWORD)
      await setupProfile(pageA, 'Ann', 'Persist')

      // A opens chat with B
      await pageA.locator('button[data-state="closed"]').first().click()
      await pageA.waitForTimeout(500)
      await pageA.locator('input[placeholder="Search Contacts"]').fill('Barb')
      await pageA.waitForTimeout(2000)
      await pageA.locator('[role="dialog"] div.flex.gap-3.items-center.cursor-pointer')
        .filter({ hasText: 'Barb Persist' }).first().click()
      await pageA.waitForTimeout(1000)

      // Send a message
      const msgInput = pageA.locator('input[placeholder="Enter message"]')
      await msgInput.waitFor({ state: 'visible', timeout: 10000 })
      const testMsg = `Persist test ${t}`
      await msgInput.fill(testMsg)
      // Click the purple send button (Enter key does not submit in this app)
      await pageA.locator(SEND_BTN).click()
      await pageA.waitForTimeout(2000)

      // Reload A's page
      await pageA.reload({ waitUntil: 'networkidle' })
      await pageA.waitForTimeout(3000)

      // After reload, navigate back to /chat and open conversation with B
      if (!pageA.url().includes('/chat')) {
        await pageA.waitForURL('**/chat', { timeout: 10000 })
      }

      // Find the contact in the sidebar and click it
      const contactInSidebar = pageA.locator('body').getByText('Barb Persist')
      await contactInSidebar.first().waitFor({ state: 'visible', timeout: 10000 })
      await contactInSidebar.first().click()
      await pageA.waitForTimeout(2000)

      // The message should still be visible
      await expect(pageA.locator('body')).toContainText(testMsg, { timeout: 10000 })
    } finally {
      await ctxA.close()
      await ctxB.close()
    }
  })
})
