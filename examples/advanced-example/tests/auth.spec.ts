import { test, expect } from '@playwright/test';

/**
 * Authentication Test Suite
 * 
 * Tests various authentication scenarios including:
 * - Valid login
 * - Invalid credentials
 * - Session management
 * - Logout functionality
 */

test.describe('Authentication Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page before each test
    await page.goto('/login');
  });

  test('Login with valid credentials', {
    annotation: { 
      type: 'ietm-test-case', 
      description: '2218' 
    }
  }, async ({ page }) => {
    // Arrange
    const username = 'user@example.com';
    const password = 'ValidPassword123!';

    // Act
    await page.fill('[data-testid="username"]', username);
    await page.fill('[data-testid="password"]', password);
    await page.click('[data-testid="login-button"]');

    // Assert
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText('Welcome');
  });

  test('Login with invalid username', {
    annotation: { 
      type: 'ietm-test-case', 
      description: '2219' 
    }
  }, async ({ page }) => {
    // Arrange
    const username = 'invalid@example.com';
    const password = 'SomePassword123!';

    // Act
    await page.fill('[data-testid="username"]', username);
    await page.fill('[data-testid="password"]', password);
    await page.click('[data-testid="login-button"]');

    // Assert
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials');
    await expect(page).toHaveURL(/login/);
  });

  test('Login with invalid password', {
    annotation: { 
      type: 'ietm-test-case', 
      description: '2220' 
    }
  }, async ({ page }) => {
    // Arrange
    const username = 'user@example.com';
    const password = 'WrongPassword';

    // Act
    await page.fill('[data-testid="username"]', username);
    await page.fill('[data-testid="password"]', password);
    await page.click('[data-testid="login-button"]');

    // Assert
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials');
  });

  test('Login with empty fields', {
    annotation: { 
      type: 'ietm-test-case', 
      description: '2221' 
    }
  }, async ({ page }) => {
    // Act - Click login without filling fields
    await page.click('[data-testid="login-button"]');

    // Assert - Validation messages should appear
    await expect(page.locator('[data-testid="username-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
  });

  test('Session persistence after page reload', {
    annotation: { 
      type: 'ietm-test-case', 
      description: '2222' 
    }
  }, async ({ page }) => {
    // Arrange - Login first
    await page.fill('[data-testid="username"]', 'user@example.com');
    await page.fill('[data-testid="password"]', 'ValidPassword123!');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/dashboard/);

    // Act - Reload page
    await page.reload();

    // Assert - Should still be logged in
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('Logout functionality', {
    annotation: { 
      type: 'ietm-test-case', 
      description: '2223' 
    }
  }, async ({ page }) => {
    // Arrange - Login first
    await page.fill('[data-testid="username"]', 'user@example.com');
    await page.fill('[data-testid="password"]', 'ValidPassword123!');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/dashboard/);

    // Act - Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    // Assert - Should be redirected to login
    await expect(page).toHaveURL(/login/);
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });

  test('Remember me functionality', {
    annotation: { 
      type: 'ietm-test-case', 
      description: '2224' 
    }
  }, async ({ page, context }) => {
    // Arrange
    await page.fill('[data-testid="username"]', 'user@example.com');
    await page.fill('[data-testid="password"]', 'ValidPassword123!');
    await page.check('[data-testid="remember-me"]');

    // Act
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/dashboard/);

    // Close and reopen browser
    await page.close();
    const newPage = await context.newPage();
    await newPage.goto('/');

    // Assert - Should still be logged in
    await expect(newPage).toHaveURL(/dashboard/);
  });

  test('Password visibility toggle', {
    annotation: { 
      type: 'ietm-test-case', 
      description: '2225' 
    }
  }, async ({ page }) => {
    // Arrange
    const password = 'TestPassword123!';
    await page.fill('[data-testid="password"]', password);

    // Assert - Password should be hidden by default
    await expect(page.locator('[data-testid="password"]')).toHaveAttribute('type', 'password');

    // Act - Toggle visibility
    await page.click('[data-testid="toggle-password-visibility"]');

    // Assert - Password should be visible
    await expect(page.locator('[data-testid="password"]')).toHaveAttribute('type', 'text');

    // Act - Toggle back
    await page.click('[data-testid="toggle-password-visibility"]');

    // Assert - Password should be hidden again
    await expect(page.locator('[data-testid="password"]')).toHaveAttribute('type', 'password');
  });
});

test.describe('Error Handling', () => {
  test('Handle network timeout gracefully', {
    annotation: { 
      type: 'ietm-test-case', 
      description: '2226' 
    }
  }, async ({ page }) => {
    // Simulate slow network
    await page.route('**/api/login', route => {
      setTimeout(() => route.abort(), 5000);
    });

    await page.goto('/login');
    await page.fill('[data-testid="username"]', 'user@example.com');
    await page.fill('[data-testid="password"]', 'ValidPassword123!');
    
    // Act
    await page.click('[data-testid="login-button"]');

    // Assert - Should show timeout error
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/timeout|network/i);
  });

  test('Handle server error (500)', {
    annotation: { 
      type: 'ietm-test-case', 
      description: '2227' 
    }
  }, async ({ page }) => {
    // Simulate server error
    await page.route('**/api/login', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    await page.goto('/login');
    await page.fill('[data-testid="username"]', 'user@example.com');
    await page.fill('[data-testid="password"]', 'ValidPassword123!');
    
    // Act
    await page.click('[data-testid="login-button"]');

    // Assert - Should show server error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/server error|try again/i);
  });
});

// Made with Bob
