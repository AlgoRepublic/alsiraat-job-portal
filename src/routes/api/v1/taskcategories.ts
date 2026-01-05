import express, { Router } from 'express'
import {
  list,
  show,
  create,
  update,
  destroy,
} from '@/controllers/api/v1/taskcategories'

const app: Router = express.Router()

app.get('/', list)
app.get('/:_id', show)
app.post('/', create)
app.put('/:_id', update)
app.delete('/:_id', destroy)

export default app
