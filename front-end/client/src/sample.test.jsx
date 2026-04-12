import React from 'react'
import { render, screen } from '@testing-library/react'

function Hello() {
  return <div>Welcome</div>
}

test('sanity: arithmetic', () => {
  expect(1 + 1).toBe(2)
})

test('renders welcome text', () => {
  render(<Hello />)
  expect(screen.getByText(/welcome/i)).toBeInTheDocument()
})
