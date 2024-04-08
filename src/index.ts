import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { errorHandler, notFound } from './middlewares'
import { UserRoutes, addressRoutes, categoryRoutes } from './routes'

const app = new Hono().basePath('/api/v1')

app.use('*', logger(), prettyJSON())

app.use('/api/*', cors())

// Cors
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })
)

// Home Route
app.get('/', (c) => c.text('Welcome to the API!'))

// User Routes
app.route('/users', UserRoutes)
app.route("/address", addressRoutes)
app.route("/category", categoryRoutes)

// Error Handler
app.onError((err, c) => {
  const error = errorHandler(c)
  return error
})

// Not Found Handler
app.notFound((c) => {
  const error = notFound(c)
  return error
})


const port = parseInt(Bun.env.PORT!) || 3000
console.log(`Running at http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}