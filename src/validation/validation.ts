
import { z } from 'zod'

export const addressSchema = z.object({
    street: z.string(),
    city: z.string(),
    country: z.string(),
    zipCode: z.string(),
})


export const addressSchemaPartial = addressSchema.partial()

export const categorySchema = z.object({
    name: z.string(),
    parentId: z.number().optional(),
})


export const productsSchema = z.object({
    name: z.string(),
    price: z.number(),
    description: z.string(),
    categoryId: z.number(),
})