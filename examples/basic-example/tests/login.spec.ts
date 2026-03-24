import { test, expect } from '@playwright/test';

/**
 * Example test with IETM test case mapping
 */
test.describe('Login Tests', () => {
  test('should login with valid credentials', {
    annotation: { 
      type: 'ietm-test-case', 
      description: '2218' // Maps to IETM Test Case ID 2218
    }
  }, async ({ page }) => {
    await page.goto('https://example.com/login');
    
    // Fill login form
    await page.fill('#username', 'user@example.com');
    await page.fill('#password', 'SecurePassword123');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Verify successful login
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.locator('.welcome-message')).toBeVisible();
  });

  test('should show error with invalid credentials', {
    annotation: { 
      type: 'ietm-test-case', 
      description: '2219'
    }
  }, async ({ page }) => {
    await page.goto('https://example.com/login');
    
    await page.fill('#username', 'invalid@example.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Verify error message
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('Invalid credentials');
  });
});

// Made with Bob
