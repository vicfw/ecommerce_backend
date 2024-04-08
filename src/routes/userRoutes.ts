import { Hono } from 'hono'
import { user } from '../controllers'
import { isAdmin, protect } from '../middlewares'

const users = new Hono()

// Get All Users
users.get('/', protect, isAdmin, (c) => user.getUsers(c))

// Create User
users.post('/', (c) => user.createUser(c))

// Login User
users.post('/login', (c) => user.loginUser(c))

// Get Single User
users.get('/:id', isAdmin, (c) => user.getUser(c))

// Get User Profile
users.patch('/me', protect, (c) => user.updateUser(c))

export default users