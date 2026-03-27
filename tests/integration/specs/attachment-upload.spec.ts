/**
 * Integration tests for IETM Attachment Upload
 * These tests validate that screenshots, videos, and other attachments
 * are properly uploaded to IETM execution results
 * 
 * Test Cases:
 * - Test with screenshot attachment
 * - Test with multiple attachments
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Attachment Upload Tests - IETM Integration', () => {
  
  test('Test with Screenshot Attachment', async ({ page }) => {
    // Map to IETM test case and test plan
    test.info().annotations.push({
      type: 'ietm-test-case',
      description: '2218', // Reusing existing test case for attachment validation
    });
    test.info().annotations.push({
      type: 'ietm-test-plan',
      description: '987',
    });

    await test.step('Navigate to test page', async () => {
      await page.goto('https://www.saucedemo.com/');
      await expect(page).toHaveTitle(/Swag Labs/);
    });

    await test.step('Take screenshot for attachment', async () => {
      // Take a screenshot that will be attached to the test result
      const screenshotPath = path.join(test.info().outputDir, 'login-page.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      // Attach the screenshot to the test
      await test.info().attach('login-page-screenshot', {
        path: screenshotPath,
        contentType: 'image/png',
      });
      
      // Verify screenshot was created
      expect(fs.existsSync(screenshotPath)).toBeTruthy();
      const stats = fs.statSync(screenshotPath);
      expect(stats.size).toBeGreaterThan(0);
      
      console.log(`Screenshot created: ${screenshotPath} (${stats.size} bytes)`);
    });

    await test.step('Perform login action', async () => {
      await page.locator('#user-name').fill('standard_user');
      await page.locator('#password').fill('secret_sauce');
      await page.locator('#login-button').click();
      
      await expect(page).toHaveURL(/inventory\.html/);
      await expect(page.locator('.inventory_list')).toBeVisible();
    });

    await test.step('Take success screenshot', async () => {
      const successScreenshot = path.join(test.info().outputDir, 'products-page.png');
      await page.screenshot({ path: successScreenshot, fullPage: true });
      
      await test.info().attach('products-page-screenshot', {
        path: successScreenshot,
        contentType: 'image/png',
      });
      
      expect(fs.existsSync(successScreenshot)).toBeTruthy();
      console.log(`Success screenshot created: ${successScreenshot}`);
    });
  });

  test('Test with Multiple Attachments', async ({ page }) => {
    // Map to IETM test case and test plan
    test.info().annotations.push({
      type: 'ietm-test-case',
      description: '7117', // Reusing existing test case
    });
    test.info().annotations.push({
      type: 'ietm-test-plan',
      description: '987',
    });

    await test.step('Navigate and capture initial state', async () => {
      await page.goto('https://www.saucedemo.com/');
      
      // Take screenshot
      const initialScreenshot = path.join(test.info().outputDir, 'initial-state.png');
      await page.screenshot({ path: initialScreenshot });
      await test.info().attach('initial-state', {
        path: initialScreenshot,
        contentType: 'image/png',
      });
    });

    await test.step('Create and attach test data file', async () => {
      // Create a JSON file with test data
      const testData = {
        testName: 'Multiple Attachments Test',
        timestamp: new Date().toISOString(),
        browser: test.info().project.name,
        testCase: '7117',
        testPlan: '987',
      };
      
      const dataFilePath = path.join(test.info().outputDir, 'test-data.json');
      fs.writeFileSync(dataFilePath, JSON.stringify(testData, null, 2));
      
      await test.info().attach('test-data', {
        path: dataFilePath,
        contentType: 'application/json',
      });
      
      console.log(`Test data file created: ${dataFilePath}`);
    });

    await test.step('Attempt login with wrong credentials', async () => {
      await page.locator('#user-name').fill('standard_user');
      await page.locator('#password').fill('wrong_password');
      await page.locator('#login-button').click();
      
      // Verify error message
      const errorMessage = page.locator('[data-test="error"]');
      await expect(errorMessage).toBeVisible();
      
      // Take error screenshot
      const errorScreenshot = path.join(test.info().outputDir, 'error-state.png');
      await page.screenshot({ path: errorScreenshot });
      await test.info().attach('error-state', {
        path: errorScreenshot,
        contentType: 'image/png',
      });
    });

    await test.step('Create and attach log file', async () => {
      // Create a log file
      const logContent = [
        `Test: Multiple Attachments Test`,
        `Time: ${new Date().toISOString()}`,
        `Browser: ${test.info().project.name}`,
        `Status: Completed`,
        `Attachments: 3 files (2 screenshots, 1 JSON, 1 log)`,
      ].join('\n');
      
      const logFilePath = path.join(test.info().outputDir, 'test-log.txt');
      fs.writeFileSync(logFilePath, logContent);
      
      await test.info().attach('test-log', {
        path: logFilePath,
        contentType: 'text/plain',
      });
      
      console.log(`Log file created: ${logFilePath}`);
    });
  });

  test('Test with Failed Screenshot', async ({ page }) => {
    // Map to IETM test case and test plan
    test.info().annotations.push({
      type: 'ietm-test-case',
      description: '7117',
    });
    test.info().annotations.push({
      type: 'ietm-test-plan',
      description: '987',
    });

    await test.step('Navigate to page', async () => {
      await page.goto('https://www.saucedemo.com/');
    });

    await test.step('Intentional failure with screenshot', async () => {
      // This step will fail and should capture a screenshot
      await page.locator('#user-name').fill('locked_out_user');
      await page.locator('#password').fill('secret_sauce');
      await page.locator('#login-button').click();
      
      // Take screenshot before assertion
      const beforeFailScreenshot = path.join(test.info().outputDir, 'before-fail.png');
      await page.screenshot({ path: beforeFailScreenshot });
      await test.info().attach('before-failure', {
        path: beforeFailScreenshot,
        contentType: 'image/png',
      });
      
      // This will fail - locked_out_user gets an error message
      const errorMessage = page.locator('[data-test="error"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('Sorry, this user has been locked out');
      
      // Mark as expected failure
      console.log('Expected failure: User is locked out');
    });
  });
});

// Made with Bob