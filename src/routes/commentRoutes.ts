import { Hono } from "hono";
import { comment } from "../controllers";
import { isAdmin, protect } from "../middlewares";
import { zValidator } from "@hono/zod-validator";
import { validation } from "../validation";

const comments = new Hono();

comments.get("/admin", protect, isAdmin, (c) => comment.getAdminComments(c));
comments.get("/", (c) => comment.getComments(c));
comments.post("/", protect, zValidator("json", validation.commentSchema), (c) =>
  comment.createComment(c)
);
comments.delete("/:id", protect, isAdmin, (c) => comment.deleteComment(c));
comments.patch("/:id", protect, isAdmin, (c) => comment.updateComment(c));

export default comments;
