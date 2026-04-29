import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { createApp } from '../app'
import { createAdminUser } from '../utils/createAdmin'
import { randomBytes } from 'node:crypto'

const app = createApp()
const hasDb = Boolean(process.env.DATABASE_URL)

function randomSuffix() {
  return randomBytes(4).toString('hex')
}

function participantCreds(suffix: string) {
  return {
    email: `int_${suffix}@test.integration.local`,
    username: `user_${suffix}`, // matches /^[a-zA-Z0-9_]+$/
    password: 'pass1234',
    firstName: 'Integration',
    lastName: `User_${suffix}`,
  }
}

before(async () => {
  if (!hasDb) return
  // Гарантируем наличие админа
  await createAdminUser()
})

describe('tournaments integration', () => {
  it(
    'PARTICIPANT: 403 при POST /api/tournaments',
    async () => {
      if (!hasDb) {
        assert.ok(true) // no-op
        return
      }

      const suffix = randomSuffix()
      const creds = participantCreds(suffix)

      const regRes = await request(app)
        .post('/api/auth/register')
        .send(creds)
        .expect(201)

      const accessToken = regRes.body.data.accessToken as string

      const tournamentName = `[INT] Tournament ${suffix}`

      const createRes = await request(app)
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: tournamentName, type: 'SINGLE_ELIMINATION' })
        .expect(403)

      assert.equal(createRes.body.success, false)
      assert.match(
        createRes.body.error?.message || '',
        /Недостаточно прав/i,
      )
    },
  )

  it(
    'ADMIN: POST /api/tournaments (201) + GET /api/tournaments/:id',
    async () => {
      if (!hasDb) {
        assert.ok(true) // no-op
        return
      }

      const adminLogin = await request(app)
        .post('/api/auth/login')
        .send({ login: 'admin', password: 'admin123' })
        .expect(200)

      assert.equal(adminLogin.body.success, true)
      const accessToken = adminLogin.body.data.accessToken as string

      const tournamentName = `[INT] Tournament ${randomSuffix()}`

      const created = await request(app)
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: tournamentName, type: 'SINGLE_ELIMINATION' })
        .expect(201)

      assert.equal(created.body.success, true)
      const tournamentId = created.body.data.tournament.id as string
      assert.equal(created.body.data.tournament.name, tournamentName)

      const listRes = await request(app)
        .get('/api/tournaments')
        .query({ page: 1, limit: 50 })
        .expect(200)

      assert.equal(listRes.body.success, true)
      const tournamentFromList = (listRes.body.data.tournaments as any[]).find(
        (t) => t.id === tournamentId,
      )
      assert.ok(tournamentFromList)
      assert.equal(tournamentFromList.name, tournamentName)

      const detailRes = await request(app)
        .get(`/api/tournaments/${tournamentId}`)
        .expect(200)

      assert.equal(detailRes.body.success, true)
      assert.equal(detailRes.body.data.tournament.id, tournamentId)
      assert.equal(detailRes.body.data.tournament.name, tournamentName)
    },
  )
})

