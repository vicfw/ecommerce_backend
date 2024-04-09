import { Hono } from 'hono'
import { category } from '../controllers'


const categories = new Hono()

// get all categories
categories.get('/', (c) => category.getCategories(c))

categories.post('/', (c) => category.createCategory(c))

categories.delete("/:id", (c) => category.deleteCategory(c))



export default categories