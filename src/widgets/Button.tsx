function Button() {
  return (
    <article className="widget-doc">
      <h3>Button Overview</h3>
      <p>Use buttons to trigger actions, submit forms or open dialogs.</p>
      <div className="button-preview" aria-label="Button examples">
        <button type="button" className="preview-button primary">
          Primary
        </button>
        <button type="button" className="preview-button secondary">
          Secondary
        </button>
        <button type="button" className="preview-button ghost">
          Ghost
        </button>
      </div>
    </article>
  )
}

export default Button
