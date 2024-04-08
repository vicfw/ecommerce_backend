import { Hono } from "hono";
import { address } from "../controllers"
import { protect } from "../middlewares";
import { zValidator } from '@hono/zod-validator'
import { validation } from "../validation"

const addresses = new Hono()

addresses.post("/", protect, zValidator(
    'json',
    validation.addressschema
), (c) => address.createAddress(c))




export default addresses