import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { widgetComponents, widgetNames } from './index'

afterEach(() => {
  cleanup()
})

describe('Widget pages', () => {
  for (const name of widgetNames) {
    it(`renders ${name}`, () => {
      const WidgetComponent = widgetComponents[name]
      render(<WidgetComponent />)
      expect(screen.getByRole('heading', { name: new RegExp(`^${name} Overview$`) })).toBeInTheDocument()
    })
  }
})
