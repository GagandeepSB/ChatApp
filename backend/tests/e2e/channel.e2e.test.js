const { test, expect } = require('@playwright/test')

// The purple send button selector (bg-[#8417ff] class)
const SEND_BTN = 'button[class*="8417ff"]'

test.describe('Channels', () => {
  test('create a channel — channel appears in sidebar', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()

    try {
      const t = Date.now()
      const { signup, setupProfile } = require('./helpers')
      const emailA = `chanAdmin${t}@e2e.test`
      const emailB = `chanMember${t}@e2e.test`
      const PASSWORD = 'TestPassword123!'

      // Create a member user first (so admin can add them)
      const ctxB = await browser.newContext()
      const pageB = await ctxB.newPage()
      await signup(pageB, emailB, PASSWORD)
      await setupProfile(pageB, 'Member', 'Chan')
      await pageB.close()
      await ctxB.close()

      // Admin creates account and reaches chat
      await signup(page, emailA, PASSWORD)
      await setupProfile(page, 'Admin', 'Chan')

      // Click the Channels + button (second button[data-state="closed"])
      await page.locator('button[data-state="closed"]').nth(1).click()
      await page.waitForTimeout(500)

      // Fill channel name
      const channelName = `TestChan${t}`
      await page.locator('input[placeholder="Channel Name"]').fill(channelName)

      // Create channel (without members for simplicity)
      await page.locator('button:has-text("Create Channel")').click()
      await page.waitForTimeout(2000)

      // Channel should appear in the Channels section of the sidebar
      await expect(page.locator('body')).toContainText(channelName, { timeout: 10000 })
    } finally {
      await ctx.close()
    }
  })

  test('send a channel message — message appears in channel', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()

    try {
      const t = Date.now()
      const { signup, setupProfile } = require('./helpers')
      const emailA = `chanMsg${t}@e2e.test`
      const PASSWORD = 'TestPassword123!'

      // Create admin
      await signup(page, emailA, PASSWORD)
      await setupProfile(page, 'ChanMsg', 'User')

      // Create a channel
      await page.locator('button[data-state="closed"]').nth(1).click()
      await page.waitForTimeout(500)
      const channelName = `MsgChan${t}`
      await page.locator('input[placeholder="Channel Name"]').fill(channelName)
      await page.locator('button:has-text("Create Channel")').click()
      await page.waitForTimeout(2000)

      // Click on the channel in the sidebar
      await page.locator('body').getByText(channelName).first().click()
      await page.waitForTimeout(1000)

      // Send a message in the channel
      const msgInput = page.locator('input[placeholder="Enter message"]')
      await msgInput.waitFor({ state: 'visible', timeout: 10000 })
      const testMsg = `Channel msg ${t}`
      await msgInput.fill(testMsg)
      // Click the purple send button (Enter key does not submit in this app)
      await page.locator(SEND_BTN).click()
      await page.waitForTimeout(1500)

      // Message should appear in the chat area
      await expect(page.locator('body')).toContainText(testMsg, { timeout: 10000 })
    } finally {
      await ctx.close()
    }
  })
})
