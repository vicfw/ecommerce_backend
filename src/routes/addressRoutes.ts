import { Hono } from "hono";
import { address } from "../controllers"
import { protect } from "../middlewares";
import { zValidator } from '@hono/zod-validator'
import { validation } from "../validation"

const addresses = new Hono()

addresses.post("/", protect, zValidator(
    'json',
    validation.addressSchema
), (c) => address.createAddress(c))

addresses.patch("/:id", protect, zValidator(
    'json',
    validation.addressSchemaPartial
), (c) => address.updateAddress(c))



export default addresses