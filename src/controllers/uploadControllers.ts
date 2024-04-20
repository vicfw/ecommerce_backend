import { Context } from "hono";
import { v2 as cloudinary } from "cloudinary";
import { nanoid } from 'nanoid';

export const uploadImage = async (c: Context) => {
    const body = await c.req.formData();
    const images = body.getAll("images") as Blob[]
    const buffers = [];

    for (const image of images) {
        const buffer = Buffer.from(await image.arrayBuffer()).toString("base64");
        let dataURI = "data:" + image.type + ";base64," + buffer;
        buffers.push(dataURI);
    }

    const uploadPromises = buffers.map((buffer) => {
        return cloudinary.uploader.upload(buffer, {
            public_id: nanoid(),
        });
    });

    const results = await Promise.all(uploadPromises);

    const url = results.map(result => result.secure_url);


    return c.json({
        success: true,
        message: "Image uploaded successfully",
        data: { url },
    });
};
