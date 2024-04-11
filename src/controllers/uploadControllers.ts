import { Context } from "hono";
import { v2 as cloudinary } from "cloudinary";
const DatauriParser = require("datauri/parser");
const parser = new DatauriParser();
import { nanoid } from 'nanoid';

export const uploadImage = async (c: Context) => {
    const body = await c.req.formData();
    const images = body.getAll("images") as Blob[]
    const buffers = [];

    for (const image of images) {
        const buffer = Buffer.from(await image.arrayBuffer());
        const parse = parser.format(nanoid(), buffer);
        buffers.push(parse);
    }

    const uploadPromises = buffers.map((buffer) => {
        return cloudinary.uploader.upload(buffer.content, {
            public_id: nanoid(),

        });
    });

    const results = await Promise.all(uploadPromises);

    return c.json({
        success: true,
        message: "Image uploaded successfully",
        // data: { url: result.secure_url },
    });
};
