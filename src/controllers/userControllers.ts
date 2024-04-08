import { Context } from 'hono'
import { prisma } from "../config/prismaClient"
import { genToken } from '../utils'


export const getUsers = async (c: Context) => {
  const users = await prisma.user.findMany()

  return c.json({ users })
}


export const createUser = async (c: Context) => {
  const { name, email, password } = await c.req.json()

  // Check for existing user
  const userExists = await prisma.user.findUnique({ where: { email } })
  if (userExists) {
    c.status(400)
    throw new Error('User already exists')
  }

  const hashedPassword = await Bun.password.hash(password, {
    algorithm: 'bcrypt',
    cost: 4,
  })

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    }
  })

  if (!user) {
    c.status(400)
    throw new Error('Invalid user data')
  }

  const token = await genToken(user.id.toString())

  return c.json({
    success: true,
    data: {
      _id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
    },
    token,
    message: 'User created successfully',
  })
}


export const loginUser = async (c: Context) => {
  const { email, password } = await c.req.json()

  // Check for existing user
  if (!email || !password) {
    c.status(400)
    throw new Error('Please provide an email and password')
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    c.status(401)
    throw new Error('No user found with this email')
  }



  if (!await Bun.password.verifySync(password, user.password, "bcrypt")) {
    c.status(401)
    throw new Error('Invalid credentials')
  } else {

    const token = await genToken(user.id.toString())

    return c.json({
      success: true,
      data: {
        _id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
      },
      token,
      message: 'User logged in successfully',
    })
  }
}

export const getUser = async (c: Context) => {
  const id = parseInt(c.req.param('id'))
  const user = await prisma.user.findUnique({ where: { id }, include: { Address: true } })
  console.log(user, "user");

  if (!user) {
    c.status(400)
    throw new Error("Requested user not found")
  }

  return c.json({
    success: true,
    data: {
      _id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      address: user.Address
    },
    message: 'User found successfully',
  })
}

export const updateUser = async (c: Context) => {
  const { name, email, } = await c.req.json()
  const user = c.get('user')

  const updatedUser = await prisma.user.update({
    where: {
      id: user.id
    },
    data: {
      name,
      email,
    }
  })

  return c.json({
    success: true,
    data: updatedUser,
    message: 'User updated successfully',
  })

}