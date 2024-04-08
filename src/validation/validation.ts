import { z } from 'zod'

export const addressSchema = z.object({
    street: z.string(),
    city: z.string(),
    country: z.string(),
    zipCode: z.string(),
})

