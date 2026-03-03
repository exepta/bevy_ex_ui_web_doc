import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders title, docs text and increments counter', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Vite + React' })).toBeInTheDocument()
    expect(screen.getByText(/click on the vite and react logos to learn more/i)).toBeInTheDocument()

    const button = screen.getByRole('button', { name: /count is 0/i })
    fireEvent.click(button)

    expect(screen.getByRole('button', { name: /count is 1/i })).toBeInTheDocument()
  })
})
