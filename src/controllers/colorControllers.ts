import { Context } from "hono";
import { prisma } from "../config/prismaClient";


export const getColors = async (c: Context) => {
    const colors = await prisma.color.findMany()
    return c.json({
        success: true,
        data: colors,
        message: "Colors retrieved successfully"
    })
}

export const createColor = async (c: Context) => {
    const { title, hexCode } = await c.req.json();

    const color = await prisma.color.create({
        data: {
            title,
            hexCode
        }
    })


    return c.json({
        success: true,
        data: {
            color
        },
        message: "Color created successfully",
    })
}

export const updateColor = async (c: Context) => {
    const { id } = c.req.param();

    const body = await c.req.json();

    const updateColor = await prisma.color.update({ where: { id: +id }, data: body })

    return c.json({
        success: true,
        message: "Color updated successfully",
        data: {
            updateColor
        }
    })
}

export const deleteColor = async (c: Context) => {
    const { id } = c.req.param();

    await prisma.color.delete({ where: { id: +id } })

    return c.json({
        success: true,
        message: "Color deleted successfully"
    })

}