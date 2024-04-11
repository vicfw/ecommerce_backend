import { Hono } from 'hono'
import { upload } from '../controllers'


const uploads = new Hono()

uploads.post("/", (c) => upload.uploadImage(c))

export default uploads