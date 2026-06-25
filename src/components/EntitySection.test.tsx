import { render, screen, waitForElementToBeRemoved, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EntitySection } from './EntitySection'

interface TestItem {
  id: string
  name: string
}

describe('EntitySection', () => {
  it('pide confirmacion antes de eliminar un item', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()

    render(
      <EntitySection<TestItem>
        title="Pruebas"
        items={[{ id: 'item_1', name: 'Item sensible' }]}
        fields={[]}
        defaultValues={{}}
        canEdit
        onCreate={() => undefined}
        onUpdate={() => undefined}
        onDelete={onDelete}
        renderItem={(item) => <span>{item.name}</span>}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Eliminar pruebas' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'))
    expect(onDelete).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Eliminar' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }))

    expect(onDelete).toHaveBeenCalledWith('item_1')
  })
})
