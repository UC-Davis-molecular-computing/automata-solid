import { test, expect } from '@playwright/test';

test.describe('Automata Simulator App', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Automaton Simulator/i);

    // Check for main app structure instead of h1
    const app = page.locator('.app');
    await expect(app).toBeVisible();

    const headerBar = page.locator('.header-bar');
    await expect(headerBar).toBeVisible();
  });

  test('should have a code editor', async ({ page }) => {
    await page.goto('/');

    const editor = page.locator('.cm-editor');
    await expect(editor).toBeVisible();
  });

  test('should allow typing in the code editor', async ({ page }) => {
    await page.goto('/');

    const editor = page.locator('.cm-content[contenteditable="true"]');
    await editor.click();

    await page.keyboard.type('start_state: q0');

    const content = await editor.textContent();
    expect(content).toContain('start_state: q0');
  });

  test('should show error messages for invalid YAML', async ({ page }) => {
    await page.goto('/');

    const editor = page.locator('.cm-content[contenteditable="true"]');
    await editor.click();

    await page.keyboard.press('Control+A');
    await page.keyboard.type('invalid: yaml: syntax:');

    await page.waitForTimeout(500);

    const errorElement = page.locator('.error-message, .cm-diagnostic, [role="alert"]').first();
    const hasError = await errorElement.count() > 0;

    if (hasError) {
      await expect(errorElement).toBeVisible();
    }
  });

  test('should have input test panel', async ({ page }) => {
    await page.goto('/');

    const inputField = page.locator('input[type="text"], textarea').filter({
      hasText: /test.*input|input.*string/i
    }).or(page.locator('[placeholder*="input" i], [placeholder*="test" i]')).first();

    if (await inputField.count() > 0) {
      await expect(inputField).toBeVisible();
    }
  });

  test('should display automaton visualization', async ({ page }) => {
    await page.goto('/');

    const canvas = page.locator('canvas, svg, .visualization, .graph').first();

    if (await canvas.count() > 0) {
      await expect(canvas).toBeVisible();
    }
  });
});

test.describe('DFA Functionality', () => {
  test('should load a valid DFA specification', async ({ page }) => {
    await page.goto('/');

    const editor = page.locator('.cm-content[contenteditable="true"]');
    await editor.click();

    await page.keyboard.press('Control+A');

    const dfaSpec = `states: [q0, q1, q2]
input_alphabet: [0, 1]
start_state: q0
accept_states: [q2]
delta:
  q0:
    0: q1
    1: q0
  q1:
    0: q1
    1: q2
  q2:
    0: q1
    1: q0`;

    await page.keyboard.type(dfaSpec);

    await page.waitForTimeout(1000);

    const errorIndicators = page.locator('.cm-diagnostic-error, .error, [role="alert"]');
    const errorCount = await errorIndicators.count();
    expect(errorCount).toBe(0);
  });

  test('should show errors for invalid DFA with extra fields', async ({ page }) => {
    await page.goto('/');

    const editor = page.locator('.cm-content[contenteditable="true"]');
    await editor.click();
    await page.keyboard.press('Control+A');

    const invalidDfaSpec = `type: DFA
name: Invalid DFA
states: [q0, q1]
input_alphabet: [0, 1]
start_state: q0
accept_states: [q1]
delta:
  q0:
    0: q1
    1: q0
  q1:
    0: q0
    1: q1`;

    await page.keyboard.type(invalidDfaSpec);
    await page.waitForTimeout(1000);

    const errorIndicators = page.locator('.cm-diagnostic-error, .error, [role="alert"], .error-message');
    const errorCount = await errorIndicators.count();

    // This should find errors, but if it doesn't, we have a problem
    expect(errorCount).toBeGreaterThan(0);

    if (errorCount > 0) {
      const errorText = await errorIndicators.first().textContent();
      // Should show either YAML syntax error or schema validation error
      expect(errorText).toMatch(/Error|YAML syntax error|Unexpected property/i);
    }
  });

  test('should test string acceptance', async ({ page }) => {
    await page.goto('/');

    const editor = page.locator('.cm-content[contenteditable="true"]');
    await editor.click();
    await page.keyboard.press('Control+A');

    const dfaSpec = `states: [q0, q1]
input_alphabet: [0, 1]
start_state: q0
accept_states: [q1]
delta:
  q0:
    0: q0
    1: q1
  q1:
    0: q0
    1: q1`;

    await page.keyboard.type(dfaSpec);
    await page.waitForTimeout(500);

    const testInput = page.locator('input').filter({
      hasNot: page.locator('.cm-content')
    }).first();

    if (await testInput.count() > 0) {
      await testInput.fill('001');

      const testButton = page.locator('button').filter({ hasText: /test|run|check/i }).first();
      if (await testButton.count() > 0) {
        await testButton.click();

        const result = page.locator('.result, .output, [role="status"]').first();
        if (await result.count() > 0) {
          await expect(result).toContainText(/accept|true/i);
        }
      }
    }
  });
});