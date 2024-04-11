import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"
import { validation } from "../validation"
import { product } from "../controllers"


const products = new Hono()

products.post("/", zValidator("json", validation.productsSchema), (c) => product.createProduct(c))

export default products