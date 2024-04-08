import { Jwt } from 'hono/utils/jwt'

const genToken = (id: string) => {
  const currentTimeInSeconds = Math.floor(Date.now() / 1000);
  const oneWeekInSeconds = 7 * 24 * 60 * 60; // 7 days * 24 hours * 60 minutes * 60 seconds
  const futureTimeInSeconds = currentTimeInSeconds + oneWeekInSeconds;

  return Jwt.sign({ id, exp: futureTimeInSeconds }, Bun.env.JWT_SECRET || '')
}

export default genToken