import { describe, expect, it } from 'bun:test'
import app from '../../server'

const apiUrl = 'http://localhost:9000/api/v1/users/login'
const bodyForSuccess = '{"email":"farid@farid.com","password":"123456"}'
const bodyForFail = '{"email":"farid@farid","password":"123456"}'

describe('login user', () => {
    it('Should return 200 Response', async () => {
        const req = new Request(apiUrl, { method: "POST", body: bodyForSuccess })
        const res = await app.fetch(req)

        expect(res.status).toBe(200)
    })

    it('Should return 401 Response', async () => {
        const req = new Request(apiUrl, { method: "POST", body: bodyForFail })
        const res = await app.fetch(req)

        expect(res.status).toBe(401)

    })
})