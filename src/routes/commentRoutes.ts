import { Hono } from "hono";
import { comment } from "../controllers";
import { protect } from "../middlewares";
import { zValidator } from "@hono/zod-validator";
import { validation } from "../validation";

const comments = new Hono();

comments.get("/", (c) => comment.getComments(c));
comments.post("/", protect, zValidator("json", validation.commentSchema), (c) =>
  comment.createComment(c)
);
// comments.delete("/:id", protect, (c) => comment.deleteBrand(c));
// comments.patch("/:id", protect, (c) => comment.updateBrand(c));

export default comments;
