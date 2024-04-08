import { Context } from "hono";
import { prisma } from "../config/prismaClient";

export const createAddress = async (c: Context) => {
    const body = await c.req.json()
    const user = c.get("user")

    const addresses = await prisma.address.findMany({ where: { userId: user.id, isDefault: true } })

    if (!addresses.length && !body.isDefault) {
        c.status(400)
        throw new Error("Please add a default address")
    }

    const address = await prisma.address.create({ data: { userId: user.id, ...body } })

    return c.json({
        success: true,
        data: address,
        message: "Address created successfully"
    })
}
export const updateAddress = async (c: Context) => {
    const body = await c.req.json()
    const user = c.get("user")

    const updatedAddress = await prisma.address.update({
        where: {
            id: user.id
        },
        data: {
            ...body
        }

    })

    return c.json({
        success: true,
        data: updatedAddress,
        message: "Address updated successfully"
    })

}
