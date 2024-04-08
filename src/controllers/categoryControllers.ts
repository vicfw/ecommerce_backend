import { Context } from "hono";
import { prisma } from "../config/prismaClient";

export const getCategories = async (c: Context) => {
    const categories = await prisma.category.findMany({
        include: {
            subcategories: {
                include: {
                    subcategories: {
                        include: {
                            subcategories: {}
                        },
                    },
                },
            },
        },
        where: { parentId: null }
    });



    return c.json({
        success: true,
        data: categories,
        message: "Categories retrieved successfully"
    })
}

export const createCategory = async (c: Context) => {
    const body = await c.req.json()

    if (body.parentId) {
        const subCategory = await prisma.category.create({
            data: {
                name: body.name,
                parentId: body.parentId

            }
        })

        return c.json({
            success: true,
            data: subCategory,
            message: "Sub Category created successfully"
        })
    }

    const category = await prisma.category.create({
        data: {
            name: body.name,
        }
    })

    return c.json({
        success: true,
        data: category,
        message: "Category created successfully"
    })

}
