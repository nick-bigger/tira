import { AddPlacePage } from '@/components/add-place-page'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/add')({
  component: AddPlacePage,
})
