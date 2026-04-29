import { test, expect } from '@playwright/test'

test('admin can create tournament via UI', async ({ page, request }) => {
  const tournamentName = `[E2E] Tournament ${Date.now()}`.slice(0, 90)

  await page.goto('/login')

  await page.getByPlaceholder('Введите email или имя пользователя').fill('admin@tournament.local')
  await page.getByPlaceholder('Введите пароль').fill('admin123')
  await page.getByRole('button', { name: 'Войти' }).click()

  // В UI “Добро пожаловать” встречается и в toast, и в заголовке — проверяем только заголовок.
  await expect(page.getByRole('heading', { name: /Добро пожаловать,\s*Admin!/i })).toBeVisible({ timeout: 30_000 })

  // Переходим к созданию турнира
  // На странице встречается несколько ссылок с похожим текстом (“Создать турнир” в разных местах).
  // Селектор по href делает клик однозначным.
  await page.locator('a[href="/tournaments/new"]').first().click()

  // Создание турнира
  await expect(page.getByRole('heading', { name: 'Создать турнир' })).toBeVisible()
  await page.getByPlaceholder('Введите название турнира').fill(tournamentName)
  await page.getByRole('button', { name: 'Создать турнир' }).click()

  // Проверяем, что открылась страница детали
  await page.waitForURL(/\/tournaments\/[^\/\?]+$/, { timeout: 30_000 })

  // “visible” может флапать из-за анимаций/оверлеев, а нам важно подтвердить факт навигации и корректный заголовок.
  const detailH1 = page
    .getByRole('heading', { level: 1 })
    .filter({ hasText: tournamentName })
    .first()
  await expect(detailH1).toHaveText(tournamentName, { timeout: 30_000 })

  // Очистка данных: удаляем турнир напрямую через API
  try {
    const url = page.url()
    const m = url.match(/\/tournaments\/([^\/\?]+)/)
    const tournamentId = m?.[1]
    const token = await page.evaluate(() => localStorage.getItem('token'))

    if (tournamentId && token) {
      const res = await request.delete(`/api/tournaments/${tournamentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(res.status()).toBe(200)
    }
  } catch {
    // Очистка не обязательна для прохождения smoke
  }
})

