import { test, expect } from '@playwright/test';

test('Simple test with IETM mapping', async ({ page }) => {
  // Map to IETM test case
  test.info().annotations.push({
    type: 'ietm-test-case',
    description: '2218',
  });
  test.info().annotations.push({
    type: 'ietm-test-plan',
    description: '987',
  });

  await page.goto('https://www.example.com');
  await expect(page).toHaveTitle(/Example Domain/);
});

// Made with Bob
