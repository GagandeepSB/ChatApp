/**
 * Shared helpers for E2E tests.
 *
 * Discovered selectors:
 *
 * AUTH PAGE (/auth):
 *   Login tab:    button[role="tab"]:has-text("Login")
 *   Signup tab:   button[role="tab"]:has-text("Signup")
 *   Active panel: [role="tabpanel"][data-state="active"]
 *   Email input:  input[placeholder="Email"]
 *   Password:     input[placeholder="Password"]
 *   Confirm pwd:  input[placeholder="Confirm Password"]
 *   Submit:       [role="tabpanel"][data-state="active"] button:not([role="tab"])
 *
 * PROFILE PAGE (/profile):
 *   First name:   input[placeholder="First Name"]
 *   Last name:    input[placeholder="Last Name"]
 *   Color swatch: div.rounded-full.cursor-pointer  (click first one)
 *   Save btn:     button:has-text("Save Changes")
 *
 * CHAT PAGE (/chat):
 *   DM + button:      button[data-state="closed"] (first)
 *   Channel + button: button[data-state="closed"] (second)
 *   Contact search:   input[placeholder="Search Contacts"]  (inside dialog)
 *   Contact item:     div.flex.gap-3.items-center.cursor-pointer
 *   Message input:    input[placeholder="Enter message"]
 *   Channel name:     input[placeholder="Channel Name"]
 *   Create channel:   button:has-text("Create Channel")
 */

const { expect } = require('@playwright/test')

/** Generate unique email per test run */
const uniqueEmail = (prefix = 'test') =>
  `${prefix}${Date.now()}${Math.random().toString(36).slice(2, 6)}@e2e.test`

/**
 * Sign up a new user via the UI.
 * Stays on /profile page after completion (profile not yet set up).
 */
async function signup(page, email, password) {
  await page.goto('/')
  // Wait for loading to complete (App component fetches userinfo)
  await page.waitForFunction(() => !document.body.innerText.includes('Loading...'), { timeout: 10000 })
  await page.waitForLoadState('networkidle')

  // Click Signup tab
  await page.click('button[role="tab"]:has-text("Signup")')
  await page.waitForTimeout(300)

  // Fill form
  await page.locator('input[placeholder="Email"]').fill(email)
  await page.locator('input[placeholder="Password"]').first().fill(password)
  await page.locator('input[placeholder="Confirm Password"]').fill(password)

  // Submit
  await page.locator('[role="tabpanel"][data-state="active"] button:not([role="tab"])').click()

  // Wait for navigation to /profile
  await page.waitForURL('**/profile', { timeout: 15000 })
}

/**
 * Set up the profile (firstName, lastName, color) on the /profile page.
 * After submission, navigates to /chat.
 */
async function setupProfile(page, firstName, lastName, colorIndex = 0) {
  await page.waitForURL('**/profile', { timeout: 10000 })
  await page.waitForTimeout(300)

  await page.locator('input[placeholder="First Name"]').fill(firstName)
  await page.locator('input[placeholder="Last Name"]').fill(lastName)

  // Click the nth color swatch
  await page.locator('div.rounded-full.cursor-pointer').nth(colorIndex).click()

  await page.locator('button:has-text("Save Changes")').click()

  // Should navigate to /chat
  await page.waitForURL('**/chat', { timeout: 15000 })
}

/**
 * Login via the UI.
 * After login:
 *   - profileSetup=false → navigates to /profile
 *   - profileSetup=true  → navigates to /chat
 */
async function login(page, email, password) {
  await page.goto('/')
  await page.waitForFunction(() => !document.body.innerText.includes('Loading...'), { timeout: 10000 })
  await page.waitForLoadState('networkidle')

  // Should be on /auth; ensure Login tab is active
  const loginTabState = await page.locator('button[role="tab"]:has-text("Login")').getAttribute('data-state')
  if (loginTabState !== 'active') {
    await page.click('button[role="tab"]:has-text("Login")')
    await page.waitForTimeout(300)
  }

  await page.locator('[role="tabpanel"][data-state="active"] input[type="email"]').fill(email)
  await page.locator('[role="tabpanel"][data-state="active"] input[type="password"]').fill(password)
  await page.locator('[role="tabpanel"][data-state="active"] button:not([role="tab"])').click()
}

/**
 * Full helper: signup + profile setup → lands on /chat.
 * Returns the email used.
 */
async function signupAndReachChat(page, firstName = 'Test', lastName = 'User', colorIndex = 0) {
  const email = uniqueEmail(firstName.toLowerCase())
  const password = 'TestPassword123!'
  await signup(page, email, password)
  await setupProfile(page, firstName, lastName, colorIndex)
  return { email, password }
}

/**
 * Log out the current user by clearing cookies and navigating to /auth.
 * Works even when there is no visible logout button (e.g. profile not set up yet).
 */
async function logout(page) {
  await page.context().clearCookies()
  await page.goto('/')
  await page.waitForURL('**/auth', { timeout: 10000 })
}

module.exports = { uniqueEmail, signup, setupProfile, login, signupAndReachChat, logout }
