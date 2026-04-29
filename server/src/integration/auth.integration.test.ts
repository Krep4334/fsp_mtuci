import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { createApp } from '../app'
import { createAdminUser } from '../utils/createAdmin'
import { randomBytes } from 'node:crypto'

function randomCreds() {
  const suffix = randomBytes(4).toString('hex') // 8 hex chars
  return {
    email: `int_${suffix}@test.integration.local`,
    username: `user_${suffix}`, // matches /^[a-zA-Z0-9_]+$/
    password: 'pass1234',
    firstName: 'Integration',
    lastName: `User_${suffix}`,
  }
}

const app = createApp()
const hasDb = Boolean(process.env.DATABASE_URL)

before(async () => {
  if (!hasDb) return
  // Чтобы гарантировать наличие админа в тестовом окружении
  await createAdminUser()
})

describe('auth integration', () => {
  it(
    'register -> login -> me -> refresh -> me',
    async () => {
      if (!hasDb) {
        assert.ok(true) // no-op
        return
      }

      const creds = randomCreds()

      const regRes = await request(app)
        .post('/api/auth/register')
        .send(creds)
        .expect(201)

      assert.equal(regRes.body.success, true)
      assert.ok(regRes.body.data?.accessToken)
      assert.ok(regRes.body.data?.refreshToken)
      assert.equal(regRes.body.data?.user?.role, 'PARTICIPANT')

      const accessToken = regRes.body.data.accessToken as string
      const refreshToken = regRes.body.data.refreshToken as string
      const userId = regRes.body.data.user.id as string

      const me1 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      assert.equal(me1.body.success, true)
      assert.equal(me1.body.data?.user?.id, userId)
      assert.equal(me1.body.data?.user?.email, creds.email.toLowerCase())

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ login: creds.username, password: creds.password })
        .expect(200)

      assert.equal(loginRes.body.success, true)
      assert.ok(loginRes.body.data?.accessToken)
      assert.ok(loginRes.body.data?.refreshToken)

      const loginAccessToken = loginRes.body.data.accessToken as string
      const loginRefreshToken = loginRes.body.data.refreshToken as string

      const me2 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginAccessToken}`)
        .expect(200)

      assert.equal(me2.body.success, true)
      assert.equal(me2.body.data?.user?.id, userId)

      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: loginRefreshToken })
        .expect(200)

      assert.equal(refreshRes.body.success, true)
      const newAccessToken = refreshRes.body.data.accessToken as string
      assert.ok(newAccessToken)

      const me3 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200)

      assert.equal(me3.body.success, true)
      assert.equal(me3.body.data?.user?.id, userId)

      // Старый refreshToken уже не валиден, но для этого теста достаточно пройти refresh один раз.
      void refreshToken
    },
  )
})

