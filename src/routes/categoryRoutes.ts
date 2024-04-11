import { Hono } from 'hono'
import { category } from '../controllers'
import { zValidator } from '@hono/zod-validator'
import { validation } from "../validation"


const categories = new Hono()

// get all categories
categories.get('/', (c) => category.getCategories(c))

categories.post('/', zValidator("json", validation.categorySchema), (c) => category.createCategory(c))

categories.delete("/:id", (c) => category.deleteCategory(c))

categories.patch("/:id", zValidator("json", validation.categorySchema), (c) => category.updateCategory(c))



export default categories