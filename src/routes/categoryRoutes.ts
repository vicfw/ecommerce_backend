import { Hono } from 'hono'
import { category } from '../controllers'


const categories = new Hono()

// get all categories
categories.get('/', (c) => category.getCategories(c))

categories.post('/', (c) => category.createCategory(c))



export default categories