/**
 * Integration tests for IETM Playwright Client
 * These tests run against saucedemo.com and publish results to IETM sandbox
 * 
 * Test Cases:
 * - 2218: Positive Login Test
 * - 7117: Login with Invalid Credentials
 */

import { test, expect } from '@playwright/test';

test.describe('Login Tests - IETM Integration', () => {
  // Configure test plan for this test suite
  test.beforeAll(async () => {
    // Test plan 987: IT1-System Test
  });

  test('Positive Login Test', async ({ page }) => {
    // Map to IETM test case 2218 and test plan 987
    test.info().annotations.push({
      type: 'ietm-test-case',
      description: '2218',
    });
    test.info().annotations.push({
      type: 'ietm-test-plan',
      description: '987',
    });

    await test.step('Navigate to https://www.saucedemo.com/', async () => {
      await page.goto('https://www.saucedemo.com/');
      await expect(page).toHaveTitle(/Swag Labs/);
    });

    await test.step("fill username with 'standard_user', fill password with 'secret_sauce', click Login button", async () => {
      // Fill username
      await page.locator('#user-name').fill('standard_user');
      
      // Fill password
      await page.locator('#password').fill('secret_sauce');
      
      // Click Login button
      await page.locator('#login-button').click();
      
      // Expected: The products page should be visible
      await expect(page).toHaveURL(/inventory\.html/);
      await expect(page.locator('.inventory_list')).toBeVisible();
      await expect(page.locator('.title')).toContainText('Products');
    });
  });

  test('Login - should show error with invalid credentials', async ({ page }) => {
    // Map to IETM test case 7117 and test plan 987
    test.info().annotations.push({
      type: 'ietm-test-case',
      description: '7117',
    });
    test.info().annotations.push({
      type: 'ietm-test-plan',
      description: '987',
    });

    await test.step('Navigate to https://www.saucedemo.com/', async () => {
      await page.goto('https://www.saucedemo.com/');
      await expect(page).toHaveTitle(/Swag Labs/);
    });

    await test.step("fill username with 'standard_user', fill password with 'wrong_sauce', click Login button", async () => {
      // Fill username
      await page.locator('#user-name').fill('standard_user');
      
      // Fill password with wrong password
      await page.locator('#password').fill('wrong_sauce');
      
      // Click Login button
      await page.locator('#login-button').click();
      
      // Expected: Error message should be displayed
      const errorMessage = page.locator('[data-test="error"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('Username and password do not match');
    });
  });
});

// Made with Bob