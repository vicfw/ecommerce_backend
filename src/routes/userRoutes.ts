import { Hono } from 'hono'
import { user } from '../controllers'
import { isAdmin, protect } from '../middlewares'

const users = new Hono()

// Get All Users
users.get('/', protect, (c) => user.getUsers(c))

// Create User
users.post('/', (c) => user.createUser(c))

// Login User
users.post('/login', (c) => user.loginUser(c))

// Get Single User
users.get('/:id', (c) => user.getUser(c))

// Get User Profile
users.get('/profile', (c) => {
  return c.json({ message: 'User Profile' })
})

export default users