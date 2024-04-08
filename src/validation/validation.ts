import { z } from 'zod'

export const addressschema = z.object({
    street: z.string(),
    city: z.string(),
    country: z.string(),
    zipCode: z.string(),
})

