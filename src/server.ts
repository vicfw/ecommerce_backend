import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { errorHandler, notFound } from './middlewares'
import { UserRoutes, addressRoutes, categoryRoutes, productRoutes, uploadRoutes } from './routes'
import { v2 as cloudinary } from 'cloudinary';

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

// User Routes
app.route('/users', UserRoutes)
app.route("/address", addressRoutes)
app.route("/category", categoryRoutes)
app.route("/product", productRoutes)
app.route("/upload", uploadRoutes)

cloudinary.config({
  cloud_name: 'dfflta8zl',
  api_key: '544335423294645',
  api_secret: '7LCN0g9qcEaM489juhGBuNsMI4w'
});


// Error Handler
app.onError((_, c) => {
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