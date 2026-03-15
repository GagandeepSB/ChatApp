const { test, expect } = require('@playwright/test')
const { uniqueEmail, signup, setupProfile, login, logout } = require('./helpers')

const PASSWORD = 'TestPassword123!'

test.describe('Auth — signup', () => {
  test('signup redirects to profile page when profileSetup is false', async ({ page }) => {
    const email = uniqueEmail('auth')
    await signup(page, email, PASSWORD)
    await expect(page).toHaveURL(/\/profile/)
    // Profile page shows firstName/lastName inputs
    await expect(page.locator('input[placeholder="First Name"]')).toBeVisible()
  })

  test('signup with duplicate email shows error', async ({ page }) => {
    const email = uniqueEmail('dup')
    // First signup — lands on /profile (no profile setup yet)
    await signup(page, email, PASSWORD)
    // Clear session so we can reach /auth again
    await logout(page)
    // Now try to sign up again with the same email
    await page.click('button[role="tab"]:has-text("Signup")')
    await page.waitForTimeout(300)
    await page.locator('input[placeholder="Email"]').fill(email)
    await page.locator('input[placeholder="Password"]').first().fill(PASSWORD)
    await page.locator('input[placeholder="Confirm Password"]').fill(PASSWORD)
    await page.locator('[role="tabpanel"][data-state="active"] button:not([role="tab"])').click()
    await page.waitForTimeout(2000)
    // Should show error message
    await expect(page.locator('body')).toContainText('already registered', { ignoreCase: true })
    await expect(page).toHaveURL(/\/auth/)
  })

  test('signup with missing fields — stays on auth page', async ({ page }) => {
    await page.goto('/auth')
    await page.waitForLoadState('networkidle')
    await page.click('button[role="tab"]:has-text("Signup")')
    await page.waitForTimeout(300)
    // Only fill password, leave email empty
    await page.locator('input[placeholder="Password"]').first().fill(PASSWORD)
    await page.locator('input[placeholder="Confirm Password"]').fill(PASSWORD)
    await page.locator('[role="tabpanel"][data-state="active"] button:not([role="tab"])').click()
    await page.waitForTimeout(2000)
    // Should stay on auth page (API returns 400 or form validation prevents submit)
    await expect(page).toHaveURL(/\/auth/)
  })
})

test.describe('Auth — login', () => {
  test('login with valid credentials enters the app', async ({ page }) => {
    // First signup + profile setup to create the account
    const email = uniqueEmail('loginok')
    await signup(page, email, PASSWORD)
    await setupProfile(page, 'Login', 'User')
    // Clear session so we can reach /auth
    await logout(page)
    // Login with the account we just created
    await login(page, email, PASSWORD)
    // Should navigate to /chat (profileSetup=true)
    await expect(page).toHaveURL(/\/chat/, { timeout: 15000 })
  })

  test('login with wrong password shows error', async ({ page }) => {
    const email = uniqueEmail('loginbad')
    await signup(page, email, PASSWORD)
    // Clear session so we can reach /auth
    await logout(page)
    await login(page, email, 'WrongPassword123!')
    await page.waitForTimeout(2000)
    await expect(page.locator('body')).toContainText('Invalid password', { ignoreCase: true })
    await expect(page).toHaveURL(/\/auth/)
  })

  test('login with non-existent email shows error', async ({ page }) => {
    await page.goto('/auth')
    await page.waitForLoadState('networkidle')
    await login(page, 'nobody_notexist_xyz@e2e.test', PASSWORD)
    await page.waitForTimeout(2000)
    await expect(page.locator('body')).toContainText(/not registered|not found/i)
    await expect(page).toHaveURL(/\/auth/)
  })

  test('login with profileSetup=false redirects to profile page', async ({ page }) => {
    const email = uniqueEmail('newuser')
    // Signup but don't complete profile setup
    await signup(page, email, PASSWORD)
    // Clear session so we can reach /auth
    await logout(page)
    // Login — user has profileSetup=false → should go to /profile
    await login(page, email, PASSWORD)
    await expect(page).toHaveURL(/\/profile/, { timeout: 15000 })
  })
})

test.describe('Auth — profile setup', () => {
  test('after profile setup user is redirected to chat page', async ({ page }) => {
    const email = uniqueEmail('profsetup')
    await signup(page, email, PASSWORD)
    await expect(page).toHaveURL(/\/profile/)
    // Fill in profile
    await setupProfile(page, 'Profile', 'Tester')
    await expect(page).toHaveURL(/\/chat/)
    // Sidebar should show the user name
    await expect(page.locator('body')).toContainText('Profile Tester')
  })
})
